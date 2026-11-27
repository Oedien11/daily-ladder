import './index.css';

import { useEffect } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useDailyLadder } from './hooks/useDailyLadder';

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const WordTiles = ({
  word,
  target,
  dimmed,
}: {
  word: string;
  target: string;
  dimmed?: boolean;
}) => (
  <div className="flex gap-1">
    {word
      .toUpperCase()
      .split('')
      .map((letter, i) => {
        const correct = target[i] === letter.toLowerCase();
        return (
          <span
            key={i}
            className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg font-bold ${
              correct
                ? 'border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                : dimmed
                  ? 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
                  : 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
            }`}
          >
            {letter}
          </span>
        );
      })}
  </div>
);

export const App = () => {
  const game = useDailyLadder();
  const {
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
  } = game;

  // Physical keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (won || loading || !puzzle) return;
      if (e.key === 'Enter') {
        submitStep();
      } else if (e.key === 'Backspace') {
        setInput(input.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setInput(input + e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [won, loading, puzzle, input, setInput, submitStep]);

  const steps = Math.max(0, rungs.length - 1);
  const current = rungs.length > 0 ? rungs[rungs.length - 1]! : '';

  if (loading || !puzzle) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-amber-50 dark:bg-gray-900">
        <div className="text-4xl">🪜</div>
        <p className="text-gray-600 dark:text-gray-300">
          Climbing today's ladder…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center gap-3 bg-amber-50 px-4 py-4 dark:bg-gray-900">
      <header className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
          🪜 Daily Ladder
        </h1>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {mode === 'daily' && puzzle.dayNumber > 0 && (
            <span className="rounded-full bg-white px-2 py-1 text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
              Day #{puzzle.dayNumber}
            </span>
          )}
          {streak > 0 && (
            <span
              className="rounded-full bg-orange-100 px-2 py-1 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
              title="Daily win streak"
            >
              🔥 {streak}
            </span>
          )}
        </div>
      </header>

      <div className="flex w-full gap-2">
        <button
          className={`flex-1 cursor-pointer rounded-full py-2 text-sm font-bold ${
            mode === 'daily'
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          }`}
          onClick={() => switchMode('daily')}
        >
          Today's ladder
        </button>
        <button
          className={`flex-1 cursor-pointer rounded-full py-2 text-sm font-bold ${
            mode === 'practice'
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          }`}
          onClick={() => switchMode('practice')}
        >
          Practice
        </button>
      </div>

      <p className="text-center text-sm text-gray-600 dark:text-gray-300">
        Climb from <strong>{puzzle.start.toUpperCase()}</strong> to{' '}
        <strong>{puzzle.target.toUpperCase()}</strong> — change exactly one
        letter per rung. Every rung must be a real word. Par: {puzzle.par}{' '}
        steps.
      </p>

      {/* The ladder */}
      <div className="flex w-full flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
        {rungs.map((word, i) => (
          <div key={`${i}-${word}`} className="flex items-center gap-2">
            <span className="w-6 text-right text-xs font-semibold text-gray-400">
              {i === 0 ? '▶' : i}
            </span>
            <WordTiles word={word} target={puzzle.target} dimmed={false} />
          </div>
        ))}
        {!won && (
          <div className="flex items-center gap-2">
            <span className="w-6 text-right text-xs font-semibold text-gray-400">
              {rungs.length}
            </span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-dashed border-orange-300 bg-orange-50 text-lg font-bold text-orange-800 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200"
                >
                  {(input[i] ?? '').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 opacity-90">
          <span className="w-6 text-right text-xs font-semibold text-gray-400">
            🎯
          </span>
          <WordTiles
            word={puzzle.target}
            target={puzzle.target}
            dimmed={!won}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Green letters already match the target. Steps so far: {steps}
          {hintsUsed > 0 ? ` · hints used: ${hintsUsed} (−1★ each)` : ''}
        </p>
      </div>

      {/* Message */}
      {message && (
        <p
          className={`w-full rounded-xl px-3 py-2 text-center text-sm font-medium ${
            messageTone === 'error'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
              : messageTone === 'success'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
          }`}
        >
          {message}
        </p>
      )}

      {!won ? (
        <>
          {/* On-screen keyboard */}
          <div className="flex w-full flex-col items-center gap-1.5">
            {KEY_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.split('').map((key) => (
                  <button
                    key={key}
                    className="flex h-11 w-8 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-bold text-gray-800 shadow-sm active:bg-orange-200 dark:bg-gray-700 dark:text-gray-100"
                    onClick={() => setInput(input + key)}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
                {ri === 2 && (
                  <button
                    className="flex h-11 cursor-pointer items-center justify-center rounded-md bg-white px-2 text-sm font-bold text-gray-800 shadow-sm active:bg-orange-200 dark:bg-gray-700 dark:text-gray-100"
                    onClick={() => setInput(input.slice(0, -1))}
                    aria-label="Backspace"
                  >
                    ⌫
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex w-full gap-2">
            <button
              className="flex-1 cursor-pointer rounded-full bg-orange-600 py-3 text-base font-bold text-white hover:bg-orange-700 disabled:opacity-40"
              onClick={submitStep}
              disabled={input.length !== 4}
            >
              Climb ↑ ({input.length}/4)
            </button>
            <button
              className="cursor-pointer rounded-full bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200"
              onClick={useHint}
              title="Reveal the next rung on the shortest path (−1 star)"
            >
              💡 Hint{hintWord ? `: ${hintWord.toUpperCase()}` : ''}
            </button>
          </div>
        </>
      ) : (
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-gray-800">
          <div className="text-3xl" aria-label={`${stars} stars`}>
            {'★'.repeat(stars)}
            {'☆'.repeat(3 - stars)}
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            You climbed it in {steps} steps!
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Par was {puzzle.par}.{' '}
            {mode === 'daily'
              ? `u/${username} — come back tomorrow for a new ladder.`
              : 'Nice climbing — try another one!'}
          </p>
          {mode === 'daily' && (
            <button
              className="w-full cursor-pointer rounded-full bg-orange-600 py-3 text-base font-bold text-white hover:bg-orange-700"
              onClick={() => void copyShare()}
            >
              {shareCopied
                ? '✓ Copied — paste it in the comments!'
                : '📋 Copy my result'}
            </button>
          )}
          {mode === 'practice' && (
            <button
              className="w-full cursor-pointer rounded-full bg-orange-600 py-3 text-base font-bold text-white hover:bg-orange-700"
              onClick={newPractice}
            >
              🔀 New practice ladder
            </button>
          )}
          {leaderboardLive && leaderboard.length > 0 && (
            <div className="w-full text-left">
              <h2 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
                🏆 Fastest climbers on this post
              </h2>
              <ol className="text-sm text-gray-700 dark:text-gray-200">
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <li
                    key={entry.username}
                    className="flex justify-between py-0.5"
                  >
                    <span>
                      {i + 1}. u/{entry.username}
                      {entry.username === username ? ' (you)' : ''}
                    </span>
                    <span className="font-semibold">
                      {entry.steps} steps {'★'.repeat(entry.stars)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {!leaderboardLive && mode === 'daily' && (
            <p className="text-xs text-gray-400">
              The shared leaderboard appears once this runs on Reddit.
            </p>
          )}
        </div>
      )}

      <footer className="text-center text-xs text-gray-400">
        Same ladder for everyone, every day · a new puzzle at midnight UTC ·{' '}
        {current === puzzle.target ? '' : `you are on ${current.toUpperCase()}`}
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
