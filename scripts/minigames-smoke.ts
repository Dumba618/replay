/**
 * Smoke test for the minigame system. Run: npm run test:minigames
 * Covers RNG determinism, theme/icon integrity, registry rules, game picking,
 * the Recycle Catch engine, the reward-stage machine, arcade storage parsing and
 * the fairness guard (no game code may talk to the network).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ItemCategory, LEVEL_CONFIG, Level, MIN_DISCOUNT_PERCENT, Retailer, discountForScore, rewardRangeForLevel } from "../types";
import { BOX_HALF_WIDTH, CATCH_DURATION_SEC, CATCH_MAX_SLOTS, MOUTH_HALF_WIDTH, buildCatchLoadout, createCatchEngine } from "../lib/minigames/catch-engine";
import { FLAP_DURATION_SEC, GROUND_Y, PIPE_WIDTH, createFlapEngine } from "../lib/minigames/flap-engine";
import { nextStage, type FlowContext, type RewardStage } from "../lib/minigames/flow";
import { pickMinigame, SIGNATURE_GAME } from "../lib/minigames/pick";
import { enabledMinigames, HARD_CAP_SEC, MINIGAMES, MINIGAME_IDS, starsForScore } from "../lib/minigames/registry";
import { hashString, mulberry32, shuffled } from "../lib/minigames/rng";
import { EMPTY_ARCADE, parseArcade, withPick, withResult } from "../lib/minigames/storage";
import { STORE_THEME_BY_RETAILER, THEMES } from "../lib/minigames/themes";
import { SPRITE_NAMES, type MinigameId, type MinigameResult } from "../lib/minigames/types";
import { GAME_ICONS } from "../components/game/minigames/icons";

/* ---------- rng ---------- */
assert.equal(hashString("a"), 0xe40c292c, "FNV-1a 32-bit of 'a'");
assert.equal(hashString(""), 0x811c9dc5);
const r1 = mulberry32(42);
const r2 = mulberry32(42);
for (let i = 0; i < 50; i += 1) assert.equal(r1(), r2());
const sample = mulberry32(7)();
assert(sample >= 0 && sample < 1);
assert.deepEqual(shuffled([1, 2, 3, 4, 5], mulberry32(3)), shuffled([1, 2, 3, 4, 5], mulberry32(3)));

/* ---------- themes and icons ---------- */
const electronics = THEMES.ELECTRONICS;
assert.equal(electronics.good.length, 8);
assert.equal(electronics.bad.length, 6);
assert(electronics.bonus.length >= 1, "electronics has a golden bonus item");
for (const theme of Object.values(THEMES)) {
  const ids = new Set<string>();
  for (const item of [...theme.good, ...theme.bad, ...theme.batteries, ...theme.bonus]) {
    assert(!ids.has(item.id), `duplicate item id ${item.id}`);
    ids.add(item.id);
    assert((SPRITE_NAMES as readonly string[]).includes(item.icon), `sprite ${item.icon} must exist`);
    assert(item.labelEn.length > 0 && item.labelKa.length > 0);
  }
}
for (const icon of Object.values(GAME_ICONS)) assert(icon);
for (const retailer of Object.values(Retailer)) assert.equal(STORE_THEME_BY_RETAILER[retailer], "ELECTRONICS");

/* ---------- registry ---------- */
assert.equal(enabledMinigames().length, MINIGAME_IDS.length, "all four games are registered as enabled");
for (const id of MINIGAME_IDS) {
  const def = MINIGAMES[id];
  assert(def.durationSec > 0 && def.durationSec <= HARD_CAP_SEC, `${id} duration within the 30 s cap`);
  if (def.kind === "SKILL") {
    assert(def.starThresholds !== null, `${id} needs star thresholds`);
    assert(def.fullScore !== null && def.fullScore > 0, `${id} needs a full-score target for the reward`);
    const [a, b, c] = def.starThresholds!;
    assert(a < b && b < c, `${id} thresholds strictly ascending`);
  } else {
    assert.equal(def.starThresholds, null, `${id} (luck) must not have star thresholds`);
    assert.equal(def.fullScore, null, `${id} (luck) has no score-based reward`);
    assert.equal(starsForScore(id, 99999), 0);
  }
}
assert.equal(starsForScore("RECYCLE_CATCH", 0), 0);
assert.equal(starsForScore("RECYCLE_CATCH", 200), 1);
assert.equal(starsForScore("RECYCLE_CATCH", 450), 2);
assert.equal(starsForScore("RECYCLE_CATCH", 750), 3);

/* ---------- pick ---------- */
const base = { theme: "ELECTRONICS" as const, category: ItemCategory.LAPTOP, recentIds: [] as MinigameId[], firstEverReward: false };
assert.equal(pickMinigame({ ...base, sessionId: "any", firstEverReward: true }), SIGNATURE_GAME, "first ever reward is the signature game");
assert.equal(pickMinigame({ ...base, sessionId: "abc" }), pickMinigame({ ...base, sessionId: "abc" }), "deterministic");
const seen = new Set<MinigameId>();
const counts: Record<string, number> = {};
for (let i = 0; i < 4000; i += 1) {
  const id = pickMinigame({ ...base, category: ItemCategory.PHONE, sessionId: `session-${i}` });
  seen.add(id);
  counts[id] = (counts[id] ?? 0) + 1;
}
assert.equal(seen.size, MINIGAME_IDS.length, "every game is reachable");
assert((counts.RECYCLE_CATCH ?? 0) > (counts.PICK_BOX ?? 0) * 1.5, "category affinity doubles the weight");
for (let i = 0; i < 1500; i += 1) {
  const recent: MinigameId[] = [MINIGAME_IDS[i % MINIGAME_IDS.length]!, MINIGAME_IDS[(i + 1) % MINIGAME_IDS.length]!];
  const id = pickMinigame({ ...base, sessionId: `rep-${i}`, recentIds: recent });
  assert(!recent.includes(id), "never repeats the last two games");
}

/* ---------- catch engine ---------- */
const loadout = buildCatchLoadout(electronics, 123);
assert(loadout.items.length <= CATCH_MAX_SLOTS && loadout.items.length >= 8);
assert(loadout.kinds.includes("BONUS"), "the loadout includes the golden bonus item");
assert(loadout.kinds.includes("GOOD") && loadout.kinds.includes("BAD"));

type Bot = "idle" | "good";
function play(seed: number, bot: Bot, stepSec: number): { score: number; ended: string | null; elapsed: number; spawns: number } {
  const lo = buildCatchLoadout(electronics, seed);
  let spawns = 0;
  const engine = createCatchEngine({ seed, kinds: lo.kinds });
  let box = 0.5;
  const wasActive = new Array<boolean>(lo.kinds.length).fill(false);
  while (!engine.ended) {
    if (bot === "good") {
      let target: number | null = null;
      let lowest = -1;
      for (const item of engine.items) {
        if (item.active && !item.passed && item.kind !== "BAD" && item.y > lowest && item.y < 0.9) {
          lowest = item.y;
          target = item.x;
        }
      }
      if (target !== null) box += Math.max(-2.2 * stepSec, Math.min(2.2 * stepSec, target - box));
      for (const item of engine.items) {
        if (item.active && !item.passed && item.kind === "BAD" && item.y > 0.6 && Math.abs(item.x - box) < 0.17) box += (box > item.x ? 1 : -1) * Math.min(0.2, 2.2 * stepSec);
      }
      box = Math.min(1 - BOX_HALF_WIDTH, Math.max(BOX_HALF_WIDTH, box));
    }
    engine.step(stepSec, box);
    engine.items.forEach((item, i) => {
      if (item.active && !wasActive[i]) spawns += 1;
      wasActive[i] = item.active;
    });
  }
  return { score: engine.score, ended: engine.endReason, elapsed: engine.elapsed, spawns };
}
const a = play(99, "idle", 1 / 60);
const b = play(99, "idle", 1 / 60);
assert.deepEqual(a, b, "same seed, same input, same game");
assert.equal(play(99, "idle", 1 / 60).spawns > 0, true);
const fine = play(2024, "idle", 1 / 60);
const coarse = play(2024, "idle", 1 / 30);
assert.equal(fine.spawns, coarse.spawns, "spawn schedule does not depend on frame rate");

let maxIdle = 0;
let oneStar = 0;
let threeStars = 0;
const runs = 24;
for (let seed = 1; seed <= runs; seed += 1) {
  const idle = play(seed * 7919, "idle", 1 / 60);
  maxIdle = Math.max(maxIdle, idle.score);
  assert(idle.score >= 0);
  const skilled = play(seed * 7919, "good", 1 / 60);
  assert(skilled.score >= 0);
  if (skilled.ended === "TIME") assert(Math.abs(skilled.elapsed - CATCH_DURATION_SEC) < 0.05, "a game that survives ends at the duration");
  if (starsForScore("RECYCLE_CATCH", skilled.score) >= 1) oneStar += 1;
  if (starsForScore("RECYCLE_CATCH", skilled.score) === 3) threeStars += 1;
}
assert(maxIdle < MINIGAMES.RECYCLE_CATCH.starThresholds![0], `doing nothing never earns a star (max ${maxIdle})`);
assert(oneStar >= runs * 0.7, `a competent player usually earns a star (${oneStar}/${runs})`);
assert(threeStars >= 1 && threeStars < runs, `three stars is reachable but not guaranteed (${threeStars}/${runs})`);

/* ---------- catch rules: half inside counts, sides never count ---------- */
{
  const kinds = ["GOOD", "BAD"] as const;
  const MOUTH_Y = 0.9;
  const TICK = 1 / 60;
  /** Drops one item at (x, y) and returns the engine after `ticks` fixed steps (under 0.5 s: no random spawns yet). */
  const drop = (kind: 0 | 1, x: number, y: number, boxAt: (tick: number) => number, ticks: number) => {
    const engine = createCatchEngine({ seed: 5, kinds: [...kinds] });
    const item = engine.items[kind]!;
    Object.assign(item, { active: true, x, y, speed: 0.6, passed: false });
    for (let tick = 0; tick < ticks; tick += 1) engine.step(TICK, boxAt(tick), MOUTH_Y);
    return { engine, item };
  };

  const centred = drop(0, 0.5, 0.86, () => 0.5, 20);
  assert.equal(centred.engine.score, 10, "a good item whose centre is over the opening is caught at the rim");

  const justBefore = drop(0, 0.5, 0.8, () => 0.5, 5);
  assert.equal(justBefore.engine.score, 0, "nothing is caught before the item reaches the rim");
  assert(justBefore.item.active, "the item is still falling");

  const insideEdge = drop(0, 0.5 + MOUTH_HALF_WIDTH - 0.004, 0.86, () => 0.5, 20);
  assert.equal(insideEdge.engine.score, 10, "centre just inside the opening still counts");

  const outsideEdge = drop(0, 0.5 + MOUTH_HALF_WIDTH + 0.01, 0.86, () => 0.5, 20);
  assert.equal(outsideEdge.engine.score, 0, "a good item whose centre is beside the opening is not caught");
  assert(outsideEdge.item.passed, "and it is marked as passed");

  const slidUnder = drop(0, 0.7, 0.86, (tick) => (tick < 8 ? 0.4 : 0.7), 25);
  assert.equal(slidUnder.engine.score, 0, "sliding the bin under an item that already passed the rim never catches it");

  const badCentre = drop(1, 0.5, 0.86, () => 0.5, 20);
  assert.equal(badCentre.engine.lives, 2, "a bad item dropped into the bin costs a heart");

  const badSide = drop(1, 0.5 + BOX_HALF_WIDTH, 0.86, () => 0.5, 20);
  assert.equal(badSide.engine.lives, 3, "a bad item touching the side of the bin is not counted");
  assert.equal(badSide.engine.score, 0);

  const badSlide = drop(1, 0.62, 0.86, (tick) => (tick < 6 ? 0.45 : 0.55 + (tick - 6) * 0.02), 22);
  assert.equal(badSlide.engine.lives, 3, "a bad item brushed by the moving bin after the rim is not counted");
}

/* ---------- score-based rewards ---------- */
for (const level of [Level.UNRANKED, Level.BRONZE, Level.GOLD, Level.DIAMOND]) {
  const { min, max } = rewardRangeForLevel(level);
  assert.equal(min, MIN_DISCOUNT_PERCENT);
  assert.equal(max, LEVEL_CONFIG[level].maxDiscountPercent);
  assert.equal(discountForScore(0, 900, level), min, "a zero score earns the floor");
  assert.equal(discountForScore(900, 900, level), max, "the full score earns the level's cap");
  assert.equal(discountForScore(99_999, 900, level), max, "the reward never exceeds the cap");
  let previous = 0;
  for (let score = 0; score <= 900; score += 30) {
    const discount = discountForScore(score, 900, level);
    assert(discount >= previous, "less score never earns more");
    assert(discount >= min && discount <= max);
    previous = discount;
  }
}
assert(discountForScore(450, 900, Level.DIAMOND) < discountForScore(900, 900, Level.DIAMOND), "half the score earns less than the full score");

/* ---------- sky flap engine ---------- */
{
  const TICK = 1 / 60;
  const fresh = (seed: number) => createFlapEngine({ seed, aspect: 0.6 });

  const waiting = fresh(1);
  for (let i = 0; i < 600; i += 1) waiting.step(TICK);
  assert(!waiting.started && !waiting.ended && waiting.birdY === 0.45, "nothing moves until the first tap");

  const idle = fresh(1);
  idle.flap();
  while (!idle.ended) idle.step(TICK);
  assert.equal(idle.score, 0, "flapping once and then doing nothing scores nothing");
  assert.equal(idle.endReason, "CRASH", "and ends in a crash");

  const botRun = (seed: number) => {
    const engine = fresh(seed);
    engine.flap();
    while (!engine.ended) {
      const next = engine.pipes.filter((p) => p.active && p.x + PIPE_WIDTH > engine.birdX - 0.04).sort((a, b) => a.x - b.x)[0];
      const target = next ? next.gapY + 0.03 : 0.5;
      if (engine.birdY > target && engine.birdVy > -0.2) engine.flap();
      engine.step(TICK);
    }
    return { score: engine.score, gap: engine.gap, elapsed: engine.elapsed };
  };
  assert.deepEqual(botRun(77), botRun(77), "same seed, same input, same flight");
  let passing = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const run = botRun(seed * 104729);
    if (run.score >= 3) passing += 1;
    assert(run.elapsed <= FLAP_DURATION_SEC + 0.05, "a flight never outlasts the duration");
  }
  assert(passing >= 18, `a steady player clears a few gates (${passing}/20)`);

  const hard = botRun(104729 * 3);
  assert(hard.gap < 0.31, "the gap narrows as gates are passed");

  // collision: a gate whose gap is far from the bird ends the flight
  const crash = fresh(2);
  Object.assign(crash.pipes[0]!, { active: true, x: crash.birdX - 0.05, gapY: 0.2, passed: false });
  Object.assign(crash, { birdY: 0.7, birdVy: 0, started: true });
  crash.step(TICK * 3);
  assert(crash.ended && crash.endReason === "CRASH", "hitting a pipe ends the flight");

  // scoring: flying through the gap scores exactly one point per gate
  const clear = fresh(3);
  Object.assign(clear.pipes[0]!, { active: true, x: clear.birdX - PIPE_WIDTH - 0.05, gapY: 0.45, passed: false });
  Object.assign(clear, { birdY: 0.45, birdVy: 0, started: true });
  clear.step(TICK * 4);
  assert.equal(clear.score, 1, "a cleared gate scores one point");
  assert(!clear.ended);
  assert(GROUND_Y < 1);
}

/* ---------- reward stage machine ---------- */
const ctx = (overrides: Partial<FlowContext> = {}): FlowContext => ({ alreadyClaimed: false, hasLevelUp: false, hasNewBadges: false, gameKind: "SKILL", skipped: false, ...overrides });
function walk(start: RewardStage, context: FlowContext, until: RewardStage): RewardStage[] {
  const path: RewardStage[] = [start];
  let stage = start;
  while (stage !== until && path.length < 20) {
    stage = nextStage(stage, context);
    path.push(stage);
  }
  return path;
}
assert.deepEqual(walk("IDLE", ctx(), "DONE"), ["IDLE", "VERIFYING", "CONFIRMED", "GAME_INTRO", "PLAYING", "PRIZE_REVEAL", "TICKET", "DONE"]);
assert.deepEqual(walk("IDLE", ctx({ hasLevelUp: true }), "DONE"), ["IDLE", "VERIFYING", "CONFIRMED", "LEVEL_UP", "GAME_INTRO", "PLAYING", "PRIZE_REVEAL", "TICKET", "DONE"]);
assert.deepEqual(walk("IDLE", ctx({ hasLevelUp: true, hasNewBadges: true }), "GAME_INTRO"), ["IDLE", "VERIFYING", "CONFIRMED", "LEVEL_UP", "BADGES", "GAME_INTRO"]);
assert.deepEqual(walk("IDLE", ctx({ gameKind: "LUCK" }), "DONE"), ["IDLE", "VERIFYING", "CONFIRMED", "GAME_INTRO", "PLAYING", "TICKET", "DONE"], "luck games reveal inside the game");
assert.deepEqual(walk("IDLE", ctx({ skipped: true }), "DONE"), ["IDLE", "VERIFYING", "CONFIRMED", "GAME_INTRO", "PLAYING", "TICKET", "DONE"], "skipping goes straight to the ticket");
assert.deepEqual(walk("IDLE", ctx({ alreadyClaimed: true, hasLevelUp: true }), "DONE"), ["IDLE", "VERIFYING", "TICKET", "DONE"], "a replayed claim never celebrates");
assert.equal(nextStage("DONE", ctx()), "IDLE");

/* ---------- arcade storage ---------- */
assert.deepEqual(parseArcade(null), EMPTY_ARCADE);
assert.deepEqual(parseArcade("{not json"), EMPTY_ARCADE);
assert.deepEqual(parseArcade(JSON.stringify({ version: 2 })), EMPTY_ARCADE);
const parsed = parseArcade(JSON.stringify({ version: 1, recentIds: ["CLAW", "NOPE", "WHEEL", "PICK_BOX"], firstRewardDone: true, plays: 3, totalStars: 5, best: { RECYCLE_CATCH: { score: 200, stars: 1 }, BAD: { score: 1, stars: 1 } } }));
assert.deepEqual(parsed.recentIds, ["CLAW", "WHEEL"]);
assert.equal(parsed.best.RECYCLE_CATCH?.score, 200);
assert.equal(Object.keys(parsed.best).length, 1);
let state = withPick(withPick(withPick(EMPTY_ARCADE, "WHEEL"), "CLAW"), "PICK_BOX");
assert.deepEqual(state.recentIds, ["PICK_BOX", "CLAW"]);
assert.equal(state.firstRewardDone, true);
const played: MinigameResult = { stars: 2, score: 300, completed: true, skipped: false, durationMs: 1000 };
state = withResult(state, "RECYCLE_CATCH", played);
assert.equal(state.plays, 1);
assert.equal(state.totalStars, 2);
assert.equal(withResult(state, "RECYCLE_CATCH", { ...played, score: 100, stars: 1 }).best.RECYCLE_CATCH?.score, 300, "best score is kept");
assert.equal(withResult(state, "RECYCLE_CATCH", { ...played, skipped: true }), state, "skipped plays earn nothing");

/* ---------- fairness guard: games never touch the network or the store ---------- */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const forbidden = [/\bfetch\s*\(/, /apiFetch/, /\/api\//, /session-store/, /sendBeacon/, /XMLHttpRequest/, /WebSocket/];
for (const file of [...sourceFiles("components/game"), ...sourceFiles("lib/minigames")]) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbidden) assert(!pattern.test(text), `${file} must not use ${pattern} (a game score must never be sent anywhere)`);
}

console.log("minigames-smoke: all assertions passed");
