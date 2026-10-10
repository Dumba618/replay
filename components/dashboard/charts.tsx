import { cn } from "@/lib/utils";

export interface ChartDatum {
  label: string;
  value: number;
  /** Tailwind background class for the mark, e.g. "bg-level-gold". */
  barClass?: string;
}

interface ColumnChartProps {
  data: readonly ChartDatum[];
  ariaLabel: string;
  unit: string;
  className?: string;
}

/** Vertical columns with the value printed above each mark (never colour-only). */
export function ColumnChart({ data, ariaLabel, unit, className }: ColumnChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${d.value} ${unit}`).join(", ")}`} className={cn("flex h-44 items-end gap-1.5", className)}>
      {data.map((datum) => (
        <div key={datum.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5">
          <span className="text-center font-mono text-[11px] font-semibold text-muted-foreground">{datum.value > 0 ? datum.value : ""}</span>
          <div
            className={cn("w-full rounded-t-md transition-[height] duration-500", datum.barClass ?? "bg-primary", datum.value === 0 && "opacity-30")}
            style={{ height: `${Math.max(datum.value === 0 ? 2 : 6, (datum.value / max) * 82)}%` }}
          />
          <span className="truncate text-center text-[10px] text-muted-foreground">{datum.label}</span>
        </div>
      ))}
    </div>
  );
}

interface HorizontalBarsProps {
  data: readonly ChartDatum[];
  ariaLabel: string;
  unit: string;
}

/** Labelled horizontal bars with an explicit count column. */
export function HorizontalBars({ data, ariaLabel, unit }: HorizontalBarsProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {data.map((datum) => (
        <li key={datum.label} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate font-medium">{datum.label}</span>
          <span className="h-3.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
            <span className={cn("block h-full rounded-full transition-[width] duration-500", datum.barClass ?? "bg-primary")} style={{ width: `${(datum.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono font-semibold">
            {datum.value}
            <span className="sr-only"> {unit}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
