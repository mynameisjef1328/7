import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

export const STREAMING_SERVICE_IDS: Record<string, number> = {
  'Netflix': 8,
  'Max': 1899,
  'Hulu': 15,
  'Disney+': 337,
  'Prime Video': 119,
  'Apple TV+': 350,
  'Peacock': 386,
  'Paramount+': 531,
};

export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  media_type?: string;
}

export interface TMDBMovieDetail extends Omit<TMDBMovie, 'genre_ids'> {
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  tagline?: string;
  status: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  link: string;
}

export const GENRE_IDS: Record<string, number[]> = {
  'Thriller': [53, 80],
  'Comedy': [35],
  'Drama': [18],
  'Sci-Fi': [878],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Action': [28],
  'Animation': [16],
};

export const MOOD_GENRES: Record<string, string[]> = {
  'Thrilling': ['Thriller', 'Action', 'Horror'],
  'Fun': ['Comedy', 'Animation'],
  'Emotional': ['Drama', 'Romance'],
  'Chill': ['Comedy', 'Documentary'],
  'Mind-Bending': ['Sci-Fi', 'Thriller'],
  'Feel-Good': ['Comedy', 'Romance', 'Animation'],
};

function buildImageUrl(path: string | null, size: string = 'w780'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

async function tmdbGet<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const response = await axios.get<T>(`${TMDB_BASE_URL}${endpoint}`, {
    params: {
      api_key: TMDB_API_KEY,
      language: 'en-US',
      ...params,
    },
  });
  return response.data;
}

export async function discoverMovies(options: {
  genreIds: number[];
  streamingServiceIds: number[];
  page?: number;
  sortBy?: string;
  voteCountGte?: number;
  voteAverageGte?: number;
  includeAdult?: boolean;
}): Promise<TMDBMovie[]> {
  const {
    genreIds,
    streamingServiceIds,
    page = 1,
    sortBy = 'popularity.desc',
    voteCountGte = 100,
    voteAverageGte = 6.0,
  } = options;

  const params: Record<string, string | number> = {
    sort_by: sortBy,
    page,
    'vote_count.gte': voteCountGte,
    'vote_average.gte': voteAverageGte,
    watch_region: 'US',
  };

  if (genreIds.length > 0) {
    params['with_genres'] = genreIds.join(',');
  }

  if (streamingServiceIds.length > 0) {
    params['with_watch_providers'] = streamingServiceIds.join('|');
  }

  const data = await tmdbGet<{ results: TMDBMovie[] }>('/discover/movie', params);
  return data.results.map(m => ({ ...m, media_type: 'movie' }));
}

export async function discoverTV(options: {
  genreIds: number[];
  streamingServiceIds: number[];
  page?: number;
}): Promise<TMDBMovie[]> {
  const { genreIds, streamingServiceIds, page = 1 } = options;

  const params: Record<string, string | number> = {
    sort_by: 'popularity.desc',
    page,
    'vote_count.gte': 50,
    'vote_average.gte': 6.0,
    watch_region: 'US',
  };

  if (genreIds.length > 0) {
    params['with_genres'] = genreIds.join(',');
  }

  if (streamingServiceIds.length > 0) {
    params['with_watch_providers'] = streamingServiceIds.join('|');
  }

  const data = await tmdbGet<{ results: TMDBMovie[] }>('/discover/tv', params);
  return data.results.map(m => ({ ...m, media_type: 'tv' }));
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetail> {
  const data = await tmdbGet<TMDBMovieDetail>(`/movie/${tmdbId}`);
  return data;
}

export async function getTVDetails(tmdbId: number): Promise<TMDBMovieDetail> {
  const data = await tmdbGet<TMDBMovieDetail>(`/tv/${tmdbId}`);
  return data;
}

export async function getWatchProviders(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie'): Promise<WatchProvider[]> {
  const data = await tmdbGet<{ results: { US?: WatchProviders } }>(
    `/${mediaType}/${tmdbId}/watch/providers`
  );
  const us = data.results.US;
  if (!us) return [];
  return us.flatrate || [];
}

export async function getCandidates(options: {
  mood: string;
  genre?: string;
  streamingServices: string[];
  excludeIds?: number[];
  includeTV?: boolean;
}): Promise<Array<TMDBMovie & { streaming_providers: WatchProvider[] }>> {
  const { mood, genre, streamingServices, excludeIds = [], includeTV = false } = options;

  const serviceIds = streamingServices
    .map(s => STREAMING_SERVICE_IDS[s])
    .filter(Boolean);

  let genreIds: number[] = [];
  if (genre && GENRE_IDS[genre]) {
    genreIds = GENRE_IDS[genre];
  } else if (MOOD_GENRES[mood]) {
    const moodGenres = MOOD_GENRES[mood];
    const allIds: number[] = [];
    moodGenres.forEach(g => {
      if (GENRE_IDS[g]) allIds.push(...GENRE_IDS[g]);
    });
    genreIds = [...new Set(allIds)];
  }

  const movies = await discoverMovies({
    genreIds,
    streamingServiceIds: serviceIds,
    voteCountGte: 50,
    voteAverageGte: 5.5,
  });

  let results = movies.filter(m => !excludeIds.includes(m.id));

  if (includeTV) {
    const tv = await discoverTV({
      genreIds,
      streamingServiceIds: serviceIds,
    });
    results = [...results, ...tv.filter(t => !excludeIds.includes(t.id))];
  }

  // Shuffle to get variety
  const shuffled = results.sort(() => Math.random() - 0.5).slice(0, 40);

  // Fetch streaming providers for top candidates in parallel
  const withProviders = await Promise.all(
    shuffled.slice(0, 25).map(async (item) => {
      try {
        const providers = await getWatchProviders(item.id, (item.media_type as 'movie' | 'tv') || 'movie');
        return { ...item, streaming_providers: providers };
      } catch {
        return { ...item, streaming_providers: [] };
      }
    })
  );

  return withProviders;
}

export function formatImageUrls(item: TMDBMovie | TMDBMovieDetail): {
  poster: string | null;
  backdrop: string | null;
} {
  return {
    poster: buildImageUrl(item.poster_path, 'w500'),
    backdrop: buildImageUrl(item.backdrop_path, 'w780'),
  };
}
