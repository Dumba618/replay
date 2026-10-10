"use client";

import { useEffect, useRef, useState } from "react";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bin } from "@/components/game/minigames/Bin";
import { Scene } from "@/components/game/minigames/Scene";
import { celebrate } from "@/lib/confetti";
import { useLang } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface PrizeRevealProps {
  /** Server-decided reward being displayed (never computed here). */
  discountPercent: number;
  levelColor: string;
  reducedMotion: boolean;
  onContinue: () => void;
}

type Phase = "shaking" | "opening" | "done";

const COUNT_MS = 900;

/** Shared reveal for skill games: the bin shakes, pops, and the reward counts up. */
export function PrizeReveal({ discountPercent, levelColor, reducedMotion, onContinue }: PrizeRevealProps) {
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>(reducedMotion ? "done" : "shaking");
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      if (numberRef.current) numberRef.current.textContent = String(discountPercent);
      return;
    }
    const timer = window.setTimeout(() => setPhase("opening"), 1100);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, discountPercent]);

  useEffect(() => {
    if (phase !== "opening") return;
    haptic("success");
    void celebrate(reducedMotion, "big");
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      if (numberRef.current) numberRef.current.textContent = String(Math.round(discountPercent * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = window.requestAnimationFrame(step);
      else setPhase("done");
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, discountPercent, reducedMotion]);

  const revealed = phase !== "shaking";
  return (
    <section className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 overflow-hidden bg-sky px-6 text-center text-ink anim-fade-in" aria-labelledby="reveal-title">
      <Scene />
      <div className="relative z-10 flex flex-col items-center gap-7">
        <h2 id="reveal-title" className="rounded-full border-[3px] border-ink bg-white px-5 py-1.5 font-display text-sm font-bold uppercase tracking-[0.25em] shadow-[0_4px_0_hsl(var(--ink))]">
          {t("reveal.title")}
        </h2>

        <div className="relative grid h-64 w-64 place-items-center">
          <div className={cn("w-44 transition-transform duration-500", phase === "shaking" && "anim-box-shake", revealed && "translate-y-16 scale-90")}>
            <Bin tint={levelColor} />
          </div>
          <p className={cn("absolute top-2 font-display font-bold leading-none text-primary transition-all duration-500 [text-shadow:0_3px_0_hsl(var(--ink)/0.25)]", revealed ? "scale-100 opacity-100" : "scale-50 opacity-0")} aria-live="polite">
            <span ref={numberRef} className="text-8xl">
              {reducedMotion ? discountPercent : 0}
            </span>
            <span className="text-4xl">% {t("reveal.off")}</span>
          </p>
        </div>

        <p className="max-w-xs rounded-2xl bg-white/90 px-4 py-2 text-sm font-semibold">{t("reveal.set")}</p>
        <Button size="lg" onClick={onContinue} className={cn("transition-opacity duration-300", phase === "done" ? "opacity-100" : "opacity-0")} disabled={phase !== "done"}>
          <Ticket aria-hidden="true" /> {t("reveal.show")}
        </Button>
      </div>
    </section>
  );
}
