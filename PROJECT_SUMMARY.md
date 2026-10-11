# RePlay: project summary

A record of what was built in the working session, the decisions made along the way, and what is still open. All discount ranges, level rules, revenue share and EPR targets are **demo assumptions**, not verified figures.

## 1. What RePlay is

An e-waste "second round" platform for Georgia (Tbilisi and Batumi), designed with electronics retailers such as Elit Electronics, Zoommer, Alta and Gstore.

- **Problem:** importers carry extended producer responsibility (EPR) for electrical and electronic waste under Georgia's Waste Management Code, but there is no consumer collection network and no auditable data.
- **Idea:** the cashier counter is the collection point (zero capex). The customer is rewarded in store, and importers get audit-ready records for the Ministry of Environmental Protection and Agriculture.
- **Business model (document only):** the retailer funds the voucher; RePlay takes a share of the discount only when the voucher is redeemed (demo assumption: 20%).

## 2. The loop

1. A clerk registers the item category and estimated weight on `/clerk` and gets a one-time 4-digit PIN (valid 5 minutes).
2. The customer enters the PIN on `/verify` on their phone. The drop-off is confirmed once (atomic and idempotent) and the recycler's level is re-derived.
3. A level-up screen shows if a threshold was crossed.
4. The customer plays a minigame. The reward is worked out **at play time** (see section 5).
5. The voucher ticket is shown to the cashier.
6. `/dashboard` aggregates everything for EPR reporting.

A "recycler" is an anonymous profile (UUID in localStorage and a cookie). Production would use a verified phone number.

## 3. Levels and rewards

Level is derived from the number of `CLAIMED` sessions of a recycler (expired and void sessions never count; a voided claim is recomputed without any demotion animation).

| Level | Drop-offs | Highest possible reward |
|---|---|---|
| Unranked | 0 | 20% |
| Bronze | 1 | 24% |
| Silver | 3 | 28% |
| Gold | 5 | 32% |
| Platinum | 8 | 36% |
| Diamond | 12 | 40% |

Every reward is at least **15%**. Thresholds and prize tables live in one typed constant (`LEVEL_CONFIG` in `types/index.ts`).

## 4. Tech and layout

Next.js 15.5.27 (App Router), React 19.1.9, TypeScript, Tailwind CSS 3.4.19, lucide-react, framer-motion, `spin-wheel`, `canvas-confetti`. State is **in memory** in a single process (globalThis singleton), so the server must run as one instance and data resets on restart.

```
app/            pages (/, /clerk, /verify, /me, /dashboard) and API routes
components/     ui primitives, level path/badge, game host, games, sprites
lib/            session-store, analytics, wheel draw, minigame engines/registry/i18n
types/          shared contracts (index.ts, api.ts)
scripts/        store-smoke.ts, minigames-smoke.ts
design-system/  MASTER.md, DEVIATIONS.md, pages/minigames.md
```

## 5. Reward rules (current)

Nothing is preset. A claim only confirms the drop-off and returns the reward **range** for the level reached.

- **Luck games** (Fortune Wheel, Pick a Device, Claw Machine): the server draws a weighted random segment from the level's table at the moment the player spins, picks or grabs. Nothing the player does changes the odds.
- **Skill games** (Recycle Catch, Sky Flap): the discount scales linearly with the score from 15% up to the level's cap (`discountForScore`). A zero score earns the floor; the game's full-score target earns the cap.
- One reward per drop-off. Repeated requests return the same voucher.
- The game and each play's layout are chosen at random on the phone.
- Scores are client-reported. The server rejects scores that are implausible for the time played and play times longer than the time since the claim. A determined cheater could still inflate a score; production would replay the recorded inputs on the server.
- Earlier in the project the prize was decided at claim time and games could not influence it; that rule was deliberately replaced.

## 6. Games

| Game | Kind | Notes |
|---|---|---|
| Recycle Catch | Skill | Catch falling gadgets in a small recycling bin, dodge food and plastic. An object counts once its centre passes the rim inside the opening; side contact never counts. Gets faster and denser as you play. Battery adds a heart, golden coin is worth 5x. |
| Sky Flap | Skill | Tap-to-flap through gates over the same hills, with an original bird. The bird hovers until the first tap; gates narrow and speed up. |
| Fortune Wheel | Luck | Open-source `spin-wheel` (MIT), landing on the server-drawn segment. |
| Pick a Device | Luck | Tap a laptop, phone or headphones; the server draws on the tap. |
| Claw Machine | Luck | The claw lifts a gadget; the server draws on the grab. |

Demo mode (`REPLAY_DEMO=true`): after verifying, the game intro shows a picker so the presenter can choose any of the five games instead of the random pick. Without the flag the game is random.

Shared rules: a HUD with timer, score and Skip (from 3 seconds), a 30-second hard cap, one `onFinish` per play, reduced-motion fallbacks, stars (0 to 3) and best scores stored only on the phone (`replay.arcade.v1`), reload mid-game resumes at the ticket, and a "How rewards work" sheet reachable from the intro and `/me`.

## 7. API

| Route | Purpose |
|---|---|
| `POST /api/session` | clerk creates a drop-off and gets a PIN |
| `GET /api/session?id&rev` | cheap change-detection polling |
| `PATCH /api/session` | claim (`pin`, `recyclerId`) or void |
| `POST /api/reward` | issue the single reward (random draw or score) |
| `GET /api/recycler` | level, progress and latest voucher |
| `GET /api/dashboard` | aggregates, audit rows, CSV (`?format=csv`) |
| `GET/POST /api/demo` | demo status, seed, reset (needs `REPLAY_DEMO=true`) |

Protections: PIN brute-force lockout (5 wrong in 60 s locks that profile and client for 60 s), UUID checks, input validation, no-store caching, errors mapped to 400/403/404/409/410/429/503/500.

## 8. Design

The app went through several visual directions. The current one is **"Bold level path"**: bright green, azure and sunshine yellow on a sky background with three flat, layered hills that shift at different speeds as you move (2.5D, no texture), chunky navy outlines, Fredoka and Nunito type, and a level path showing the six levels. Falling objects are original illustrated sprites. Research on Too Good To Go, Starbucks Rewards, Duolingo, Plastic Bank and hyper-casual HUD guidance informed the choices; rejected suggestions are logged in `design-system/DEVIATIONS.md`.

## 9. Quality checks

`npm run verify` runs typecheck, production build, `test:store` (claims, levels, idempotency, expiry, void, lockout, rewards) and `test:minigames` (RNG, themes, registry, game choice, catch and flap engines, reward mapping, stage machine, storage, fairness scan). Last run: all green. The suites test logic; screens were spot-checked at phone size in the in-app browser, not on a real phone.

## 10. Running and hosting

```bash
npm install
npm run build
npm start
```

Copy `.env.example` to `.env.local` (`REPLAY_DEMO=true`) to enable demo tools. Phones on the same Wi-Fi use `http://<laptop-ip>:3000/verify`.

- **GitHub:** `Dumba618/replay`. The Render commit lives on branch `render-deploy` (pull request 1).
- **Hosting:** Vercel is unsuitable (serverless instances do not share memory). Render's free web service works with `render.yaml` and the `start` script that honours `PORT`; it sleeps after about 15 minutes idle and then resets data.
- A free tunnel (for example Cloudflare) can expose a laptop run for remote judges.
- **Uncommitted:** the reward rework, Sky Flap and the latest copy changes were not yet committed or pushed when this file was written.

## 11. Pitch deck

A private 10-slide deck (9 for the 5-minute slot plus a backup slide) was published as an Artifact, in the app's look with minimal text and full speaker notes, including a demo script and fallbacks. Fill in the bracketed team name, contact and demo link on the last slide. Prepared answers cover business questions (who pays, margin, market, traction, risks).

## 12. Third-party material

- `spin-wheel` (MIT) and `canvas-confetti` (ISC) are used as dependencies; see `THIRD_PARTY_NOTICES.md`.
- `DeveloperWilliams/Catch-the-Falling-Objects-game`, `noanonoa/flappy-bird` and `luevano/flappybirdgodot` were read as references only. No code or assets were copied. Their sprites and sounds come from the original commercial game or third-party packs, and two have no licence file in the repo.
- All sprites, backgrounds and the bird are original artwork. Klics.io was reviewed only as inspiration at idea level; nothing was copied.

## 13. Known gaps and next steps

- `BRD.md` is out of date (old CycleBack name, old 7 to 15% discounts and the old preset-prize rule).
- In-memory data: no database, no phone sign-in, no point-of-sale voucher redemption.
- Discounts of 15 to 40% may exceed what retailers can fund; the retailer cap and who pays (retailer or importer) need validating.
- Legal review is needed for EPR targets and for promotion rules, especially now that rewards depend on score or chance.
- Georgian text was written without native review.
- Score validation is client-reported; server replay is the production fix.
- Sky Flap, the claw, pick and wheel flows should be tried on real phones; haptics and touch feel were not tested.
