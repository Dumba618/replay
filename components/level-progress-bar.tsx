import { LEVEL_CONFIG, type LevelProgress } from "@/types";
import { LEVEL_UI } from "@/lib/ui-maps";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LevelProgressBarProps {
  progress: LevelProgress;
  className?: string;
}

/** "X of Y drop-offs to NEXT_LEVEL" with an animated fill coloured for the current level. */
export function LevelProgressBar({ progress, className }: LevelProgressBarProps) {
  const ui = LEVEL_UI[progress.level];
  const nextLabel = progress.nextLevel ? LEVEL_CONFIG[progress.nextLevel].label : null;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        {nextLabel && progress.nextThreshold !== null ? (
          <p className="font-semibold">
            <span className="font-mono text-base">{progress.dropOffs}</span> of <span className="font-mono text-base">{progress.nextThreshold}</span> drop-offs to{" "}
            <span className="font-bold">{nextLabel}</span>
          </p>
        ) : (
          <p className="font-semibold">
            Top level reached · <span className="font-mono">{progress.dropOffs}</span> drop-offs
          </p>
        )}
        <span className="text-xs font-medium text-muted-foreground">{progress.percent}%</span>
      </div>
      <Progress value={progress.percent} label={nextLabel ? `Progress to ${nextLabel}` : "Top level reached"} indicatorClassName={ui.bar} className="h-3.5" />
    </div>
  );
}
