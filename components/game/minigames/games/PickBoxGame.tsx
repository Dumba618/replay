"use client";

import { useEffect, useRef, useState } from "react";
import { RewardCard } from "@/components/game/minigames/games/RewardCard";
import { Sprite } from "@/components/game/minigames/sprites";
import type { GameProps, SpriteName } from "@/lib/minigames/types";
import { haptic } from "@/lib/haptics";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DEVICES: readonly SpriteName[] = ["laptop", "smartphone", "headphones"];
const OPEN_DELAY_MS = 800;

/**
 * LUCK game ("Pick a Device"). It looks like a choice, but the reward is already set: whichever
 * device the player taps shows the server-decided discount. The intro and the
 * "How rewards work" sheet say so.
 */
export default function PickBoxGame({ prize, mode, onFinish, reducedMotion }: GameProps) {
  const { t } = useLang();
  const [picked, setPicked] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const startedAt = useRef(performance.now());
  const done = useRef(false);

  useEffect(() => {
    if (picked === null) return;
    const timer = window.setTimeout(() => {
      setOpened(true);
      haptic("success");
    }, reducedMotion ? 0 : OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [picked, reducedMotion]);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onFinish({ stars: 0, score: 0, completed: true, skipped: false, durationMs: Math.round(performance.now() - startedAt.current) });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center gap-6 px-4 pt-6">
      <p className="max-w-xs rounded-2xl border-2 border-ink/20 bg-white/90 px-4 py-2 text-center text-sm font-semibold text-ink">{t("pick.hint")}</p>
      <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3">
        {DEVICES.map((sprite, index) => {
          const isPicked = picked === index;
          return (
            <div key={sprite} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "grid h-12 min-w-14 place-items-center rounded-2xl border-[3px] border-ink bg-white px-3 font-display text-xl font-bold shadow-[0_4px_0_hsl(var(--ink)/0.25)] transition-transform duration-300",
                  isPicked && opened ? "scale-125 text-primary" : "text-ink",
                )}
                aria-live="polite"
              >
                {isPicked && opened ? (mode === "REWARD" ? `${prize.discountPercent}%` : "-") : "?"}
              </div>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => {
                  haptic("tap");
                  setPicked(index);
                }}
                aria-label={`${t("pick.box")} ${index + 1}`}
                className={cn(
                  "relative aspect-square w-full min-h-24 cursor-pointer rounded-3xl border-[3px] border-ink bg-white/85 p-2 shadow-[0_5px_0_hsl(var(--ink)/0.25)] transition-opacity duration-300",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
                  isPicked && !reducedMotion && !opened && "anim-wiggle",
                  isPicked && !reducedMotion && opened && "anim-hop",
                  picked !== null && !isPicked && "opacity-40",
                )}
              >
                <Sprite name={sprite} />
              </button>
            </div>
          );
        })}
      </div>
      {opened && <RewardCard discountPercent={prize.discountPercent} mode={mode} reducedMotion={reducedMotion} onContinue={finish} />}
    </div>
  );
}
