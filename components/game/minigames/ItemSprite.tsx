import { Check, Star, X, Zap } from "lucide-react";
import type { ItemDef } from "@/lib/minigames/types";
import { Sprite } from "@/components/game/minigames/sprites";
import { cn } from "@/lib/utils";

interface ItemSpriteProps {
  item: ItemDef;
  className?: string;
}

const BADGES = {
  GOOD: { cls: "bg-[hsl(145_65%_32%)]", Icon: Check },
  BAD: { cls: "bg-[hsl(0_72%_48%)]", Icon: X },
  BATTERY: { cls: "bg-[hsl(199_94%_42%)]", Icon: Zap },
  BONUS: { cls: "bg-[hsl(34_100%_46%)]", Icon: Star },
} as const;

/**
 * A falling object: the illustrated sprite plus a small round badge (check, cross, bolt or
 * star). Good / bad / power-up / bonus are told apart by the badge shape as well as its colour.
 */
export function ItemSprite({ item, className }: ItemSpriteProps) {
  const badge = BADGES[item.kind];
  return (
    <span className={cn("relative block size-full drop-shadow-[0_4px_0_hsl(var(--ink)/0.18)]", className)} aria-hidden="true">
      <Sprite name={item.icon} />
      <span className={cn("absolute -right-1.5 -top-1.5 grid size-[40%] place-items-center rounded-full border-2 border-white text-white", badge.cls)}>
        <badge.Icon className="size-[66%]" strokeWidth={3.6} />
      </span>
    </span>
  );
}
