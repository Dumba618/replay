import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  label: string;
  className?: string;
  indicatorClassName?: string;
}

/** Accessible progress bar; the fill animates with a CSS width transition. */
export function Progress({ value, max = 100, label, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const percent = max === 0 ? 0 : (clamped / max) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className={cn("h-3 w-full overflow-hidden rounded-full border-2 border-ink/25 bg-white", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", indicatorClassName ?? "bg-primary")} style={{ width: `${percent}%` }} />
    </div>
  );
}
