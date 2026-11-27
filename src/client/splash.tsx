import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { dailyPuzzleFor, todayKey } from '../shared/ladder';

export const Splash = () => {
  const puzzle = dailyPuzzleFor(todayKey());
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-amber-50 px-4 py-6 dark:bg-gray-900">
      <div className="text-5xl">🪜</div>
      <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
        Daily Ladder
      </h1>
      <p className="text-center text-sm text-gray-600 dark:text-gray-300">
        Hey {context.username ?? 'climber'} — today's ladder is ready.
      </p>
      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
        <span className="rounded-md bg-orange-100 px-2 py-1 font-mono text-lg font-bold text-orange-800 dark:bg-orange-900 dark:text-orange-100">
          {puzzle.start.toUpperCase()}
        </span>
        <span className="text-xl text-gray-400">→</span>
        <span className="rounded-md bg-emerald-100 px-2 py-1 font-mono text-lg font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
          {puzzle.target.toUpperCase()}
        </span>
      </div>
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Day #{puzzle.dayNumber} · par {puzzle.par} steps · same ladder for
        everyone today
      </p>
      <button
        className="cursor-pointer rounded-full bg-orange-600 px-8 py-3 text-base font-bold text-white hover:bg-orange-700"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Tap to climb 🪜
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
