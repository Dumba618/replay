import { LEVEL_CONFIG, type Level } from "@/types";
import { LEVEL_UI } from "@/lib/ui-maps";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-8", icon: "size-4", text: "text-sm" },
  md: { box: "size-12", icon: "size-6", text: "text-base" },
  lg: { box: "size-20", icon: "size-10", text: "text-lg" },
  xl: { box: "size-32", icon: "size-16", text: "text-2xl" },
} as const;

interface LevelBadgeProps {
  level: Level;
  size?: keyof typeof SIZES;
  showLabel?: boolean;
  className?: string;
}

export function LevelBadge({ level, size = "md", showLabel = false, className }: LevelBadgeProps) {
  const ui = LEVEL_UI[level];
  const dims = SIZES[size];
  const Icon = ui.icon;
  const label = LEVEL_CONFIG[level].label;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("grid shrink-0 place-items-center rounded-full ring-4 ring-offset-2 ring-offset-card", dims.box, ui.bg, ui.ring, ui.onBg)}>
        <Icon className={dims.icon} aria-hidden="true" />
      </span>
      {showLabel ? <span className={cn("font-bold", dims.text)}>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
