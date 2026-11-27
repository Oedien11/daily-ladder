# 🪜 Daily Ladder — a daily word-ladder game for Reddit

**Reddit's Game of the Day Hackathon** (Devpost: https://redditgameofday2026.devpost.com/)
— a bite-sized daily game built on **Devvit Web** (React 19 + Hono + Redis).

## How to play

Every day, everyone on Reddit gets the **same ladder**: turn the START word into
the TARGET word, one letter at a time. Each rung must be a real word.

```
COLD → CORD → WORD → WARD → WARM   (par 4)
```

- Change **exactly one letter** per rung.
- Every rung must be a word from the game's word list (~600 common 4-letter words).
- Letters that already match the target in the same position turn **green**.
- Finish in par to earn ★★★, par + 1 for ★★, more for ★.
- **💡 Hint** reveals the next rung on the shortest path (costs 1 star).
- Win days in a row to build a **🔥 streak**.
- **Copy my result** shares a spoiler-free Wordle-style summary to paste in the
  comments; the fastest climbers on the post appear on a **🏆 leaderboard**.

A **Practice** mode offers unlimited random ladders that don't touch your streak.

## Why it's a daily game

- **One puzzle per day, same for everyone.** The puzzle is derived
  deterministically from the UTC date (seeded PRNG + BFS over the word graph),
  so the client and server always agree — no puzzle database to maintain.
- **Calibrated difficulty.** Every daily puzzle is verified solvable in **4–6
  steps** (par 4–6). A test checks 120 consecutive days (Dec 2026 – Mar 2027)
  for solvability, par range, and no repeats.
- **Fresh content forever.** A new ladder appears at midnight UTC, every day.
- **Community loop.** Same puzzle + per-post leaderboard + shareable result =
  a reason to come back tomorrow and compare with the thread.

## Tech

| Layer   | Stack                                                                            |
| ------- | -------------------------------------------------------------------------------- |
| Client  | React 19, Tailwind CSS 4, Vite — runs in the post's expanded view                |
| Server  | Hono on Devvit, `@devvit/web/server`                                             |
| Storage | Devvit Redis sorted set: per-post, per-day leaderboard (best result per user)    |
| Shared  | `src/shared/ladder.ts` — seeded daily puzzle, BFS solver, validation, share text |

The game works **fully offline/standalone**: if the Devvit server isn't
reachable, the client computes the identical daily puzzle locally and keeps
the streak in `localStorage`. The leaderboard simply appears once the app runs
on Reddit.

## Project layout

```
devvit.json                 # App config: name "daily-ladder", splash + game entrypoints
src/client/game.tsx         # The game UI (ladder, keyboard, win card, leaderboard)
src/client/splash.tsx       # Inline splash shown in the feed ("Tap to climb")
src/client/hooks/useDailyLadder.ts  # Game state, streak, hints, score submit
src/server/index.ts         # Hono app: /api/* + /internal/*
src/server/routes/api.ts    # GET /api/init, POST /api/score (Redis leaderboard)
src/server/routes/menu.ts   # "Create a Daily Ladder post" (moderator menu)
src/server/core/post.ts     # Post title: "🪜 Daily Ladder #N: START → TARGET"
src/shared/words.ts         # Curated 4-letter word list
src/shared/ladder.ts        # Daily puzzle generator, BFS, validation, share text
src/shared/ladder.test.ts   # Unit tests (run with `npm run test:unit`)
src/shared/api.ts           # Shared API types
```

## Develop

```bash
npm install
npm run test:unit    # game-logic tests (daily puzzles, validation, sharing)
npm run test:types   # tsc --build
npm run build        # vite build -> dist/
npm run dev          # devvit playtest (needs Reddit login; see below)
```

## Playtest / publish (requires the developer's Reddit account)

This repo is built and verified locally, but only the developer can run it on
Reddit — Devvit login and the test subreddit belong to their Reddit account:

1. `devvit login` (or `npm run login`)
2. `npm run dev` — playtest in your auto-created test subreddit
3. Create a post from the subreddit menu ("Create a Daily Ladder post")
4. `npm run deploy` — `devvit upload` (do **not** publish for this hackathon;
   the app stays private, per the hackathon rules)
5. Submit on Devpost with the app listing link
   (`developers.reddit.com/apps/daily-ladder`) and the demo post link.

## Hackathon submission checklist

- [x] Built on Devvit Web, compliant with Devvit Rules
- [x] Daily game: new puzzle every day, same for everyone, replayable
- [x] Detailed README (this file)
- [ ] App listing link (after `devvit upload` by the developer)
- [ ] Demo post link (public test subreddit, < 200 members)
- [ ] Optional < 1 min demo video (screen recording, YouTube/Vimeo)

## License

BSD-3-Clause (same as the Devvit React template this started from).
Original work by oedien.ai / Oedien11.
