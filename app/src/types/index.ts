export interface User {
  id: string;
  email: string;
  tier: 'free' | 'pro';
  streaming_services: string[];
  taste_profile: TasteProfile;
  daily_batch_count: number;
  last_batch_date: string | null;
}

export interface TasteProfile {
  likedIds: number[];
  skippedIds: number[];
  seenIds: number[];
  favoriteGenres: string[];
  pacePreference: 'slow-burn' | 'fast-paced' | 'balanced';
  popularityPreference: 'mainstream' | 'hidden-gems' | 'mixed';
}

export interface Pick {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  tagline: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: string[];
  runtime: number | null;
  release_date: string | null;
  vote_average: number;
  streaming_services: string[];
  why_picked: string;
}

export interface WatchlistItem extends Pick {
  id: string;
  user_id: string;
  overview: string | null;
  watched: boolean;
  added_at: string;
  watched_at: string | null;
}

export interface PickDetail extends Omit<Pick, 'streaming_services'> {
  overview: string;
  vote_count: number;
  streaming_services: Array<{ name: string; logo: string }>;
}

export interface GeneratePicksResponse {
  picks: Pick[];
  mood: string;
  genre: string | null;
  batches_used: number;
  batches_limit: number | null;
}

export type Mood = 'Thrilling' | 'Fun' | 'Emotional' | 'Chill' | 'Mind-Bending' | 'Feel-Good';
export type Genre = 'Thriller' | 'Comedy' | 'Drama' | 'Sci-Fi' | 'Horror' | 'Romance' | 'Documentary' | 'Action' | 'Animation';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  PickCards: { mood: string; genre?: string };
  WatchlistDetail: { item: WatchlistItem };
};

export type BottomTabParamList = {
  Home: undefined;
  Watchlist: undefined;
  Profile: undefined;
};
