"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Wheel } from "spin-wheel";
import type { WheelSegment } from "@/types";
import { Button } from "@/components/ui/button";

const SPIN_MS = 4800;
const REVOLUTIONS = 5;
const INK = "hsl(215, 35%, 16%)";
const GREEN = "hsl(100, 70%, 45%)";
const BLUE = "hsl(199, 94%, 52%)";
const SUN = "hsl(45, 100%, 58%)";
const JACKPOT = "hsl(28, 100%, 52%)";
const POINTER = "hsl(0, 78%, 55%)";

interface FortuneWheelProps {
  /** Prize table drawn on the wheel (already chosen by the server). */
  segments: readonly WheelSegment[];
  /** Asks the server for a random draw when the player spins; resolves with the segment to land on, or null on failure. */
  getTarget: () => Promise<number | null>;
  reducedMotion: boolean;
  label: string;
  onFinished: () => void;
}

/**
 * Fortune wheel drawn by the open-source `spin-wheel` library (MIT, CrazyTim).
 * RePlay only styles it and calls `spinToItem(segment)` with the segment the server drew;
 * the library never decides anything and the wheel is not draggable.
 */
export function FortuneWheel({ segments, getTarget, reducedMotion, label, onFinished }: FortuneWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<Wheel | null>(null);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"ready" | "spinning" | "done">("ready");
  const timer = useRef<number | null>(null);

  const items = useMemo(() => {
    const jackpot = segments.reduce((best, segment) => (segment.discountPercent > best.discountPercent ? segment : best)).id;
    const palette = [GREEN, BLUE, SUN];
    return segments.map((segment, index) => {
      const isJackpot = segment.id === jackpot;
      return { label: `${segment.discountPercent}%`, backgroundColor: isJackpot ? JACKPOT : palette[index % palette.length] ?? GREEN, labelColor: INK };
    });
  }, [segments]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let created: Wheel | null = null;
    void import("spin-wheel").then(({ Wheel: WheelClass }) => {
      if (cancelled || !containerRef.current) return;
      created = new WheelClass(containerRef.current, {
        items,
        isInteractive: false,
        radius: 0.96,
        pointerAngle: 0,
        borderColor: INK,
        borderWidth: 12,
        lineColor: INK,
        lineWidth: 3,
        itemLabelFont: "sans-serif",
        itemLabelAlign: "right",
        itemLabelRadius: 0.9,
        itemLabelRadiusMax: 0.42,
        itemLabelFontSizeMax: 64,
        onRest: () => {
          if (finishedRef.current) return;
          finishedRef.current = true;
          setPhase("done");
          onFinishedRef.current();
        },
      });
      wheelRef.current = created;
      setReady(true);
    });
    return () => {
      cancelled = true;
      created?.remove();
      wheelRef.current = null;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [items]);

  const spin = async () => {
    const wheel = wheelRef.current;
    if (!wheel || phase !== "ready") return;
    setPhase("spinning");
    const target = await getTarget();
    if (target === null) {
      setPhase("ready");
      return;
    }
    wheel.spinToItem(target, reducedMotion ? 0 : SPIN_MS, true, reducedMotion ? 0 : REVOLUTIONS, 1);
    // Safety net: if the library never raises `rest`, still finish.
    timer.current = window.setTimeout(
      () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        setPhase("done");
        onFinishedRef.current();
      },
      (reducedMotion ? 0 : SPIN_MS) + 800,
    );
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-[320px]">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1" aria-hidden="true">
          <svg width="40" height="46" viewBox="0 0 34 40">
            <path d="M17 38 L3 8 Q17 -2 31 8 Z" fill={POINTER} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="rounded-full border-[4px] border-ink bg-white p-1.5 shadow-[0_8px_0_hsl(var(--ink)/0.3)]">
          <div ref={containerRef} className="aspect-square w-full [&>canvas]:size-full" role="img" aria-label={`Fortune wheel with ${segments.length} segments`} />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[4px] border-ink bg-white font-display text-sm font-bold text-ink" aria-hidden="true">
          RP
        </div>
      </div>
      <Button size="lg" onClick={() => void spin()} disabled={!ready || phase !== "ready"} className="min-w-52">
        <Sparkles aria-hidden="true" />
        {label}
      </Button>
    </div>
  );
}
