/**
 * Celebration burst using `canvas-confetti` (ISC licence). Loaded on demand, so the
 * library only ships when a reveal happens. Does nothing under reduced motion.
 */
const COLORS = ["#ffd23f", "#58cc02", "#1cb0f6", "#ffffff"];

export async function celebrate(reducedMotion: boolean, strength: "small" | "big" = "small"): Promise<void> {
  if (reducedMotion || typeof window === "undefined") return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 100, ticks: 180 };
    if (strength === "big") {
      void confetti({ ...base, particleCount: 90, spread: 80, origin: { x: 0.2, y: 0.7 }, angle: 60 });
      void confetti({ ...base, particleCount: 90, spread: 80, origin: { x: 0.8, y: 0.7 }, angle: 120 });
    } else {
      void confetti({ ...base, particleCount: 70, spread: 70, origin: { x: 0.5, y: 0.75 } });
    }
  } catch {
    // Decoration only: ignore any failure.
  }
}
