"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { HARD_CAP_SEC, MINIGAMES, SKIP_AFTER_SEC, starsForScore } from "@/lib/minigames/registry";
import type { GameProps, HudControls, HudState, MinigameId, MinigameProps, MinigameResult } from "@/lib/minigames/types";
import { CATCH_COMBO_BAR, CATCH_MAX_LIVES } from "@/lib/minigames/catch-engine";
import { Hud } from "@/components/game/minigames/Hud";
import { Scene } from "@/components/game/minigames/Scene";
import { useLang } from "@/lib/i18n";

const GAME_COMPONENTS: Readonly<Record<MinigameId, ComponentType<GameProps>>> = {
  WHEEL: dynamic(() => import("@/components/game/minigames/games/WheelGame"), { ssr: false }),
  RECYCLE_CATCH: dynamic(() => import("@/components/game/minigames/games/RecycleCatchGame"), { ssr: false }),
  PICK_BOX: dynamic(() => import("@/components/game/minigames/games/PickBoxGame"), { ssr: false }),
  CLAW: dynamic(() => import("@/components/game/minigames/games/ClawGame"), { ssr: false }),
};

const TICK_MS = 250;

const INITIAL_HUD: HudState = { score: 0, lives: null, maxLives: CATCH_MAX_LIVES, combo: 0, comboMax: CATCH_COMBO_BAR, multiplier: 1 };

interface MinigameHostProps extends MinigameProps {
  gameId: MinigameId;
}

/**
 * Runs one game. Owns the shared HUD, the Skip button (from 3 s), the 30 s hard
 * cap and the "exactly one onFinish" guarantee. Games never touch the prize.
 */
export function MinigameHost({ gameId, onFinish, ...gameProps }: MinigameHostProps) {
  const def = MINIGAMES[gameId];
  const { t } = useLang();
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [elapsedMs, setElapsedMs] = useState(0);
  const hudRef = useRef<HudState>(INITIAL_HUD);
  const finishedRef = useRef(false);
  const startedAt = useRef<number>(0);
  const elapsedRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const finish = useCallback(
    (partial: Partial<MinigameResult> & Pick<MinigameResult, "completed" | "skipped">) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const score = partial.score ?? hudRef.current.score;
      const result: MinigameResult = {
        score,
        stars: partial.stars ?? starsForScore(gameId, score),
        completed: partial.completed,
        skipped: partial.skipped,
        durationMs: partial.durationMs ?? Math.max(0, elapsedRef.current),
      };
      onFinishRef.current(result);
    },
    [gameId],
  );

  const controls = useMemo<HudControls>(
    () => ({
      update: (patch) => {
        hudRef.current = { ...hudRef.current, ...patch };
        setHud(hudRef.current);
      },
    }),
    [],
  );

  useEffect(() => {
    startedAt.current = Date.now();
    let last = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.min(now - last, 1000);
      last = now;
      if (document.hidden) return; // the clock pauses with the game loop
      elapsedRef.current += delta;
      setElapsedMs(elapsedRef.current);
      if (elapsedRef.current >= HARD_CAP_SEC * 1000) finish({ completed: false, skipped: false });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [finish]);

  const Game = GAME_COMPONENTS[gameId];
  const durationSec = Math.min(def.durationSec, HARD_CAP_SEC);
  const remainingSec = Math.max(0, durationSec - elapsedMs / 1000);
  const skipVisible = elapsedMs >= SKIP_AFTER_SEC * 1000;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-sky text-ink anim-fade-in" role="region" aria-label={gameProps.theme.labelEn}>
      <Scene />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <Hud kind={def.kind} state={hud} remainingSec={remainingSec} durationSec={durationSec} skipVisible={skipVisible} onSkip={() => finish({ completed: false, skipped: true })} t={t} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Game {...gameProps} hud={controls} onFinish={(result) => finish({ ...result })} />
      </div>
      </div>
    </div>
  );
}
