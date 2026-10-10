import { mulberry32, shuffled } from "@/lib/minigames/rng";
import type { ItemDef, ThemeDef } from "@/lib/minigames/types";

/**
 * Pure, allocation-free simulation behind Recycle Catch. All coordinates are
 * normalised to the play field: x in [0, 1] of its width, y in [0, 1] of its
 * height, speeds in field-heights per second, so every phone behaves the same.
 * A fixed 60 Hz timestep makes the spawn schedule identical for a given seed
 * whatever the device's frame rate. Difficulty depends on elapsed time only,
 * never on the player's level.
 */

export type SlotKind = "GOOD" | "BAD" | "BATTERY" | "BONUS";
export type CatchEventType = "GOOD" | "BAD" | "BATTERY" | "BONUS" | "LIFE" | "MISSED_GOOD";

export const CATCH_DURATION_SEC = 25;
export const CATCH_MAX_LIVES = 3;
export const CATCH_MAX_SLOTS = 16;
export const CATCH_COMBO_BAR = 12;
/** Half the bin's drawn width, as a fraction of the field width (bin = 18% of the field). */
export const BOX_HALF_WIDTH = 0.09;
/** Half the width of the bin's opening. An object is caught only if its centre is inside it. */
export const MOUTH_HALF_WIDTH = 0.075;
export const ITEM_HALF_WIDTH = 0.05;
/** Default height of the bin's rim (fraction of the field height); the game passes the real one. */
export const DEFAULT_MOUTH_Y = 0.9;

const FIXED_STEP = 1 / 60;
const FLOOR_Y = 1.08;
const SPAWN_Y = -0.08;
const GOOD_POINTS = 10;
const BATTERY_BONUS_POINTS = 25;
const MAX_MULTIPLIER = 3;
const BATTERY_CHANCE = 0.06;
const BONUS_CHANCE = 0.05;
const BONUS_MULTIPLE = 5;
const BAD_CHANCE = 0.3;

export interface CatchLoadout {
  /** Item per pool slot; slot i is rendered once and re-used for the whole game. */
  readonly items: readonly ItemDef[];
  readonly kinds: readonly SlotKind[];
}

/** Picks a seeded subset of the theme so the pool never exceeds CATCH_MAX_SLOTS. */
export function buildCatchLoadout(theme: ThemeDef, seed: number): CatchLoadout {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const goods = shuffled(theme.good, rng).slice(0, 7);
  const bads = shuffled(theme.bad, rng).slice(0, 5);
  const batteries = shuffled(theme.batteries, rng).slice(0, 2);
  const bonuses = shuffled(theme.bonus, rng).slice(0, 1);
  const items = [...goods, ...bads, ...batteries, ...bonuses].slice(0, CATCH_MAX_SLOTS);
  return { items, kinds: items.map((item): SlotKind => item.kind) };
}

export interface CatchItem {
  active: boolean;
  readonly kind: SlotKind;
  x: number;
  y: number;
  speed: number;
  /** Cosmetic wobble phase in radians. */
  wobble: number;
  /** True once the object fell past the bin's rim without being inside the opening: it can no longer be caught. */
  passed: boolean;
}

export interface CatchEngine {
  readonly items: CatchItem[];
  readonly score: number;
  readonly lives: number;
  readonly combo: number;
  readonly maxCombo: number;
  readonly multiplier: number;
  readonly elapsed: number;
  readonly ended: boolean;
  readonly endReason: "TIME" | "LIVES" | null;
  /** Advance by `dtSec` with the bin centred at `boxX` and its rim at `mouthY` (fraction of field height). */
  step: (dtSec: number, boxX: number, mouthY?: number) => void;
}

export interface CatchEngineOptions {
  readonly seed: number;
  readonly kinds: readonly SlotKind[];
  readonly durationSec?: number;
  readonly onEvent?: (type: CatchEventType, slot: number) => void;
}

export function multiplierForCombo(combo: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / 4));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

export function createCatchEngine(options: CatchEngineOptions): CatchEngine {
  const duration = options.durationSec ?? CATCH_DURATION_SEC;
  const rng = mulberry32(options.seed);
  const items: CatchItem[] = options.kinds.map((kind) => ({ active: false, kind, x: 0.5, y: SPAWN_Y, speed: 0.4, wobble: 0, passed: false }));
  const slotsByKind: Record<SlotKind, number[]> = { GOOD: [], BAD: [], BATTERY: [], BONUS: [] };
  options.kinds.forEach((kind, index) => slotsByKind[kind].push(index));
  const emit = options.onEvent;

  let accumulator = 0;
  let nextSpawn = 0.5;

  const state = {
    items,
    score: 0,
    lives: CATCH_MAX_LIVES,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    elapsed: 0,
    ended: false,
    endReason: null as "TIME" | "LIVES" | null,
  };

  const rollKind = (): SlotKind => {
    const roll = rng();
    if (roll < BONUS_CHANCE && slotsByKind.BONUS.length > 0) return "BONUS";
    if (roll < BONUS_CHANCE + BATTERY_CHANCE && slotsByKind.BATTERY.length > 0) return "BATTERY";
    if (roll < BONUS_CHANCE + BATTERY_CHANCE + BAD_CHANCE && slotsByKind.BAD.length > 0) return "BAD";
    return slotsByKind.GOOD.length > 0 ? "GOOD" : "BAD";
  };

  const spawn = (progress: number): boolean => {
    const kind = rollKind();
    const slots = slotsByKind[kind];
    if (slots.length === 0) return true;
    const offset = Math.floor(rng() * slots.length);
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[(offset + i) % slots.length] as number;
      const item = items[slot] as CatchItem;
      if (item.active) continue;
      item.active = true;
      item.x = 0.1 + 0.8 * rng();
      item.y = SPAWN_Y;
      item.speed = lerp(0.38, 0.62, progress) * (0.92 + 0.16 * rng());
      item.wobble = rng() * Math.PI * 2;
      item.passed = false;
      return true;
    }
    return false;
  };

  const tick = (boxX: number, mouthY: number): void => {
    state.elapsed += FIXED_STEP;
    const progress = state.elapsed / duration;
    if (state.elapsed >= duration) {
      state.ended = true;
      state.endReason = "TIME";
      return;
    }

    nextSpawn -= FIXED_STEP;
    if (nextSpawn <= 0) {
      if (spawn(progress)) nextSpawn = lerp(0.95, 0.55, progress) * (0.85 + 0.3 * rng());
      else nextSpawn = 0.1;
    }

    for (let slot = 0; slot < items.length; slot += 1) {
      const item = items[slot] as CatchItem;
      if (!item.active) continue;
      const previousY = item.y;
      item.y += item.speed * FIXED_STEP;
      item.wobble += FIXED_STEP * 4;

      // Caught only at the moment half of the object (its centre) sinks past the rim while that centre
      // is inside the opening. Anything touching the bin's sides, or arriving after the rim, just falls by.
      const crossedRim = !item.passed && previousY < mouthY && item.y >= mouthY;
      const caught = crossedRim && Math.abs(item.x - boxX) <= MOUTH_HALF_WIDTH;
      if (crossedRim && !caught) item.passed = true;
      if (caught) {
        item.active = false;
        if (item.kind === "GOOD" || item.kind === "BONUS") {
          state.score += GOOD_POINTS * state.multiplier * (item.kind === "BONUS" ? BONUS_MULTIPLE : 1);
          state.combo += 1;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          state.multiplier = multiplierForCombo(state.combo);
          emit?.(item.kind === "BONUS" ? "BONUS" : "GOOD", slot);
        } else if (item.kind === "BAD") {
          state.lives -= 1;
          state.combo = 0;
          state.multiplier = 1;
          emit?.("BAD", slot);
          if (state.lives <= 0) {
            state.ended = true;
            state.endReason = "LIVES";
            return;
          }
        } else if (state.lives < CATCH_MAX_LIVES) {
          state.lives += 1;
          emit?.("LIFE", slot);
        } else {
          state.score += BATTERY_BONUS_POINTS;
          emit?.("BATTERY", slot);
        }
      } else if (item.y > FLOOR_Y) {
        item.active = false;
        if (item.kind === "GOOD") {
          state.combo = 0;
          state.multiplier = 1;
          emit?.("MISSED_GOOD", slot);
        }
      }
    }
  };

  return Object.assign(state, {
    step(dtSec: number, boxX: number, mouthY: number = DEFAULT_MOUTH_Y): void {
      if (state.ended) return;
      accumulator += Math.min(0.05, Math.max(0, dtSec));
      while (accumulator >= FIXED_STEP && !state.ended) {
        accumulator -= FIXED_STEP;
        tick(boxX, mouthY);
      }
    },
  });
}
