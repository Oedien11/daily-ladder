import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  InitResponse,
  LeaderboardEntry,
  ScoreRequest,
  ScoreResponse,
} from '../../shared/api';
import { dailyPuzzleFor, starsFor, todayKey } from '../../shared/ladder';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

const leaderboardKey = (postId: string, dateKey: string): string =>
  `ladder:lb:${postId}:${dateKey}`;

/**
 * Read the top-10 leaderboard for this post + day from Redis.
 * Returns an empty list (live=false) when Redis is unavailable, so the game
 * still works standalone / before the app is installed on Reddit.
 */
const readLeaderboard = async (
  postId: string,
  dateKey: string
): Promise<{ entries: LeaderboardEntry[]; live: boolean }> => {
  try {
    const rows = await redis.zRange(leaderboardKey(postId, dateKey), 0, 9, {
      by: 'rank',
    });
    const entries: LeaderboardEntry[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.member) as LeaderboardEntry;
        entries.push(parsed);
      } catch {
        // Skip corrupt entries rather than failing the whole init.
      }
    }
    return { entries, live: true };
  } catch (error) {
    console.warn('Leaderboard unavailable, continuing without it:', error);
    return { entries: [], live: false };
  }
};

/**
 * Read the post id from the Devvit request context. Outside Reddit (local
 * testing, standalone preview) the context is absent and accessing it
 * throws — treat that as "no post", never as a crash.
 */
const contextPostId = (): string | undefined => {
  try {
    return context.postId;
  } catch {
    return undefined;
  }
};

api.get('/init', async (c) => {
  const postId = contextPostId();
  const puzzle = dailyPuzzleFor(todayKey());

  // Standalone mode (no Devvit context, e.g. local `vite preview`): the
  // client still gets a full daily puzzle and plays entirely client-side.
  if (!postId) {
    return c.json<InitResponse>({
      type: 'init',
      postId: 'standalone',
      username: 'player',
      puzzle,
      leaderboard: [],
      leaderboardLive: false,
    });
  }

  try {
    const [username, board] = await Promise.all([
      reddit.getCurrentUsername(),
      readLeaderboard(postId, puzzle.dateKey),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: username ?? 'anonymous',
      puzzle,
      leaderboard: board.entries,
      leaderboardLive: board.live,
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: 'anonymous',
      puzzle,
      leaderboard: [],
      leaderboardLive: false,
    });
  }
});

api.post('/score', async (c) => {
  const postId = contextPostId();
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }

  const body = await c.req.json<ScoreRequest>();
  const puzzle = dailyPuzzleFor(todayKey());
  if (body.dateKey !== puzzle.dateKey) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Score is for a different day' },
      400
    );
  }
  if (
    !Number.isInteger(body.steps) ||
    body.steps < puzzle.par ||
    body.steps > 50
  ) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Invalid step count' },
      400
    );
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const entry: LeaderboardEntry = {
      username,
      steps: body.steps,
      stars: starsFor(body.steps, puzzle.par),
    };
    const key = leaderboardKey(postId, puzzle.dateKey);
    // Keep each player's best (fewest steps) result only: remove any older,
    // worse entry from this user, then store the best one.
    const members = await redis.zRange(key, 0, -1, { by: 'rank' });
    let best = entry.steps;
    for (const row of members) {
      try {
        const parsed = JSON.parse(row.member) as LeaderboardEntry;
        if (parsed.username === username) {
          best = Math.min(best, parsed.steps);
          await redis.zRem(key, [row.member]);
        }
      } catch {
        // Ignore corrupt entries.
      }
    }
    const finalEntry: LeaderboardEntry = {
      username,
      steps: best,
      stars: starsFor(best, puzzle.par),
    };
    await redis.zAdd(key, { member: JSON.stringify(finalEntry), score: best });
    const board = await readLeaderboard(postId, puzzle.dateKey);
    const rank = board.entries.findIndex((e) => e.username === username) + 1;
    return c.json<ScoreResponse>({
      type: 'score',
      postId,
      leaderboard: board.entries,
      rank: rank === 0 ? board.entries.length + 1 : rank,
    });
  } catch (error) {
    console.error(`API Score Error for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Score not saved' },
      500
    );
  }
});
