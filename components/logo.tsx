import { Recycle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-lime text-lime-foreground shadow-sm">
        <Recycle className="size-5" aria-hidden="true" />
      </span>
      <span className="text-xl">RePlay</span>
    </span>
  );
}
