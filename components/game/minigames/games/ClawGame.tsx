"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Grab } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RewardCard } from "@/components/game/minigames/games/RewardCard";
import { Sprite } from "@/components/game/minigames/sprites";
import { useGameLoop } from "@/components/game/minigames/useGameLoop";
import type { GameProps, SpriteName } from "@/lib/minigames/types";
import { haptic } from "@/lib/haptics";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Phase = "aim" | "drop" | "lift" | "open";

const PRIZES: readonly SpriteName[] = ["smartphone", "headphones", "camera", "controller", "speaker"];
const CLAW_SPEED = 0.55; // field widths per second
const PIT_HEIGHT_PX = 120;
const DROP_MS = 750;
const LIFT_MS = 650;

function prizeX(index: number): number {
  return 0.1 + index * 0.2;
}

/** Original flat claw illustration: rod, hub and two curved prongs that close when grabbing. */
function ClawArt({ closed }: { closed: boolean }) {
  return (
    <svg viewBox="0 0 48 64" className="h-16 w-12 overflow-visible" aria-hidden="true">
      <g stroke="hsl(var(--ink))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="21" y="0" width="6" height="22" fill="hsl(var(--ink))" />
        <rect x="12" y="20" width="24" height="12" rx="5" fill="hsl(var(--sun))" />
        <path d={closed ? "M16 32 C16 46 22 52 24 56" : "M16 32 C8 42 6 52 8 58"} fill="none" strokeWidth="5" />
        <path d={closed ? "M32 32 C32 46 26 52 24 56" : "M32 32 C40 42 42 52 40 58"} fill="none" strokeWidth="5" />
      </g>
    </svg>
  );
}

/**
 * LUCK game. The claw is cosmetic: whichever gadget it lifts opens to the
 * reward that was already decided by the server.
 */
export default function ClawGame({ prize, mode, onFinish, reducedMotion }: GameProps) {
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>("aim");
  const [grabbed, setGrabbed] = useState<number | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const clawRef = useRef<HTMLDivElement>(null);
  const clawX = useRef(0.5);
  const heldDir = useRef<-1 | 0 | 1>(0);
  const startedAt = useRef(performance.now());
  const done = useRef(false);
  const timers = useRef<number[]>([]);

  const place = (x: number, y: number, animate: boolean, ms: number) => {
    const claw = clawRef.current;
    const field = fieldRef.current;
    if (!claw || !field) return;
    claw.style.transition = animate && !reducedMotion ? `transform ${ms}ms ease-in-out` : "none";
    claw.style.transform = `translate3d(${x * field.clientWidth - 24}px,${y}px,0)`;
  };

  useEffect(() => {
    place(clawX.current, 0, false, 0);
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useGameLoop((dt) => {
    if (phase !== "aim" || heldDir.current === 0) return;
    clawX.current = Math.min(0.9, Math.max(0.1, clawX.current + heldDir.current * CLAW_SPEED * dt));
    place(clawX.current, 0, false, 0);
  }, phase === "aim");

  const grab = () => {
    if (phase !== "aim") return;
    const field = fieldRef.current;
    if (!field) return;
    haptic("tap");
    const index = Math.min(PRIZES.length - 1, Math.max(0, Math.round((clawX.current - 0.1) / 0.2)));
    clawX.current = prizeX(index);
    setGrabbed(index);
    setPhase("drop");
    const dropY = Math.max(40, field.clientHeight - PIT_HEIGHT_PX - 56);
    place(clawX.current, dropY, true, DROP_MS);
    const dropTime = reducedMotion ? 0 : DROP_MS;
    const liftTime = reducedMotion ? 0 : LIFT_MS;
    timers.current.push(
      window.setTimeout(() => {
        setPhase("lift");
        place(clawX.current, 0, true, LIFT_MS);
      }, dropTime + 80),
      window.setTimeout(() => {
        setPhase("open");
        haptic("success");
      }, dropTime + liftTime + 160),
    );
  };

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onFinish({ stars: 0, score: 0, completed: true, skipped: false, durationMs: Math.round(performance.now() - startedAt.current) });
  };

  const steer = (dir: -1 | 0 | 1) => () => {
    heldDir.current = dir;
  };

  const lifted = phase === "lift" || phase === "open";
  const arrow = "grid size-14 cursor-pointer place-items-center rounded-full border-[3px] border-ink bg-azure text-white shadow-[0_4px_0_hsl(var(--ink))] active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 pt-1">
      <p className="mx-auto rounded-2xl border-2 border-ink/20 bg-white/90 px-4 py-1.5 text-center text-xs font-semibold text-ink">{t("claw.hint")}</p>
      <div ref={fieldRef} className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border-[3px] border-ink bg-white/55 shadow-[0_6px_0_hsl(var(--ink)/0.2)]">
        <div className="absolute inset-x-4 top-3 h-2 rounded-full bg-ink/35" aria-hidden="true" />
        <div ref={clawRef} className="absolute left-0 top-3 flex w-12 flex-col items-center will-change-transform" aria-hidden="true">
          <ClawArt closed={phase !== "aim"} />
          {lifted && grabbed !== null && (
            <span className="-mt-2 size-14">
              <Sprite name={PRIZES[grabbed] ?? "smartphone"} />
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-around border-t-[3px] border-ink bg-sun/60 px-1 pb-2" style={{ height: PIT_HEIGHT_PX }} aria-hidden="true">
          {PRIZES.map((sprite, index) => (
            <span key={sprite} className={cn("size-14 transition-opacity duration-200", grabbed === index && lifted && "opacity-0")}>
              <Sprite name={sprite} />
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label="Left" disabled={phase !== "aim"} onPointerDown={steer(-1)} onPointerUp={steer(0)} onPointerLeave={steer(0)} onPointerCancel={steer(0)} className={arrow}>
          <ArrowLeft className="size-6" aria-hidden="true" />
        </button>
        <Button size="lg" className="min-w-40" onClick={grab} disabled={phase !== "aim"}>
          <Grab aria-hidden="true" /> {t("claw.grab")}
        </Button>
        <button type="button" aria-label="Right" disabled={phase !== "aim"} onPointerDown={steer(1)} onPointerUp={steer(0)} onPointerLeave={steer(0)} onPointerCancel={steer(0)} className={arrow}>
          <ArrowRight className="size-6" aria-hidden="true" />
        </button>
      </div>

      {phase === "open" && <RewardCard discountPercent={prize.discountPercent} mode={mode} reducedMotion={reducedMotion} onContinue={finish} />}
    </div>
  );
}
