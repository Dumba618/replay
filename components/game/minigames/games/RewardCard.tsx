"use client";

import { useEffect } from "react";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { celebrate } from "@/lib/confetti";
import { useLang } from "@/lib/i18n";

interface RewardCardProps {
  discountPercent: number;
  mode: "REWARD" | "PRACTICE";
  reducedMotion?: boolean;
  onContinue: () => void;
}

/** Result panel shared by the luck games: shows the reward that was ALREADY decided. */
export function RewardCard({ discountPercent, mode, reducedMotion = false, onContinue }: RewardCardProps) {
  const { t } = useLang();
  useEffect(() => {
    if (mode === "REWARD") void celebrate(reducedMotion);
  }, [mode, reducedMotion]);
  return (
    <div className="anim-sheet-up absolute inset-x-4 bottom-6 z-10 rounded-3xl border-[3px] border-ink bg-white p-5 text-center text-ink shadow-[0_6px_0_hsl(var(--ink))]" role="status">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink/70">{t("reveal.title")}</p>
      {mode === "REWARD" ? (
        <p className="mt-1 font-display text-6xl font-bold leading-none text-primary">
          {discountPercent}
          <span className="text-3xl">% {t("reveal.off")}</span>
        </p>
      ) : (
        <p className="mt-2 font-display text-xl font-bold">{t("reveal.practice")}</p>
      )}
      <p className="mt-2 text-xs font-medium text-ink/70">{mode === "REWARD" ? t("reveal.set") : ""}</p>
      <Button size="lg" className="mt-4 w-full" onClick={onContinue}>
        <Ticket aria-hidden="true" /> {mode === "REWARD" ? t("reveal.show") : t("me.close")}
      </Button>
    </div>
  );
}
