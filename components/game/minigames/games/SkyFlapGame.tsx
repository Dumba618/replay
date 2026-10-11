"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BIRD_RADIUS, FLAP_POOL, GROUND_Y, PIPE_WIDTH, createFlapEngine, type FlapEngine } from "@/lib/minigames/flap-engine";
import { starsForScore } from "@/lib/minigames/registry";
import type { GameProps } from "@/lib/minigames/types";
import { useGameLoop } from "@/components/game/minigames/useGameLoop";
import { haptic } from "@/lib/haptics";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const HINT_MS = 4000;
const CAP_HEIGHT_PX = 26;
const FINISH_DELAY_MS = 650;

interface PipeNodes {
  root: HTMLDivElement | null;
  topBody: HTMLDivElement | null;
  topCap: HTMLDivElement | null;
  bottomCap: HTMLDivElement | null;
  bottomBody: HTMLDivElement | null;
  lastGapY: number;
  lastGap: number;
}

/** An original little bird: blue body, yellow belly, green wing, orange beak. */
function Bird() {
  return (
    <svg viewBox="0 0 56 44" className="size-full overflow-visible" aria-hidden="true">
      <g stroke="hsl(var(--ink))" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M6 20 L-2 14 L4 26 Z" fill="#1cb0f6" />
        <ellipse cx="28" cy="24" rx="22" ry="17" fill="#1cb0f6" />
        <path d="M14 28 C20 38 38 38 45 28 C40 32 20 32 14 28 Z" fill="#ffd23f" stroke="none" />
        <path d="M18 24 C20 14 32 14 36 22 C30 30 22 32 18 24 Z" fill="#5bc21e" />
        <path d="M46 20 L56 24 L46 29 Z" fill="#ff9b2f" />
        <circle cx="38" cy="16" r="6" fill="#ffffff" />
        <circle cx="40" cy="16" r="2.4" fill="hsl(var(--ink))" stroke="none" />
        <path d="M24 8 C22 2 28 0 30 6" fill="none" />
      </g>
    </svg>
  );
}

/** SKILL game. Tap to flap through the gates; every gate passed raises the reward. DOM nodes move through refs. */
export default function SkyFlapGame({ seed, hud, onFinish, reducedMotion }: GameProps) {
  const { t } = useLang();
  const [hintVisible, setHintVisible] = useState(true);
  const fieldRef = useRef<HTMLDivElement>(null);
  const birdRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const pipeRefs = useRef<PipeNodes[]>(Array.from({ length: FLAP_POOL }, () => ({ root: null, topBody: null, topCap: null, bottomCap: null, bottomBody: null, lastGapY: -1, lastGap: -1 })));
  const engineRef = useRef<FlapEngine | null>(null);
  const dims = useRef({ width: 1, height: 1 });
  const finished = useRef(false);
  const startedAt = useRef(0);

  const finish = useCallback(
    (engine: FlapEngine) => {
      if (finished.current) return;
      finished.current = true;
      onFinish({ stars: starsForScore("SKY_FLAP", engine.score), score: engine.score, completed: true, skipped: false, durationMs: Math.round(performance.now() - startedAt.current) });
    },
    [onFinish],
  );

  useEffect(() => {
    startedAt.current = performance.now();
    hud.update({ score: 0, lives: null });
    const hint = window.setTimeout(() => setHintVisible(false), HINT_MS);
    const field = fieldRef.current;
    let observer: ResizeObserver | null = null;
    if (field) {
      const measure = () => {
        dims.current = { width: field.clientWidth || 1, height: field.clientHeight || 1 };
      };
      measure();
      observer = new ResizeObserver(measure);
      observer.observe(field);
    }
    return () => {
      window.clearTimeout(hint);
      observer?.disconnect();
    };
  }, [hud]);

  const flap = useCallback(() => {
    engineRef.current?.flap();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.key === "ArrowUp" || event.key === "w") {
        event.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  useGameLoop((dt) => {
    const { width, height } = dims.current;
    if (engineRef.current === null) {
      engineRef.current = createFlapEngine({
        seed,
        aspect: width / height,
        onEvent: (type) => {
          const engine = engineRef.current;
          if (!engine) return;
          if (type === "POINT") {
            haptic("good");
            hud.update({ score: engine.score });
          } else if (type === "FLAP") {
            haptic("tap");
          } else {
            haptic("bad");
            if (flashRef.current) {
              flashRef.current.classList.remove("anim-flash-bad");
              void flashRef.current.offsetWidth;
              flashRef.current.classList.add("anim-flash-bad");
            }
          }
        },
      });
    }
    const engine = engineRef.current;
    if (finished.current) return;
    engine.step(dt);

    const birdSize = BIRD_RADIUS * 2 * height * 1.5;
    const bird = birdRef.current;
    if (bird) {
      const tilt = reducedMotion || !engine.started ? 0 : Math.max(-25, Math.min(60, engine.birdVy * 55));
      const hover = !engine.started && !reducedMotion ? Math.sin(performance.now() / 260) * 0.012 * height : 0;
      bird.style.width = `${birdSize}px`;
      bird.style.height = `${birdSize * 0.8}px`;
      bird.style.transform = `translate3d(${engine.birdX * height - birdSize / 2}px,${engine.birdY * height - birdSize * 0.4 + hover}px,0) rotate(${tilt.toFixed(1)}deg)`;
    }

    for (let index = 0; index < FLAP_POOL; index += 1) {
      const pipe = engine.pipes[index];
      const nodes = pipeRefs.current[index];
      if (!pipe || !nodes || !nodes.root) continue;
      if (!pipe.active) {
        if (nodes.root.style.opacity !== "0") nodes.root.style.opacity = "0";
        continue;
      }
      nodes.root.style.opacity = "1";
      nodes.root.style.transform = `translate3d(${pipe.x * height}px,0,0)`;
      if (nodes.lastGapY !== pipe.gapY || nodes.lastGap !== engine.gap) {
        nodes.lastGapY = pipe.gapY;
        nodes.lastGap = engine.gap;
        const gapTop = (pipe.gapY - engine.gap / 2) * height;
        const gapBottom = (pipe.gapY + engine.gap / 2) * height;
        if (nodes.topBody) nodes.topBody.style.height = `${Math.max(0, gapTop - CAP_HEIGHT_PX)}px`;
        if (nodes.topCap) nodes.topCap.style.top = `${gapTop - CAP_HEIGHT_PX}px`;
        if (nodes.bottomCap) nodes.bottomCap.style.top = `${gapBottom}px`;
        if (nodes.bottomBody) nodes.bottomBody.style.top = `${gapBottom + CAP_HEIGHT_PX}px`;
      }
    }

    if (engine.ended) {
      window.setTimeout(() => finish(engine), engine.endReason === "CRASH" ? FINISH_DELAY_MS : 0);
    }
  });

  const pipeWidth = PIPE_WIDTH;
  return (
    <div
      ref={fieldRef}
      className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
      onPointerDown={(event) => {
        event.preventDefault();
        flap();
      }}
      role="button"
      tabIndex={0}
      aria-label={t("flap.hint")}
    >
      <p className={cn("pointer-events-none absolute inset-x-6 top-2 rounded-2xl border-2 border-ink/20 bg-white/90 px-4 py-2 text-center text-sm font-semibold text-ink transition-opacity duration-500", hintVisible ? "opacity-100" : "opacity-0")}>{t("flap.hint")}</p>

      {Array.from({ length: FLAP_POOL }, (_, index) => (
        <div
          key={index}
          ref={(node) => {
            const nodes = pipeRefs.current[index];
            if (nodes) nodes.root = node;
          }}
          className="absolute left-0 top-0 h-full opacity-0 will-change-transform"
          style={{ width: `${pipeWidth * 100}vh`, minWidth: 0 }}
          aria-hidden="true"
        >
          <div ref={(node) => { const n = pipeRefs.current[index]; if (n) n.topBody = node; }} className="absolute inset-x-[6%] top-0 border-x-[3px] border-ink bg-leaf" />
          <div ref={(node) => { const n = pipeRefs.current[index]; if (n) n.topCap = node; }} className="absolute inset-x-0 rounded-md border-[3px] border-ink bg-[#2f8a0e]" style={{ height: CAP_HEIGHT_PX }} />
          <div ref={(node) => { const n = pipeRefs.current[index]; if (n) n.bottomCap = node; }} className="absolute inset-x-0 rounded-md border-[3px] border-ink bg-[#2f8a0e]" style={{ height: CAP_HEIGHT_PX }} />
          <div ref={(node) => { const n = pipeRefs.current[index]; if (n) n.bottomBody = node; }} className="absolute inset-x-[6%] bottom-0 border-x-[3px] border-ink bg-leaf" />
        </div>
      ))}

      <div ref={birdRef} className="absolute left-0 top-0 will-change-transform" role="img" aria-label="Bird">
        <Bird />
      </div>

      <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-[hsl(0_80%_50%)] opacity-0" aria-hidden="true" />
    </div>
  );
}
