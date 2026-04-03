import Anthropic from '@anthropic-ai/sdk';
import { TMDBMovie, WatchProvider, formatImageUrls } from './tmdb';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TasteProfile {
  likedIds: number[];
  skippedIds: number[];
  seenIds: number[];
  favoriteGenres: string[];
  pacePreference: 'slow-burn' | 'fast-paced' | 'balanced';
  popularityPreference: 'mainstream' | 'hidden-gems' | 'mixed';
  streamingServices: string[];
}

export interface CuratedPick {
  tmdb_id: number;
  media_type: string;
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

interface AIPickResult {
  tmdb_id: number;
  why_picked: string;
  rank: number;
}

export async function curatePicks(options: {
  mood: string;
  genre?: string;
  tasteProfile: TasteProfile;
  candidates: Array<TMDBMovie & { streaming_providers: WatchProvider[] }>;
}): Promise<AIPickResult[]> {
  const { mood, genre, tasteProfile, candidates } = options;

  if (candidates.length === 0) {
    return [];
  }

  const candidateSummaries = candidates.slice(0, 30).map((c, i) => {
    const title = c.title || c.name || 'Unknown';
    const year = (c.release_date || c.first_air_date || '').split('-')[0];
    const services = c.streaming_providers.map(p => p.provider_name).join(', ');
    return `${i + 1}. [ID:${c.id}] "${title}" (${year}) | Score: ${c.vote_average.toFixed(1)} | Streams on: ${services || 'unknown'} | Popularity: ${Math.round(c.popularity)}`;
  }).join('\n');

  const likedContext = tasteProfile.likedIds.length > 0
    ? `User previously saved: IDs ${tasteProfile.likedIds.slice(-10).join(', ')}`
    : 'No save history yet';

  const seenContext = tasteProfile.seenIds.length > 0
    ? `User has seen: IDs ${tasteProfile.seenIds.slice(-10).join(', ')} (exclude these)`
    : '';

  const systemPrompt = `You are the 7 Picks AI curator. Your job is to select exactly 7 movies/shows from a candidate list that best match the user's mood and taste. You must return a JSON array of exactly 7 picks.

Rules:
- Select exactly 7 titles
- Never pick titles the user has already seen
- Consider the user's taste profile when ranking
- Provide a SHORT (1-2 sentence), personal "why you got this pick" explanation for each
- The explanation should feel like a knowledgeable friend's recommendation, not a synopsis
- Reference the user's preferences when relevant (e.g., "Since you like slow-burn thrillers...")`;

  const userMessage = `Pick 7 titles for a user in the mood for: ${mood}${genre ? ` (genre: ${genre})` : ''}

User Taste Profile:
- Pace preference: ${tasteProfile.pacePreference}
- Popularity preference: ${tasteProfile.popularityPreference}
- Favorite genres: ${tasteProfile.favoriteGenres.join(', ') || 'not set yet'}
- ${likedContext}
${seenContext ? `- ${seenContext}` : ''}

Candidate titles (pick from these only):
${candidateSummaries}

Return ONLY a JSON array (no markdown, no explanation outside JSON):
[
  {"tmdb_id": <number>, "rank": <1-7>, "why_picked": "<1-2 sentence personal recommendation>"},
  ...
]`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    // @ts-expect-error adaptive thinking supported in claude-opus-4-6
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const finalMessage = await stream.finalMessage();

  const textBlock = finalMessage.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI');
  }

  let jsonStr = textBlock.text.trim();
  // Strip any markdown code fences if present
  jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let picks: AIPickResult[];
  try {
    picks = JSON.parse(jsonStr);
  } catch {
    // Try to extract JSON array
    const match = jsonStr.match(/\[[\s\S]*\]/);
    if (match) {
      picks = JSON.parse(match[0]);
    } else {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  return picks.slice(0, 7).sort((a, b) => a.rank - b.rank);
}

export async function buildCuratedPicks(options: {
  mood: string;
  genre?: string;
  tasteProfile: TasteProfile;
  candidates: Array<TMDBMovie & { streaming_providers: WatchProvider[] }>;
}): Promise<CuratedPick[]> {
  const { candidates } = options;
  const aiPicks = await curatePicks(options);

  const candidateMap = new Map(candidates.map(c => [c.id, c]));

  const results: CuratedPick[] = [];
  for (const pick of aiPicks) {
    const candidate = candidateMap.get(pick.tmdb_id);
    if (!candidate) continue;

    const { poster, backdrop } = formatImageUrls(candidate);
    const title = candidate.title || candidate.name || 'Unknown';
    const releaseDate = candidate.release_date || candidate.first_air_date || null;
    const services = candidate.streaming_providers.map(p => p.provider_name);

    results.push({
      tmdb_id: candidate.id,
      media_type: candidate.media_type || 'movie',
      title,
      tagline: null, // Will be fetched on demand in detail view
      poster_path: poster,
      backdrop_path: backdrop,
      genres: [], // Genre IDs from candidate; names resolved client-side
      runtime: null,
      release_date: releaseDate,
      vote_average: candidate.vote_average,
      streaming_services: services,
      why_picked: pick.why_picked,
    });
  }

  return results;
}
