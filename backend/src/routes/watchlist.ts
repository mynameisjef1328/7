import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { service, watched } = req.query;

  let query = 'SELECT * FROM watchlist WHERE user_id = ?';
  const params: unknown[] = [req.userId];

  if (service) {
    query += ' AND streaming_services LIKE ?';
    params.push(`%${service}%`);
  }

  if (watched !== undefined) {
    query += ' AND watched = ?';
    params.push(watched === 'true' ? 1 : 0);
  }

  query += ' ORDER BY added_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  const parsed = rows.map(r => ({
    ...r,
    genres: JSON.parse(r.genres as string),
    streaming_services: JSON.parse(r.streaming_services as string),
    watched: r.watched === 1,
  }));

  res.json(parsed);
});

router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const {
    tmdb_id, media_type = 'movie', title, poster_path, backdrop_path,
    tagline, genres = [], runtime, release_date, vote_average,
    overview, streaming_services = [], why_picked,
  } = req.body;

  if (!tmdb_id || !title) {
    res.status(400).json({ error: 'tmdb_id and title required' });
    return;
  }

  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO watchlist (
        id, user_id, tmdb_id, media_type, title, poster_path, backdrop_path,
        tagline, genres, runtime, release_date, vote_average, overview,
        streaming_services, why_picked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, tmdb_id, media_type) DO UPDATE SET
        title = excluded.title,
        poster_path = excluded.poster_path,
        streaming_services = excluded.streaming_services,
        why_picked = excluded.why_picked
    `).run(
      id, req.userId, tmdb_id, media_type, title, poster_path || null,
      backdrop_path || null, tagline || null, JSON.stringify(genres),
      runtime || null, release_date || null, vote_average || null,
      overview || null, JSON.stringify(streaming_services), why_picked || null
    );

    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Watchlist add error:', err);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const result = db.prepare(
    'DELETE FROM watchlist WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.userId);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  res.json({ success: true });
});

router.patch('/:id/watched', authenticate, (req: AuthRequest, res: Response) => {
  const { watched } = req.body;

  db.prepare(`
    UPDATE watchlist
    SET watched = ?, watched_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
    WHERE id = ? AND user_id = ?
  `).run(watched ? 1 : 0, watched ? 1 : 0, req.params.id, req.userId);

  res.json({ success: true });
});

export default router;
