import type { DailyPuzzle } from './ladder';

export type LeaderboardEntry = {
  username: string;
  steps: number;
  stars: number;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  puzzle: DailyPuzzle;
  /** Best results on this post for today's puzzle (may be empty offline). */
  leaderboard: LeaderboardEntry[];
  /** Whether the server leaderboard is live (false when running standalone). */
  leaderboardLive: boolean;
};

export type ScoreRequest = {
  dateKey: string;
  steps: number;
  stars: number;
};

export type ScoreResponse = {
  type: 'score';
  postId: string;
  leaderboard: LeaderboardEntry[];
  rank: number;
};
