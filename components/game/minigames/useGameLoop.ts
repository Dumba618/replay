"use client";

import { useEffect, useRef } from "react";

const MAX_DELTA_SEC = 0.05;

/**
 * requestAnimationFrame loop with a clamped delta (max 50 ms), paused while the
 * tab is hidden and always cleaned up on unmount. The callback receives the
 * delta in seconds. It must NOT set React state per frame.
 */
export function useGameLoop(callback: (deltaSec: number) => void, active: boolean = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    let running = false;

    const tick = (time: number) => {
      const delta = Math.min(MAX_DELTA_SEC, Math.max(0, (time - last) / 1000));
      last = time;
      callbackRef.current(delta);
      frame = window.requestAnimationFrame(tick);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [active]);
}
