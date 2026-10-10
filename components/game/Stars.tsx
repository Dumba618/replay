import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarsProps {
  count: 0 | 1 | 2 | 3;
  className?: string;
}

/** Three stars; earned ones are filled, the rest are outlines (shape, not only colour). */
export function Stars({ count, className }: StarsProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={`${count} / 3`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} className={cn("size-7", n <= count ? "fill-amber text-amber" : "text-muted-foreground/50")} aria-hidden="true" />
      ))}
    </span>
  );
}
