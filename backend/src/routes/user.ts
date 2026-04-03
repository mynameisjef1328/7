import { Router, Response } from 'express';
import db from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, (req: AuthRequest, res: Response) => {
  const user = db.prepare(`
    SELECT id, email, tier, streaming_services, taste_profile, daily_batch_count, last_batch_date, created_at
    FROM users WHERE id = ?
  `).get(req.userId) as Record<string, unknown> | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    ...user,
    streaming_services: JSON.parse(user.streaming_services as string),
    taste_profile: JSON.parse(user.taste_profile as string),
  });
});

router.put('/profile', authenticate, (req: AuthRequest, res: Response) => {
  const { streaming_services, taste_profile } = req.body;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (streaming_services !== undefined) {
    updates.push('streaming_services = ?');
    values.push(JSON.stringify(streaming_services));
  }

  if (taste_profile !== undefined) {
    updates.push('taste_profile = ?');
    values.push(JSON.stringify(taste_profile));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  updates.push('updated_at = datetime(\'now\')');
  values.push(req.userId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/history', authenticate, (req: AuthRequest, res: Response) => {
  const { tmdb_id, media_type = 'movie', title, action, mood, genre } = req.body;

  if (!tmdb_id || !title || !action) {
    res.status(400).json({ error: 'tmdb_id, title, and action required' });
    return;
  }

  const { v4: uuidv4 } = require('uuid');
  db.prepare(`
    INSERT INTO history (id, user_id, tmdb_id, media_type, title, action, mood, genre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), req.userId, tmdb_id, media_type, title, action, mood || null, genre || null);

  // Update taste profile based on action
  const user = db.prepare('SELECT taste_profile FROM users WHERE id = ?').get(req.userId) as
    { taste_profile: string } | undefined;

  if (user) {
    const profile = JSON.parse(user.taste_profile) as {
      likedIds?: number[];
      skippedIds?: number[];
      seenIds?: number[];
    };

    if (action === 'save') {
      profile.likedIds = [...new Set([...(profile.likedIds || []), tmdb_id])].slice(-50);
    } else if (action === 'skip') {
      profile.skippedIds = [...new Set([...(profile.skippedIds || []), tmdb_id])].slice(-100);
    } else if (action === 'seen') {
      profile.seenIds = [...new Set([...(profile.seenIds || []), tmdb_id])].slice(-200);
    }

    db.prepare('UPDATE users SET taste_profile = ? WHERE id = ?')
      .run(JSON.stringify(profile), req.userId);
  }

  res.json({ success: true });
});

router.get('/history', authenticate, (req: AuthRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT * FROM history WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 100
  `).all(req.userId);

  res.json(rows);
});

export default router;
