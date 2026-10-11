import { Bird, Gift, Grab, Recycle, Sparkles, type LucideIcon } from "lucide-react";
import type { GameIconName } from "@/lib/minigames/types";

/** Icons for the game cards. A name missing here fails the `Record<GameIconName, ...>` type check. */
export const GAME_ICONS: Readonly<Record<GameIconName, LucideIcon>> = {
  sparkles: Sparkles,
  recycle: Recycle,
  gift: Gift,
  grab: Grab,
  bird: Bird,
};
