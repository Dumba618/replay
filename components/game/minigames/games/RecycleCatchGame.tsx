"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BOX_HALF_WIDTH, CATCH_COMBO_BAR, ITEM_HALF_WIDTH, buildCatchLoadout, createCatchEngine, type CatchEngine, type CatchEventType } from "@/lib/minigames/catch-engine";
import { starsForScore } from "@/lib/minigames/registry";
import type { GameProps } from "@/lib/minigames/types";
import { Bin } from "@/components/game/minigames/Bin";
import { ItemSprite } from "@/components/game/minigames/ItemSprite";
import { useGameLoop } from "@/components/game/minigames/useGameLoop";
import { haptic } from "@/lib/haptics";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const BIN_SPEED = 3.2; // field widths per second
const KEY_SPEED = 1.5;
const MIN_X = BOX_HALF_WIDTH;
const MAX_X = 1 - BOX_HALF_WIDTH;
const POP_POOL = 6;
const HINT_MS = 4500;

function clamp(value: number): number {
  return Math.min(MAX_X, Math.max(MIN_X, value));
}

/** Re-triggers a CSS keyframe class (only on catch events, never per frame). */
function restart(element: HTMLElement | null, className: string): void {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

/** SKILL game. Objects are moved through refs; React state changes only for the hint. */
export default function RecycleCatchGame({ theme, seed, levelColor, hud, onFinish, reducedMotion }: GameProps) {
  const { lang, t } = useLang();
  const loadout = useMemo(() => buildCatchLoadout(theme, seed), [theme, seed]);
  const [hintVisible, setHintVisible] = useState(true);
  const fieldRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);
  const binInnerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const popRefs = useRef<Array<HTMLDivElement | null>>([]);
  const nextPop = useRef(0);
  const dims = useRef({ width: 1, height: 1 });
  const binX = useRef(0.5);
  const targetX = useRef(0.5);
  const heldDir = useRef<-1 | 0 | 1>(0);
  const keyDir = useRef<-1 | 0 | 1>(0);
  const engineRef = useRef<CatchEngine | null>(null);
  const lastScore = useRef(0);
  const finished = useRef(false);
  const startedAt = useRef(0);

  const finish = useCallback(
    (engine: CatchEngine) => {
      if (finished.current) return;
      finished.current = true;
      onFinish({ stars: starsForScore("RECYCLE_CATCH", engine.score), score: engine.score, completed: true, skipped: false, durationMs: Math.round(performance.now() - startedAt.current) });
    },
    [onFinish],
  );

  const showPop = (text: string, slot: number, tone: "good" | "bonus" | "life") => {
    const engine = engineRef.current;
    const node = popRefs.current[nextPop.current % POP_POOL];
    const item = engine?.items[slot];
    if (!node || !item) return;
    nextPop.current += 1;
    const { width, height } = dims.current;
    node.textContent = text;
    node.style.transform = `translate3d(${item.x * width - 24}px,${item.y * height - 40}px,0)`;
    node.dataset.tone = tone;
    restart(node, "anim-float-up");
  };

  if (engineRef.current === null) {
    engineRef.current = createCatchEngine({
      seed,
      kinds: loadout.kinds,
      onEvent: (type: CatchEventType, slot: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        hud.update({ score: engine.score, lives: engine.lives, combo: engine.combo, multiplier: engine.multiplier });
        const gained = engine.score - lastScore.current;
        lastScore.current = engine.score;
        if (type === "GOOD" || type === "BONUS" || type === "BATTERY") {
          haptic("good");
          showPop(`+${gained}`, slot, type === "BONUS" ? "bonus" : "good");
          if (!reducedMotion) restart(binInnerRef.current, "anim-bin-bump");
        } else if (type === "LIFE") {
          haptic("good");
          showPop("+1", slot, "life");
          if (!reducedMotion) restart(binInnerRef.current, "anim-bin-bump");
        } else if (type === "BAD") {
          haptic("bad");
          restart(flashRef.current, "anim-flash-bad");
          if (!reducedMotion) restart(binInnerRef.current, "anim-bin-hurt");
        }
      },
    });
  }

  useEffect(() => {
    startedAt.current = performance.now();
    hud.update({ score: 0, lives: 3, combo: 0, comboMax: CATCH_COMBO_BAR, multiplier: 1 });
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

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") keyDir.current = -1;
      else if (event.key === "ArrowRight" || event.key === "d") keyDir.current = 1;
    };
    const onUp = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key)) keyDir.current = 0;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useGameLoop((dt) => {
    const engine = engineRef.current;
    if (!engine || finished.current) return;
    const dir = heldDir.current !== 0 ? heldDir.current : keyDir.current;
    if (dir !== 0) targetX.current = clamp(targetX.current + dir * KEY_SPEED * dt);
    const diff = targetX.current - binX.current;
    const maxMove = BIN_SPEED * dt;
    binX.current = clamp(binX.current + Math.max(-maxMove, Math.min(maxMove, diff)));

    const { width, height } = dims.current;
    // The rim sits a little below the bin's top edge, so the catch point matches what the player sees.
    const binHeightPx = BOX_HALF_WIDTH * 2 * width * 0.8;
    const mouthY = 1 - (12 + binHeightPx * 0.88) / height;
    engine.step(dt, binX.current, mouthY);

    const itemSize = ITEM_HALF_WIDTH * 2 * width;
    const bin = binRef.current;
    if (bin) bin.style.transform = `translate3d(${(binX.current - BOX_HALF_WIDTH) * width}px,0,0)`;
    for (let slot = 0; slot < engine.items.length; slot += 1) {
      const node = nodeRefs.current[slot];
      const item = engine.items[slot];
      if (!node || !item) continue;
      if (item.active) {
        const tilt = reducedMotion ? 0 : Math.sin(item.wobble) * 12;
        node.style.opacity = "1";
        node.style.transform = `translate3d(${(item.x - ITEM_HALF_WIDTH) * width}px,${item.y * height - itemSize / 2}px,0) rotate(${tilt.toFixed(1)}deg)`;
      } else if (node.style.opacity !== "0") {
        node.style.opacity = "0";
      }
    }
    if (engine.ended) finish(engine);
  });

  const steer = (dir: -1 | 0 | 1) => () => {
    heldDir.current = dir;
  };

  const onPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    targetX.current = clamp((event.clientX - rect.left) / rect.width);
  };

  const arrow = "absolute bottom-5 grid size-14 cursor-pointer place-items-center rounded-full border-[3px] border-ink bg-azure text-white shadow-[0_4px_0_hsl(var(--ink))] active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div
      ref={fieldRef}
      className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons > 0 || event.pointerType === "touch") onPointer(event);
      }}
    >
      <p className={cn("pointer-events-none absolute inset-x-6 top-2 rounded-2xl border-2 border-ink/20 bg-white/90 px-4 py-2 text-center text-xs font-semibold text-ink transition-opacity duration-500", hintVisible ? "opacity-100" : "opacity-0")}>
        {t("catch.hint")}
      </p>

      {loadout.items.map((item, slot) => (
        <div
          key={`${item.id}-${slot}`}
          ref={(node) => {
            nodeRefs.current[slot] = node;
          }}
          className="absolute left-0 top-0 opacity-0 will-change-transform"
          style={{ width: `${ITEM_HALF_WIDTH * 200}%`, aspectRatio: "1 / 1" }}
          role="img"
          aria-label={lang === "ka" ? item.labelKa : item.labelEn}
        >
          <ItemSprite item={item} />
        </div>
      ))}

      {Array.from({ length: POP_POOL }, (_, index) => (
        <div
          key={index}
          ref={(node) => {
            popRefs.current[index] = node;
          }}
          className="pointer-events-none absolute left-0 top-0 w-12 text-center font-display text-xl font-bold text-white opacity-0 [text-shadow:0_2px_0_hsl(var(--ink)),0_0_6px_hsl(var(--ink))] data-[tone=bonus]:text-sun data-[tone=life]:text-[hsl(0_90%_75%)]"
          aria-hidden="true"
        />
      ))}

      <div ref={binRef} className="absolute bottom-3 left-0 will-change-transform" style={{ width: `${BOX_HALF_WIDTH * 200}%` }} role="img" aria-label={lang === "ka" ? theme.boxLabelKa : theme.boxLabelEn}>
        <div ref={binInnerRef} className="origin-bottom">
          <Bin tint={levelColor} />
        </div>
      </div>

      <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-[hsl(0_80%_50%)] opacity-0" aria-hidden="true" />

      <button
        type="button"
        aria-label={t("catch.left")}
        onPointerDown={(event) => {
          event.stopPropagation();
          steer(-1)();
        }}
        onPointerUp={steer(0)}
        onPointerLeave={steer(0)}
        onPointerCancel={steer(0)}
        className={cn(arrow, "left-3")}
      >
        <ArrowLeft className="size-6" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={t("catch.right")}
        onPointerDown={(event) => {
          event.stopPropagation();
          steer(1)();
        }}
        onPointerUp={steer(0)}
        onPointerLeave={steer(0)}
        onPointerCancel={steer(0)}
        className={cn(arrow, "right-3")}
      >
        <ArrowRight className="size-6" aria-hidden="true" />
      </button>
    </div>
  );
}
