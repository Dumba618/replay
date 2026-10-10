import { Recycle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BinProps {
  /** Level tint for the band around the bin (cosmetic). */
  tint: string;
  className?: string;
}

/** Original flat illustration of a recycling bin with a lid, a level-coloured band and wheels. */
export function Bin({ tint, className }: BinProps) {
  return (
    <div className={cn("relative aspect-[5/4] w-full", className)} aria-hidden="true">
      <div className="absolute inset-x-[4%] top-0 h-[22%] rounded-xl border-[3px] border-ink bg-[hsl(102_74%_30%)]" />
      <div className="absolute inset-x-[10%] top-[16%] bottom-[10%] overflow-hidden rounded-b-2xl rounded-t-md border-[3px] border-ink bg-leaf">
        <div className="absolute inset-x-0 bottom-[14%] h-[16%] border-y-[3px] border-ink" style={{ backgroundColor: tint }} />
        <div className="absolute inset-0 grid place-items-center pb-[18%]">
          <Recycle className="size-[46%] text-white drop-shadow-[0_2px_0_hsl(var(--ink)/0.5)]" strokeWidth={2.6} />
        </div>
      </div>
      <div className="absolute bottom-0 left-[16%] size-[14%] rounded-full border-[3px] border-ink bg-white" />
      <div className="absolute bottom-0 right-[16%] size-[14%] rounded-full border-[3px] border-ink bg-white" />
    </div>
  );
}
