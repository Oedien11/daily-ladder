import { WORD_LIST, WORD_SET } from './words';

// ---------------------------------------------------------------------------
// Daily Ladder — shared game logic (runs identically on client and server).
// A "ladder" turns a START word into a TARGET word one letter at a time;
// every intermediate rung must be a real word from WORD_LIST.
// ---------------------------------------------------------------------------

export type DailyPuzzle = {
  /** UTC date key, e.g. "2026-12-05" */
  dateKey: string;
  /** Day number since the epoch (used in share text) */
  dayNumber: number;
  start: string;
  target: string;
  /** Shortest possible number of steps (par) */
  par: number;
};

/** First daily puzzle date: the hackathon's opening day. Day #1 = 2026-11-11. */
export const EPOCH_DATE = '2026-11-11';

/** One puzzle per day is generated from this seed namespace. */
const SEED_NAMESPACE = 'daily-ladder-v1';

export const dateKeyFor = (d: Date): string => d.toISOString().slice(0, 10);

export const todayKey = (): string => dateKeyFor(new Date());

export const dayNumberFor = (dateKey: string): number => {
  const epoch = Date.parse(`${EPOCH_DATE}T00:00:00Z`);
  const day = Date.parse(`${dateKey}T00:00:00Z`);
  return Math.floor((day - epoch) / 86_400_000) + 1;
};

/** Small deterministic PRNG (mulberry32) seeded from a string hash. */
export const seededRandom = (seedText: string): (() => number) => {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const differsByOneLetter = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffs++;
      if (diffs > 1) return false;
    }
  }
  return diffs === 1;
};

/** All words one letter away from `word`. */
export const neighbours = (word: string): string[] => {
  const out: string[] = [];
  for (const candidate of WORD_LIST) {
    if (differsByOneLetter(word, candidate)) out.push(candidate);
  }
  return out;
};

/**
 * Shortest path (BFS) from `start` to `target` through the word graph.
 * Returns the full path including both endpoints, or null if unreachable.
 */
export const shortestPath = (
  start: string,
  target: string
): string[] | null => {
  if (start === target) return [start];
  if (!WORD_SET.has(start) || !WORD_SET.has(target)) return null;
  const prev = new Map<string, string>();
  const seen = new Set<string>([start]);
  const queue: string[] = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of neighbours(current)) {
      if (seen.has(next)) continue;
      seen.add(next);
      prev.set(next, current);
      if (next === target) {
        const path = [target];
        let node = target;
        while (node !== start) {
          node = prev.get(node)!;
          path.unshift(node);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
};

/**
 * Deterministic daily puzzle for a UTC date key. Picks a random start word,
 * then a target at BFS distance 4-6 (par 4-6 steps) so the puzzle is always
 * solvable in a satisfying number of rungs — never trivial, never a grind.
 */
export const dailyPuzzleFor = (dateKey: string): DailyPuzzle => {
  const rand = seededRandom(`${SEED_NAMESPACE}:${dateKey}`);
  const words = WORD_LIST;
  for (let attempt = 0; attempt < 200; attempt++) {
    const start = words[Math.floor(rand() * words.length)]!;
    // BFS out from start, collect words at distance 4-6.
    const dist = new Map<string, number>([[start, 0]]);
    const queue: string[] = [start];
    const candidates: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const d = dist.get(current)!;
      if (d >= 6) continue;
      for (const next of neighbours(current)) {
        if (dist.has(next)) continue;
        dist.set(next, d + 1);
        if (d + 1 >= 4) candidates.push(next);
        queue.push(next);
      }
    }
    if (candidates.length === 0) continue;
    const target = candidates[Math.floor(rand() * candidates.length)]!;
    const path = shortestPath(start, target);
    if (!path) continue;
    const par = path.length - 1;
    if (par < 4 || par > 6) continue;
    return { dateKey, dayNumber: dayNumberFor(dateKey), start, target, par };
  }
  // Fallback (should never happen with a connected word graph): a fixed pair
  // verified solvable in 4 steps: cold -> warm.
  return {
    dateKey,
    dayNumber: dayNumberFor(dateKey),
    start: 'cold',
    target: 'warm',
    par: 4,
  };
};

/** A random (non-daily) puzzle for Practice mode. */
export const randomPuzzle = (seedText: string): DailyPuzzle => {
  const rand = seededRandom(`practice:${seedText}`);
  const words = WORD_LIST;
  for (let attempt = 0; attempt < 200; attempt++) {
    const start = words[Math.floor(rand() * words.length)]!;
    const path = shortestPath(start, words[Math.floor(rand() * words.length)]!);
    if (!path) continue;
    const par = path.length - 1;
    if (par < 4 || par > 7) continue;
    return {
      dateKey: `practice-${seedText}`,
      dayNumber: 0,
      start,
      target: path[path.length - 1]!,
      par,
    };
  }
  return {
    dateKey: `practice-${seedText}`,
    dayNumber: 0,
    start: 'cold',
    target: 'warm',
    par: 4,
  };
};

export type StepCheck =
  | { ok: true }
  | {
      ok: false;
      reason:
        'not-a-word' | 'same-word' | 'more-than-one-letter' | 'already-used';
    };

/** Validate one proposed rung against the current word and the rungs so far. */
export const checkStep = (
  current: string,
  next: string,
  used: readonly string[]
): StepCheck => {
  const word = next.toLowerCase().trim();
  if (word === current) return { ok: false, reason: 'same-word' };
  if (!WORD_SET.has(word)) return { ok: false, reason: 'not-a-word' };
  if (!differsByOneLetter(current, word)) {
    return { ok: false, reason: 'more-than-one-letter' };
  }
  if (used.includes(word)) return { ok: false, reason: 'already-used' };
  return { ok: true };
};

export const stepErrorMessage = (
  check: Extract<StepCheck, { ok: false }>
): string => {
  switch (check.reason) {
    case 'not-a-word':
      return 'Not in the word list — try another word.';
    case 'same-word':
      return 'That is the word you are already on.';
    case 'more-than-one-letter':
      return 'Change exactly one letter per rung.';
    case 'already-used':
      return 'You already used that word in this ladder.';
  }
};

/** Stars: 3 for par, 2 for par+1, 1 for par+2 or more. */
export const starsFor = (steps: number, par: number): number => {
  if (steps <= par) return 3;
  if (steps === par + 1) return 2;
  return 1;
};

/** Copy-paste share text (Wordle-style, no spoilers). */
export const shareText = (
  puzzle: DailyPuzzle,
  steps: number,
  streak: number
): string => {
  const stars =
    '★'.repeat(starsFor(steps, puzzle.par)) +
    '☆'.repeat(3 - starsFor(steps, puzzle.par));
  const blocks = '🟩'.repeat(Math.min(steps, 10));
  const lines = [
    `🪜 Daily Ladder #${puzzle.dayNumber}`,
    `${puzzle.start.toUpperCase()} → ${puzzle.target.toUpperCase()} in ${steps} steps (par ${puzzle.par}) ${stars}`,
    blocks,
    streak > 1 ? `🔥 ${streak}-day streak` : '',
    'Play the daily ladder on Reddit!',
  ];
  return lines.filter(Boolean).join('\n');
};
