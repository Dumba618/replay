import type { MinigameKind } from "@/lib/minigames/types";

/**
 * Customer reward flow (replaces WHEEL_READY -> SPINNING -> REVEAL):
 * IDLE -> VERIFYING -> CONFIRMED -> LEVEL_UP? -> BADGES? -> GAME_INTRO -> PLAYING
 *      -> PRIZE_REVEAL (skill games, not skipped) -> TICKET -> DONE
 * BADGES is part of the machine but RePlay has no badge system yet, so
 * `hasNewBadges` is always false today.
 */
export type RewardStage =
  | "IDLE"
  | "VERIFYING"
  | "CONFIRMED"
  | "LEVEL_UP"
  | "BADGES"
  | "GAME_INTRO"
  | "PLAYING"
  | "PRIZE_REVEAL"
  | "TICKET"
  | "DONE";

export interface FlowContext {
  /** Replay of an earlier claim: no celebrations, straight to the ticket. */
  readonly alreadyClaimed: boolean;
  readonly hasLevelUp: boolean;
  readonly hasNewBadges: boolean;
  readonly gameKind: MinigameKind | null;
  /** True when the player skipped, or the hard cap ended the game early. */
  readonly skipped: boolean;
}

/** Next stage after `current`. Pure so it can be tested without React. */
export function nextStage(current: RewardStage, ctx: FlowContext): RewardStage {
  switch (current) {
    case "IDLE":
      return "VERIFYING";
    case "VERIFYING":
      return ctx.alreadyClaimed ? "TICKET" : "CONFIRMED";
    case "CONFIRMED":
      return ctx.hasLevelUp ? "LEVEL_UP" : ctx.hasNewBadges ? "BADGES" : "GAME_INTRO";
    case "LEVEL_UP":
      return ctx.hasNewBadges ? "BADGES" : "GAME_INTRO";
    case "BADGES":
      return "GAME_INTRO";
    case "GAME_INTRO":
      return "PLAYING";
    case "PLAYING":
      return ctx.gameKind === "SKILL" && !ctx.skipped ? "PRIZE_REVEAL" : "TICKET";
    case "PRIZE_REVEAL":
      return "TICKET";
    case "TICKET":
      return "DONE";
    case "DONE":
      return "IDLE";
  }
}
