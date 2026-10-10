"use client";

import { FastForward, Heart } from "lucide-react";
import type { HudState, MinigameKind } from "@/lib/minigames/types";
import type { StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface HudProps {
  kind: MinigameKind;
  state: HudState;
  remainingSec: number;
  durationSec: number;
  skipVisible: boolean;
  onSkip: () => void;
  t: (key: StringKey) => string;
}

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const CHIP = "border-[3px] border-ink bg-white shadow-[0_4px_0_hsl(var(--ink)/0.25)]";

/** Shared game HUD: timer ring, score, hearts, combo meter and the Skip button. Kept small on purpose. */
export function Hud({ kind, state, remainingSec, durationSec, skipVisible, onSkip, t }: HudProps) {
  const fraction = durationSec > 0 ? Math.max(0, Math.min(1, remainingSec / durationSec)) : 0;
  const seconds = Math.ceil(Math.max(0, remainingSec));
  return (
    <div className="pointer-events-none flex flex-col gap-2 px-4 pt-4 text-ink">
      <div className="flex items-center justify-between gap-3">
        <div className={cn("relative grid size-14 place-items-center rounded-full", CHIP)} role="timer" aria-label={`${seconds} ${t("hud.seconds")}`}>
          <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90 p-0.5" aria-hidden="true">
            <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="hsl(var(--ink) / 0.12)" strokeWidth="4" />
            <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="hsl(var(--azure))" strokeWidth="4" strokeLinecap="round" strokeDasharray={RING_LENGTH} strokeDashoffset={RING_LENGTH * (1 - fraction)} />
          </svg>
          <span className="font-display text-lg font-bold">{seconds}</span>
        </div>

        {kind === "SKILL" ? (
          <div className={cn("rounded-2xl px-5 py-1 text-center", CHIP)} aria-live="off">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink/70">{t("hud.score")}</p>
            <p key={state.score} className="anim-score-pop font-display text-3xl font-bold leading-none text-primary">
              {state.score}
            </p>
          </div>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={onSkip}
          disabled={!skipVisible}
          aria-hidden={!skipVisible}
          tabIndex={skipVisible ? 0 : -1}
          className={cn(
            "pointer-events-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 font-display text-sm font-semibold text-ink transition-opacity duration-200 hover:bg-cream",
            CHIP,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            skipVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <FastForward className="size-4" aria-hidden="true" />
          {t("hud.skip")}
        </button>
      </div>

      {kind === "SKILL" && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-full border-2 border-ink/20 bg-white/85 px-2 py-1" role="img" aria-label={`${t("hud.lives")}: ${state.lives ?? 0} / ${state.maxLives}`}>
            {Array.from({ length: state.maxLives }, (_, index) => {
              const alive = index < (state.lives ?? 0);
              return <Heart key={index} className={cn("size-6 transition-opacity", alive ? "fill-[hsl(0_78%_55%)] text-[hsl(0_78%_55%)]" : "text-ink/40")} aria-hidden="true" />;
            })}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2" role="img" aria-label={`${t("hud.combo")} x${state.multiplier}`}>
            <span className="rounded-full border-2 border-ink bg-sun px-2 py-0.5 font-display text-sm font-bold text-ink">x{state.multiplier}</span>
            <span className="h-3.5 w-28 overflow-hidden rounded-full border-2 border-ink/30 bg-white" aria-hidden="true">
              <span className="block h-full w-full origin-left rounded-full bg-leaf transition-transform duration-150" style={{ transform: `scaleX(${Math.min(1, state.combo / state.comboMax)})` }} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
