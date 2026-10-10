"use client";

import { useRef, useState } from "react";
import { FortuneWheel } from "@/components/verify/fortune-wheel";
import { RewardCard } from "@/components/game/minigames/games/RewardCard";
import type { GameProps } from "@/lib/minigames/types";
import { haptic } from "@/lib/haptics";
import { useLang } from "@/lib/i18n";

/** LUCK game: the existing Fortune Wheel. It only animates to the server-chosen segment. */
export default function WheelGame({ prize, mode, onFinish, reducedMotion }: GameProps) {
  const { t } = useLang();
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(performance.now());
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onFinish({ stars: 0, score: 0, completed: true, skipped: false, durationMs: Math.round(performance.now() - startedAt.current) });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-start gap-4 px-4 pt-6">
      <p className="rounded-2xl border-2 border-ink/20 bg-white/80 px-4 py-2 text-center text-sm font-medium text-ink">{t("wheel.hint")}</p>
      <FortuneWheel
        segments={prize.segments}
        targetIndex={prize.segmentIndex}
        reducedMotion={reducedMotion}
        label={t("wheel.spin")}
        onFinished={() => {
          haptic("success");
          setRevealed(true);
        }}
      />
      {revealed && <RewardCard discountPercent={prize.discountPercent} mode={mode} reducedMotion={reducedMotion} onContinue={finish} />}
    </div>
  );
}
