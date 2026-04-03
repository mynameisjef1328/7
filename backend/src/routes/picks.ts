import { Router, Response } from 'express';
import db from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getCandidates, getMovieDetails, getTVDetails, getWatchProviders, formatImageUrls } from '../services/tmdb';
import { buildCuratedPicks, TasteProfile } from '../services/anthropic';

const router = Router();

const FREE_DAILY_LIMIT = 3;

router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  const { mood, genre } = req.body;

  if (!mood) {
    res.status(400).json({ error: 'mood is required' });
    return;
  }

  // Check daily limit for free users
  const user = db.prepare(`
    SELECT tier, streaming_services, taste_profile, daily_batch_count, last_batch_date
    FROM users WHERE id = ?
  `).get(req.userId) as {
    tier: string;
    streaming_services: string;
    taste_profile: string;
    daily_batch_count: number;
    last_batch_date: string | null;
  } | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  if (user.tier === 'free') {
    if (user.last_batch_date === today && user.daily_batch_count >= FREE_DAILY_LIMIT) {
      res.status(429).json({
        error: 'Daily limit reached',
        message: `Free tier allows ${FREE_DAILY_LIMIT} batches per day. Upgrade to 7 Picks Pro for unlimited.`,
        limit: FREE_DAILY_LIMIT,
      });
      return;
    }
  }

  const streamingServices: string[] = JSON.parse(user.streaming_services);
  const rawProfile = JSON.parse(user.taste_profile);

  const tasteProfile: TasteProfile = {
    likedIds: rawProfile.likedIds || [],
    skippedIds: rawProfile.skippedIds || [],
    seenIds: rawProfile.seenIds || [],
    favoriteGenres: rawProfile.favoriteGenres || [],
    pacePreference: rawProfile.pacePreference || 'balanced',
    popularityPreference: rawProfile.popularityPreference || 'mixed',
    streamingServices,
  };

  const excludeIds = [
    ...tasteProfile.seenIds,
    ...tasteProfile.skippedIds.slice(-50),
  ];

  try {
    const candidates = await getCandidates({
      mood,
      genre,
      streamingServices: streamingServices.length > 0 ? streamingServices : ['Netflix', 'Prime Video', 'Hulu'],
      excludeIds,
      includeTV: user.tier !== 'free',
    });

    if (candidates.length < 7) {
      // Fallback: try without service filter
      const fallback = await getCandidates({
        mood,
        genre,
        streamingServices: [],
        excludeIds,
        includeTV: false,
      });
      candidates.push(...fallback.filter(f => !candidates.some(c => c.id === f.id)));
    }

    const picks = await buildCuratedPicks({
      mood,
      genre,
      tasteProfile,
      candidates,
    });

    // Update daily batch count
    if (user.last_batch_date === today) {
      db.prepare('UPDATE users SET daily_batch_count = daily_batch_count + 1 WHERE id = ?')
        .run(req.userId);
    } else {
      db.prepare('UPDATE users SET daily_batch_count = 1, last_batch_date = ? WHERE id = ?')
        .run(today, req.userId);
    }

    res.json({
      picks,
      mood,
      genre: genre || null,
      batches_used: user.last_batch_date === today ? user.daily_batch_count + 1 : 1,
      batches_limit: user.tier === 'free' ? FREE_DAILY_LIMIT : null,
    });
  } catch (err) {
    console.error('Generate picks error:', err);
    res.status(500).json({ error: 'Failed to generate picks' });
  }
});

router.get('/detail/:mediaType/:tmdbId', authenticate, async (req: AuthRequest, res: Response) => {
  const mediaType = req.params.mediaType as string;
  const tmdbId = req.params.tmdbId as string;
  const id = parseInt(tmdbId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid tmdb_id' });
    return;
  }

  try {
    const detail = mediaType === 'tv' ? await getTVDetails(id) : await getMovieDetails(id);
    const providers = await getWatchProviders(id, mediaType as 'movie' | 'tv');
    const { poster, backdrop } = formatImageUrls(detail);

    const title = detail.title || detail.name || 'Unknown';
    const runtime = detail.runtime || (detail.episode_run_time?.[0] ?? null);
    const releaseDate = detail.release_date || detail.first_air_date || null;

    res.json({
      tmdb_id: detail.id,
      media_type: mediaType,
      title,
      tagline: detail.tagline || null,
      overview: detail.overview,
      poster_path: poster,
      backdrop_path: backdrop,
      genres: detail.genres.map(g => g.name),
      runtime,
      release_date: releaseDate,
      vote_average: detail.vote_average,
      vote_count: detail.vote_count,
      streaming_services: providers.map(p => ({
        name: p.provider_name,
        logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
      })),
    });
  } catch (err) {
    console.error('Detail error:', err);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
});

export default router;
