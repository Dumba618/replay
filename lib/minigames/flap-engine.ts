import { mulberry32 } from "@/lib/minigames/rng";

/**
 * Pure, allocation-free simulation behind Sky Flap (tap to flap through gates). The mechanics are the
 * classic gravity-plus-flap loop; every number, the bird and the gates are RePlay's own.
 *
 * Units: y is a fraction of the field height (0 = top, 1 = bottom); x is measured in field heights too,
 * so the world keeps its proportions on any phone, with `aspect` = field width / field height.
 * A fixed 60 Hz step keeps results independent of the frame rate. Difficulty rises with the gates
 * passed (faster scroll, narrower gaps) and never depends on the player's level.
 */

export const FLAP_DURATION_SEC = 29;
export const FLAP_POOL = 5;
export const BIRD_RADIUS = 0.034;
export const PIPE_WIDTH = 0.15;
export const GROUND_Y = 0.92;

const FIXED_STEP = 1 / 60;
const GRAVITY = 2.7; // field heights per second squared
const FLAP_VELOCITY = -0.86; // field heights per second (upwards)
const MAX_FALL_SPEED = 1.35;
const FIRST_PIPE_DELAY = 1.1; // seconds before the first gate arrives
const EDGE_MARGIN = 0.07;

export interface FlapPipe {
  active: boolean;
  /** Left edge, in field heights. */
  x: number;
  /** Centre of the gap (fraction of the field height). */
  gapY: number;
  passed: boolean;
}

export interface FlapEngine {
  readonly pipes: FlapPipe[];
  readonly birdX: number;
  readonly birdY: number;
  readonly birdVy: number;
  readonly score: number;
  /** False until the first flap: the bird hovers and nothing moves, so the player is never caught off guard. */
  readonly started: boolean;
  readonly elapsed: number;
  readonly gap: number;
  readonly ended: boolean;
  readonly endReason: "CRASH" | "TIME" | null;
  /** Gives the bird an upward kick. */
  flap: () => void;
  step: (dtSec: number) => void;
}

export interface FlapEngineOptions {
  readonly seed: number;
  /** Field width divided by its height (about 0.5-0.7 on a phone). */
  readonly aspect: number;
  readonly durationSec?: number;
  readonly onEvent?: (type: "FLAP" | "POINT" | "CRASH") => void;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

/** 0 at the start, 1 once 18 gates have been passed. */
function difficulty(score: number): number {
  return Math.min(1, score / 18);
}

export function createFlapEngine(options: FlapEngineOptions): FlapEngine {
  const duration = options.durationSec ?? FLAP_DURATION_SEC;
  const rng = mulberry32(options.seed);
  const aspect = Math.max(0.3, options.aspect);
  const birdX = aspect * 0.3;
  const emit = options.onEvent;
  const pipes: FlapPipe[] = Array.from({ length: FLAP_POOL }, () => ({ active: false, x: aspect + PIPE_WIDTH, gapY: 0.5, passed: false }));
  let nextSpawnIn = FIRST_PIPE_DELAY;
  let accumulator = 0;

  const state = { pipes, birdX, birdY: 0.45, birdVy: 0, score: 0, started: false, elapsed: 0, gap: 0.31, ended: false, endReason: null as "CRASH" | "TIME" | null };

  const finish = (reason: "CRASH" | "TIME"): void => {
    state.ended = true;
    state.endReason = reason;
    if (reason === "CRASH") emit?.("CRASH");
  };

  const spawn = (): void => {
    const d = difficulty(state.score);
    state.gap = lerp(0.31, 0.215, d);
    for (const pipe of pipes) {
      if (pipe.active) continue;
      const low = state.gap / 2 + EDGE_MARGIN;
      const high = GROUND_Y - state.gap / 2 - EDGE_MARGIN;
      pipe.active = true;
      pipe.passed = false;
      pipe.x = aspect;
      pipe.gapY = low + rng() * (high - low);
      return;
    }
  };

  const tick = (): void => {
    state.elapsed += FIXED_STEP;
    if (state.elapsed >= duration) return finish("TIME");
    const d = difficulty(state.score);
    const scroll = lerp(0.36, 0.62, d);

    state.birdVy = Math.min(MAX_FALL_SPEED, state.birdVy + GRAVITY * FIXED_STEP);
    state.birdY += state.birdVy * FIXED_STEP;
    if (state.birdY < BIRD_RADIUS) {
      state.birdY = BIRD_RADIUS;
      if (state.birdVy < 0) state.birdVy = 0;
    }
    if (state.birdY + BIRD_RADIUS >= GROUND_Y) {
      state.birdY = GROUND_Y - BIRD_RADIUS;
      return finish("CRASH");
    }

    nextSpawnIn -= FIXED_STEP;
    if (nextSpawnIn <= 0) {
      spawn();
      nextSpawnIn = (lerp(0.66, 0.5, d) * (0.92 + 0.16 * rng()) + PIPE_WIDTH) / scroll;
    }

    for (const pipe of pipes) {
      if (!pipe.active) continue;
      pipe.x -= scroll * FIXED_STEP;
      if (pipe.x + PIPE_WIDTH < -0.05) {
        pipe.active = false;
        continue;
      }
      const overlapsX = birdX + BIRD_RADIUS > pipe.x && birdX - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
      if (overlapsX) {
        const gapTop = pipe.gapY - state.gap / 2;
        const gapBottom = pipe.gapY + state.gap / 2;
        if (state.birdY - BIRD_RADIUS < gapTop || state.birdY + BIRD_RADIUS > gapBottom) return finish("CRASH");
      }
      if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX - BIRD_RADIUS) {
        pipe.passed = true;
        state.score += 1;
        emit?.("POINT");
      }
    }
  };

  return Object.assign(state, {
    flap(): void {
      if (state.ended) return;
      state.started = true;
      state.birdVy = FLAP_VELOCITY;
      emit?.("FLAP");
    },
    step(dtSec: number): void {
      if (state.ended || !state.started) return;
      accumulator += Math.min(0.05, Math.max(0, dtSec));
      while (accumulator >= FIXED_STEP && !state.ended) {
        accumulator -= FIXED_STEP;
        tick();
      }
    },
  });
}
