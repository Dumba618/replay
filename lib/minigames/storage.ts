import { isMinigameId } from "@/lib/minigames/registry";
import type { MinigameId, MinigameResult } from "@/lib/minigames/types";

/** Phone-only arcade data. Nothing in here is ever sent to the server. */
export const ARCADE_KEY = "replay.arcade.v1";
const RECENT_LIMIT = 2;

export interface ArcadeBest {
  readonly score: number;
  readonly stars: 0 | 1 | 2 | 3;
}

export interface ArcadeState {
  readonly version: 1;
  /** Newest first, at most RECENT_LIMIT entries. */
  readonly recentIds: readonly MinigameId[];
  readonly firstRewardDone: boolean;
  readonly plays: number;
  readonly totalStars: number;
  readonly best: Readonly<Partial<Record<MinigameId, ArcadeBest>>>;
}

export const EMPTY_ARCADE: ArcadeState = { version: 1, recentIds: [], firstRewardDone: false, plays: 0, totalStars: 0, best: {} };

function asStars(value: unknown): 0 | 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

/** Defensive parse: bad or tampered storage falls back to defaults. */
export function parseArcade(raw: string | null): ArcadeState {
  if (!raw) return EMPTY_ARCADE;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.version !== 1) return EMPTY_ARCADE;
    const recentIds = Array.isArray(data.recentIds) ? data.recentIds.filter(isMinigameId).slice(0, RECENT_LIMIT) : [];
    const best: Partial<Record<MinigameId, ArcadeBest>> = {};
    if (typeof data.best === "object" && data.best !== null) {
      for (const [key, value] of Object.entries(data.best as Record<string, unknown>)) {
        if (!isMinigameId(key) || typeof value !== "object" || value === null) continue;
        const entry = value as Record<string, unknown>;
        if (typeof entry.score === "number" && Number.isFinite(entry.score)) best[key] = { score: Math.max(0, Math.floor(entry.score)), stars: asStars(entry.stars) };
      }
    }
    return {
      version: 1,
      recentIds,
      firstRewardDone: data.firstRewardDone === true,
      plays: typeof data.plays === "number" && data.plays >= 0 ? Math.floor(data.plays) : 0,
      totalStars: typeof data.totalStars === "number" && data.totalStars >= 0 ? Math.floor(data.totalStars) : 0,
      best,
    };
  } catch {
    return EMPTY_ARCADE;
  }
}

export function loadArcade(): ArcadeState {
  try {
    return parseArcade(window.localStorage.getItem(ARCADE_KEY));
  } catch {
    return EMPTY_ARCADE;
  }
}

function saveArcade(state: ArcadeState): void {
  try {
    window.localStorage.setItem(ARCADE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode): the arcade simply forgets.
  }
}

/** Pure update used by recordPick. */
export function withPick(state: ArcadeState, id: MinigameId): ArcadeState {
  return { ...state, recentIds: [id, ...state.recentIds.filter((existing) => existing !== id)].slice(0, RECENT_LIMIT), firstRewardDone: true };
}

/** Pure update used by recordResult. Skipped plays earn nothing. */
export function withResult(state: ArcadeState, id: MinigameId, result: MinigameResult): ArcadeState {
  if (result.skipped) return state;
  const previous = state.best[id];
  const better = !previous || result.score > previous.score;
  return {
    ...state,
    plays: state.plays + 1,
    totalStars: state.totalStars + result.stars,
    best: better ? { ...state.best, [id]: { score: result.score, stars: result.stars } } : state.best,
  };
}

/** Remember the chosen game so a reload (or the next reward) never repeats it. */
export function recordPick(id: MinigameId): ArcadeState {
  const next = withPick(loadArcade(), id);
  saveArcade(next);
  return next;
}

export function recordResult(id: MinigameId, result: MinigameResult): ArcadeState {
  const next = withResult(loadArcade(), id, result);
  saveArcade(next);
  return next;
}

/** Reload-resume marker: after a confirmed drop-off a reload goes straight to the ticket. */
export const RESUME_KEY = "replay.resume.v1";

export function setResume(sessionId: string): void {
  try {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify({ sessionId, at: Date.now() }));
  } catch {
    // Without storage a reload simply starts over at the PIN screen.
  }
}

export function getResume(): string | null {
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { sessionId?: unknown };
    return typeof data.sessionId === "string" ? data.sessionId : null;
  } catch {
    return null;
  }
}

export function clearResume(): void {
  try {
    window.localStorage.removeItem(RESUME_KEY);
  } catch {
    // ignore
  }
}
