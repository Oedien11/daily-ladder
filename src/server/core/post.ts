import { reddit } from '@devvit/web/server';
import { dailyPuzzleFor, todayKey } from '../../shared/ladder';

export const createPost = async () => {
  const puzzle = dailyPuzzleFor(todayKey());
  return await reddit.submitCustomPost({
    title: `🪜 Daily Ladder #${puzzle.dayNumber}: ${puzzle.start.toUpperCase()} → ${puzzle.target.toUpperCase()}`,
  });
};
