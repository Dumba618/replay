import type { ItemCategory, Level, WheelSegment } from "@/types";

export type MinigameId = "WHEEL" | "RECYCLE_CATCH" | "PICK_BOX" | "CLAW";
export type MinigameKind = "SKILL" | "LUCK";
export type StoreTheme = "ELECTRONICS" | "SUPERMARKET";

/** Names of the illustrated sprites drawn in `components/game/minigames/sprites.tsx`. */
export const SPRITE_NAMES = [
  "laptop",
  "smartphone",
  "monitor",
  "headphones",
  "camera",
  "controller",
  "speaker",
  "charger",
  "banana",
  "apple",
  "carrot",
  "pizza",
  "soda",
  "egg",
  "battery",
  "battery-green",
  "star",
  "milk",
] as const;

export type SpriteName = (typeof SPRITE_NAMES)[number];

/** Icons used by the game chrome and registry cards. */
export type GameIconName = "sparkles" | "recycle" | "gift" | "grab";

export type ItemKind = "GOOD" | "BAD" | "BATTERY" | "BONUS";

export interface ItemDef {
  readonly id: string;
  readonly labelKa: string;
  readonly labelEn: string;
  readonly icon: SpriteName;
  readonly kind: ItemKind;
}

export interface ThemeDef {
  readonly id: StoreTheme;
  readonly labelKa: string;
  readonly labelEn: string;
  readonly good: readonly ItemDef[];
  readonly bad: readonly ItemDef[];
  /** Power-up items (a caught battery restores a heart). May be empty. */
  readonly batteries: readonly ItemDef[];
  /** Rare golden bonus items worth five times a normal catch. May be empty. */
  readonly bonus: readonly ItemDef[];
  readonly boxLabelKa: string;
  readonly boxLabelEn: string;
}

export interface MinigameResult {
  /** Cosmetic only. Always 0 for luck games. */
  readonly stars: 0 | 1 | 2 | 3;
  readonly score: number;
  readonly completed: boolean;
  readonly skipped: boolean;
  readonly durationMs: number;
}

export interface MinigameProps {
  readonly theme: ThemeDef;
  readonly level: Level;
  /** CSS colour (hsl var) used to tint the skin. Cosmetic; difficulty never depends on level. */
  readonly levelColor: string;
  /** Already decided by the server. A game may only DISPLAY it. */
  readonly prize: {
    readonly discountPercent: number;
    readonly segmentIndex: number;
    readonly segments: readonly WheelSegment[];
  };
  readonly seed: number;
  readonly mode: "REWARD" | "PRACTICE";
  readonly reducedMotion: boolean;
  /** Called EXACTLY ONCE per play; afterwards the host owns the screen. */
  readonly onFinish: (result: MinigameResult) => void;
}

export interface HudState {
  readonly score: number;
  /** Lives left, or null when the game has no lives. */
  readonly lives: number | null;
  readonly maxLives: number;
  readonly combo: number;
  readonly comboMax: number;
  readonly multiplier: number;
}

/** Controls the host gives each game for the shared HUD. */
export interface HudControls {
  readonly update: (patch: Partial<HudState>) => void;
}

export type GameProps = MinigameProps & { readonly hud: HudControls };

export interface MinigameDef {
  readonly id: MinigameId;
  readonly enabled: boolean;
  readonly kind: MinigameKind;
  readonly labelKa: string;
  readonly labelEn: string;
  readonly descKa: string;
  readonly descEn: string;
  readonly icon: GameIconName;
  /** Nominal duration; never above HARD_CAP_SEC. */
  readonly durationSec: number;
  /** Strictly ascending score thresholds for 1, 2 and 3 stars. SKILL games only. */
  readonly starThresholds: readonly [number, number, number] | null;
  readonly categoryAffinity: readonly ItemCategory[];
}
