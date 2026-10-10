import { Award, BatteryCharging, Cable, Crown, Gem, Laptop, Leaf, Medal, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import { Level, type CategoryIcon } from "@/types";

export const CATEGORY_ICONS: Readonly<Record<CategoryIcon, LucideIcon>> = {
  Laptop,
  Smartphone,
  Monitor,
  Cable,
  BatteryCharging,
};

export interface LevelUi {
  readonly icon: LucideIcon;
  /** Solid fill (Tailwind needs the full class name to appear in source). */
  readonly bg: string;
  readonly softBg: string;
  readonly ring: string;
  /** Icon colour with enough contrast on `bg`. */
  readonly onBg: string;
  readonly bar: string;
}

const DARK_ICON = "text-[hsl(215_40%_14%)]";

export const LEVEL_UI: Readonly<Record<Level, LevelUi>> = {
  [Level.UNRANKED]: { icon: Leaf, bg: "bg-level-unranked", softBg: "bg-level-unranked/15", ring: "ring-level-unranked/40", onBg: DARK_ICON, bar: "bg-level-unranked" },
  [Level.BRONZE]: { icon: Medal, bg: "bg-level-bronze", softBg: "bg-level-bronze/15", ring: "ring-level-bronze/40", onBg: "text-white", bar: "bg-level-bronze" },
  [Level.SILVER]: { icon: Medal, bg: "bg-level-silver", softBg: "bg-level-silver/20", ring: "ring-level-silver/50", onBg: DARK_ICON, bar: "bg-level-silver" },
  [Level.GOLD]: { icon: Award, bg: "bg-level-gold", softBg: "bg-level-gold/20", ring: "ring-level-gold/50", onBg: DARK_ICON, bar: "bg-level-gold" },
  [Level.PLATINUM]: { icon: Crown, bg: "bg-level-platinum", softBg: "bg-level-platinum/15", ring: "ring-level-platinum/40", onBg: "text-white", bar: "bg-level-platinum" },
  [Level.DIAMOND]: { icon: Gem, bg: "bg-level-diamond", softBg: "bg-level-diamond/15", ring: "ring-level-diamond/40", onBg: "text-white", bar: "bg-level-diamond" },
};
