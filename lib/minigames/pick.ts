import type { ItemCategory } from "@/types";
import { enabledMinigames, MINIGAMES } from "@/lib/minigames/registry";
import { hashString, mulberry32 } from "@/lib/minigames/rng";
import type { MinigameId, StoreTheme } from "@/lib/minigames/types";

export interface PickInput {
  readonly theme: StoreTheme;
  readonly category: ItemCategory;
  readonly sessionId: string;
  /** Last two games played on this phone (oldest first or newest first, order is irrelevant). */
  readonly recentIds: readonly MinigameId[];
  readonly firstEverReward: boolean;
  /** Source of randomness in [0, 1). Defaults to a seeded generator from `sessionId` so tests are reproducible; the app passes real randomness. */
  readonly random?: () => number;
}

/** The signature game every player meets first. */
export const SIGNATURE_GAME: MinigameId = "RECYCLE_CATCH";

/**
 * Game choice (client-side only; the server is never involved). Random in the app, reproducible
 * from the session id when no `random` is supplied (tests).
 *  - the very first reward ever is always the signature game,
 *  - games in `recentIds` are skipped while more than 2 games are enabled,
 *  - weights are uniform, doubled for games whose affinity includes the category.
 * `theme` is part of the contract for future theme-specific pools; today every
 * enabled game works with every theme.
 */
export function pickMinigame(input: PickInput): MinigameId {
  const enabled = enabledMinigames();
  if (input.firstEverReward && enabled.includes(SIGNATURE_GAME)) return SIGNATURE_GAME;

  let pool = enabled;
  if (enabled.length > 2) {
    const fresh = enabled.filter((id) => !input.recentIds.includes(id));
    if (fresh.length > 0) pool = fresh;
  }
  const first = pool[0];
  if (first === undefined) throw new Error("No minigame is enabled");

  const weights = pool.map((id) => (MINIGAMES[id].categoryAffinity.includes(input.category) ? 2 : 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const random = input.random ?? mulberry32(hashString(input.sessionId));
  let ticket = random() * total;
  for (let i = 0; i < pool.length; i += 1) {
    ticket -= weights[i] ?? 0;
    if (ticket < 0) return pool[i] ?? first;
  }
  return first;
}
