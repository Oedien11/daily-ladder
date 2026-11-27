import test from 'node:test';
import assert from 'node:assert/strict';
import { WORD_LIST, WORD_SET } from './words';
import {
  checkStep,
  dailyPuzzleFor,
  dateKeyFor,
  dayNumberFor,
  randomPuzzle,
  shareText,
  shortestPath,
  starsFor,
} from './ladder';

void test('word list is clean: all 4 lowercase letters, unique, non-trivial size', () => {
  assert.ok(WORD_LIST.length >= 400, `only ${WORD_LIST.length} words`);
  assert.equal(new Set(WORD_LIST).size, WORD_LIST.length, 'duplicates present');
  for (const w of WORD_LIST) {
    assert.match(w, /^[a-z]{4}$/, w);
  }
  assert.ok(WORD_SET.has('cold'));
  assert.ok(WORD_SET.has('warm'));
  assert.ok(WORD_SET.has('love'));
});

void test('shortestPath finds the classic cold -> warm ladder in 4 steps', () => {
  const path = shortestPath('cold', 'warm');
  assert.ok(path, 'no path cold -> warm');
  assert.equal(path![0], 'cold');
  assert.equal(path![path!.length - 1], 'warm');
  assert.equal(path!.length - 1, 4);
  for (let i = 1; i < path!.length; i++) {
    const prev: string = path![i - 1]!;
    const next: string = path![i]!;
    let diffs = 0;
    for (let j = 0; j < 4; j++) if (next.charAt(j) !== prev.charAt(j)) diffs++;
    assert.equal(diffs, 1, `${prev} -> ${next} changes ${diffs} letters`);
  }
});

void test('daily puzzle is deterministic for the same date', () => {
  const a = dailyPuzzleFor('2026-12-05');
  const b = dailyPuzzleFor('2026-12-05');
  assert.deepEqual(a, b);
});

void test('every daily puzzle Nov 2026 - Mar 2027 is solvable with par 4-6', () => {
  const seen = new Set<string>();
  for (let offset = 0; offset < 120; offset++) {
    const d = new Date(
      Date.parse('2026-11-11T00:00:00Z') + offset * 86_400_000
    );
    const key = dateKeyFor(d);
    const puzzle = dailyPuzzleFor(key);
    assert.equal(puzzle.dateKey, key);
    assert.equal(puzzle.dayNumber, offset + 1);
    assert.ok(WORD_SET.has(puzzle.start), `start not in list: ${puzzle.start}`);
    assert.ok(
      WORD_SET.has(puzzle.target),
      `target not in list: ${puzzle.target}`
    );
    assert.notEqual(puzzle.start, puzzle.target);
    const path = shortestPath(puzzle.start, puzzle.target);
    assert.ok(
      path,
      `no solution for ${key}: ${puzzle.start} -> ${puzzle.target}`
    );
    assert.equal(path!.length - 1, puzzle.par, `par mismatch ${key}`);
    assert.ok(
      puzzle.par >= 4 && puzzle.par <= 6,
      `par ${puzzle.par} out of range ${key}`
    );
    // Puzzles vary day to day (no repeats in a 120-day window).
    const pair = `${puzzle.start}>${puzzle.target}`;
    assert.ok(!seen.has(pair), `duplicate puzzle ${pair} on ${key}`);
    seen.add(pair);
  }
});

void test('day numbers: 2026-11-11 is day 1, 2026-12-09 (deadline day) is day 29', () => {
  assert.equal(dayNumberFor('2026-11-11'), 1);
  assert.equal(dayNumberFor('2026-12-09'), 29);
  assert.equal(dayNumberFor('2027-01-01'), 52);
});

void test('checkStep rejects invalid rungs and accepts valid ones', () => {
  assert.deepEqual(checkStep('cold', 'cord', ['cold']), { ok: true });
  assert.deepEqual(checkStep('cold', 'cold', ['cold']), {
    ok: false,
    reason: 'same-word',
  });
  assert.deepEqual(checkStep('cold', 'warm', ['cold']), {
    ok: false,
    reason: 'more-than-one-letter',
  });
  assert.deepEqual(checkStep('cold', 'zzqx', ['cold']), {
    ok: false,
    reason: 'not-a-word',
  });
  assert.deepEqual(checkStep('cord', 'cold', ['cold', 'cord']), {
    ok: false,
    reason: 'already-used',
  });
});

void test('practice puzzles are solvable with par 4-7', () => {
  for (let i = 0; i < 20; i++) {
    const p = randomPuzzle(`test-${i}`);
    const path = shortestPath(p.start, p.target);
    assert.ok(path, `no practice solution ${p.start} -> ${p.target}`);
    assert.equal(path!.length - 1, p.par);
    assert.ok(p.par >= 4 && p.par <= 7);
  }
});

void test('stars and share text', () => {
  const puzzle = dailyPuzzleFor('2026-12-05');
  assert.equal(starsFor(puzzle.par, puzzle.par), 3);
  assert.equal(starsFor(puzzle.par + 1, puzzle.par), 2);
  assert.equal(starsFor(puzzle.par + 5, puzzle.par), 1);
  const text = shareText(puzzle, puzzle.par, 3);
  assert.match(text, /Daily Ladder #\d+/);
  assert.match(text, new RegExp(puzzle.start.toUpperCase()));
  assert.match(text, new RegExp(puzzle.target.toUpperCase()));
  assert.match(text, /3-day streak/);
  // Share text never reveals the solution path.
  assert.ok(!text.includes('cord'));
});
