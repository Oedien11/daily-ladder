import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  InitResponse,
  LeaderboardEntry,
  ScoreResponse,
} from '../../shared/api';
import {
  checkStep,
  dailyPuzzleFor,
  randomPuzzle,
  shareText,
  shortestPath,
  starsFor,
  stepErrorMessage,
  todayKey,
  type DailyPuzzle,
} from '../../shared/ladder';

export type GameMode = 'daily' | 'practice';

export type StreakState = {
  count: number;
  lastDateKey: string | null;
};

const STREAK_KEY = 'daily-ladder:streak:v1';
const DAILY_STATE_KEY = 'daily-ladder:today:v1';

type SavedDailyState = {
  dateKey: string;
  rungs: string[];
  won: boolean;
  hintsUsed: number;
};

const loadStreak = (): StreakState => {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastDateKey: null };
    return JSON.parse(raw) as StreakState;
  } catch {
    return { count: 0, lastDateKey: null };
  }
};

const saveStreak = (streak: StreakState): void => {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch {
    // Private mode etc. — streak just won't persist.
  }
};

/** Advance the streak after a daily win. Returns the new streak count. */
const advanceStreak = (dateKey: string): number => {
  const prev = loadStreak();
  const yesterday = new Date(Date.parse(`${dateKey}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
  let next: StreakState;
  if (prev.lastDateKey === dateKey) {
    next = prev; // Already counted today.
  } else if (prev.lastDateKey === yesterday) {
    next = { count: prev.count + 1, lastDateKey: dateKey };
  } else {
    next = { count: 1, lastDateKey: dateKey };
  }
  saveStreak(next);
  return next.count;
};

const loadSavedDaily = (dateKey: string): SavedDailyState | null => {
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDailyState;
    return parsed.dateKey === dateKey ? parsed : null;
  } catch {
    return null;
  }
};

const saveDaily = (state: SavedDailyState): void => {
  try {
    localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence failures.
  }
};

export type LadderGame = {
  loading: boolean;
  mode: GameMode;
  puzzle: DailyPuzzle | null;
  rungs: string[];
  input: string;
  message: string;
  messageTone: 'info' | 'error' | 'success';
  won: boolean;
  hintsUsed: number;
  hintWord: string | null;
  streak: number;
  stars: number;
  leaderboard: LeaderboardEntry[];
  leaderboardLive: boolean;
  username: string;
  shareCopied: boolean;
  setInput: (value: string) => void;
  submitStep: () => void;
  useHint: () => void;
  copyShare: () => Promise<void>;
  switchMode: (mode: GameMode) => void;
  newPractice: () => void;
};

export const useDailyLadder = (): LadderGame => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<GameMode>('daily');
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [rungs, setRungs] = useState<string[]>([]);
  const [input, setInputRaw] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'info' | 'error' | 'success'>(
    'info'
  );
  const [won, setWon] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLive, setLeaderboardLive] = useState(false);
  const [username, setUsername] = useState('player');
  const [shareCopied, setShareCopied] = useState(false);

  // Load the daily puzzle: prefer the server (post leaderboard + username),
  // fall back to the identical deterministic local puzzle when offline.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const local = dailyPuzzleFor(todayKey());
      const saved = loadSavedDaily(local.dateKey);
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`init ${res.status}`);
        const data = (await res.json()) as InitResponse;
        if (cancelled) return;
        setPuzzle(data.puzzle);
        setUsername(data.username);
        setLeaderboard(data.leaderboard);
        setLeaderboardLive(data.leaderboardLive);
        const resumed = loadSavedDaily(data.puzzle.dateKey);
        if (resumed && resumed.rungs.length > 0) {
          setRungs(resumed.rungs);
          setWon(resumed.won);
          setHintsUsed(resumed.hintsUsed);
          if (resumed.won) setStreak(loadStreak().count);
        } else {
          setRungs([data.puzzle.start]);
        }
      } catch {
        if (cancelled) return;
        setPuzzle(local);
        setLeaderboardLive(false);
        if (saved && saved.rungs.length > 0) {
          setRungs(saved.rungs);
          setWon(saved.won);
          setHintsUsed(saved.hintsUsed);
          if (saved.won) setStreak(loadStreak().count);
        } else {
          setRungs([local.start]);
        }
        setMessage('Playing offline — your streak is saved on this device.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = rungs.length > 0 ? rungs[rungs.length - 1]! : '';
  const steps = Math.max(0, rungs.length - 1);
  const stars = useMemo(() => {
    if (!puzzle || !won) return 0;
    return Math.max(1, starsFor(steps, puzzle.par) - hintsUsed);
  }, [won, steps, puzzle, hintsUsed]);

  // Persist daily progress + submit the score once on a daily win.
  useEffect(() => {
    if (!puzzle || mode !== 'daily') return;
    saveDaily({ dateKey: puzzle.dateKey, rungs, won, hintsUsed });
    if (!won) return;
    const submit = async () => {
      try {
        const res = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateKey: puzzle.dateKey,
            steps,
            stars: starsFor(steps, puzzle.par),
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as ScoreResponse;
        setLeaderboard(data.leaderboard);
        setLeaderboardLive(true);
      } catch {
        // Offline: score just isn't posted to the shared board.
      }
    };
    void submit();
    // Only run once per win (steps/stars are stable after the win).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, puzzle, mode]);

  const setInput = useCallback((value: string) => {
    setInputRaw(
      value
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .slice(0, 4)
    );
    setMessage('');
  }, []);

  const submitStep = useCallback(() => {
    if (!puzzle || won || loading) return;
    const word = input.trim();
    if (word.length !== 4) {
      setMessage('Type a 4-letter word.');
      setMessageTone('error');
      return;
    }
    const check = checkStep(current, word, rungs);
    if (!check.ok) {
      setMessage(stepErrorMessage(check));
      setMessageTone('error');
      return;
    }
    const nextRungs = [...rungs, word];
    setRungs(nextRungs);
    setInputRaw('');
    setHintWord(null);
    if (word === puzzle.target) {
      setWon(true);
      // Advancing the streak here (event handler) keeps it out of effects.
      if (mode === 'daily') setStreak(advanceStreak(puzzle.dateKey));
      setMessage(
        `You reached ${puzzle.target.toUpperCase()} in ${nextRungs.length - 1} steps!`
      );
      setMessageTone('success');
    } else {
      setMessage('');
    }
  }, [puzzle, won, loading, input, current, rungs, mode]);

  const useHint = useCallback(() => {
    if (!puzzle || won) return;
    const path = shortestPath(current, puzzle.target);
    if (!path || path.length < 2) return;
    const next = path[1]!;
    setHintWord(next);
    setHintsUsed((n) => n + 1);
    setMessage(
      `Hint: the next rung on the shortest path is ${next.toUpperCase()}. (−1 star)`
    );
    setMessageTone('info');
  }, [puzzle, won, current]);

  const copyShare = useCallback(async () => {
    if (!puzzle || !won) return;
    const text = shareText(puzzle, steps, streak);
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setMessage('Result copied — paste it in the comments!');
      setMessageTone('success');
    } catch {
      setMessage(text);
      setMessageTone('info');
    }
  }, [puzzle, won, steps, streak]);

  const switchMode = useCallback((nextMode: GameMode) => {
    setMode(nextMode);
    setWon(false);
    setHintsUsed(0);
    setHintWord(null);
    setInputRaw('');
    setMessage('');
    if (nextMode === 'practice') {
      const p = randomPuzzle(`${Date.now()}`);
      setPuzzle(p);
      setRungs([p.start]);
    } else {
      const p = dailyPuzzleFor(todayKey());
      setPuzzle(p);
      const saved = loadSavedDaily(p.dateKey);
      if (saved && saved.rungs.length > 0) {
        setRungs(saved.rungs);
        setWon(saved.won);
        setHintsUsed(saved.hintsUsed);
      } else {
        setRungs([p.start]);
      }
    }
  }, []);

  const newPractice = useCallback(() => {
    const p = randomPuzzle(`${Date.now()}-${Math.random()}`);
    setPuzzle(p);
    setRungs([p.start]);
    setWon(false);
    setHintsUsed(0);
    setHintWord(null);
    setInputRaw('');
    setMessage('');
  }, []);

  return {
    loading,
    mode,
    puzzle,
    rungs,
    input,
    message,
    messageTone,
    won,
    hintsUsed,
    hintWord,
    streak,
    stars,
    leaderboard,
    leaderboardLive,
    username,
    shareCopied,
    setInput,
    submitStep,
    useHint,
    copyShare,
    switchMode,
    newPractice,
  };
};
