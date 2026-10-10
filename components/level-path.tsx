import { Check, Lock } from "lucide-react";
import { LEVEL_CONFIG, LEVEL_ORDER, type LevelProgress } from "@/types";
import { LEVEL_UI } from "@/lib/ui-maps";
import { LevelProgressBar } from "@/components/level-progress-bar";
import { cn } from "@/lib/utils";

interface LevelPathProps {
  progress: LevelProgress;
  className?: string;
}

/** The six levels as a path: finished steps are ticked, the current step is highlighted, the rest are locked. */
export function LevelPath({ progress, className }: LevelPathProps) {
  const currentIndex = LEVEL_ORDER.indexOf(progress.level);
  return (
    <div className={cn("space-y-4", className)}>
      <ol className="relative flex items-center justify-between" aria-label="Levels">
        <span className="absolute inset-x-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/15" aria-hidden="true" />
        <span className="absolute left-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-leaf transition-[width] duration-700" style={{ width: `calc((100% - 2.5rem) * ${currentIndex / (LEVEL_ORDER.length - 1)})` }} aria-hidden="true" />
        {LEVEL_ORDER.map((level, index) => {
          const ui = LEVEL_UI[level];
          const Icon = ui.icon;
          const done = index < currentIndex;
          const current = index === currentIndex;
          return (
            <li key={level} className="relative z-10 flex flex-col items-center gap-1" aria-current={current ? "step" : undefined}>
              <span
                className={cn(
                  "grid place-items-center rounded-full border-[3px] border-ink transition-all",
                  current ? cn("size-12 shadow-[0_4px_0_hsl(var(--ink))]", ui.bg, ui.onBg) : done ? "size-9 bg-leaf text-white" : "size-9 bg-white text-ink/40",
                )}
              >
                {current ? <Icon className="size-6" aria-hidden="true" /> : done ? <Check className="size-4" strokeWidth={3.5} aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
              </span>
              <span className={cn("text-[10px] font-bold leading-none", current ? "text-ink" : "text-ink/60")}>{LEVEL_CONFIG[level].label}</span>
            </li>
          );
        })}
      </ol>
      <LevelProgressBar progress={progress} />
    </div>
  );
}
