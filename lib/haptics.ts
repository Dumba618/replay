export type HapticKind = "tap" | "good" | "bad" | "success";

const PATTERNS: Readonly<Record<HapticKind, number | number[]>> = {
  tap: 8,
  good: 10,
  bad: [30, 40, 30],
  success: [15, 40, 25],
};

/** Short vibration where supported. Silent under reduced motion and on devices without a vibrator. */
export function haptic(kind: HapticKind): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate(PATTERNS[kind]);
}
