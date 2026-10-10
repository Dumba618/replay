import "server-only";
import { randomInt } from "node:crypto";
import { LEVEL_CONFIG, type Level, type WheelDraw, type WheelSegment } from "@/types";

/**
 * Server-side, cryptographically unbiased weighted draw over the level's prize
 * table. Every segment of every table already respects the level's margin
 * guard (validated at startup by the session store), and the store re-checks
 * the drawn segment before issuing a voucher.
 */
export const drawSegment: WheelDraw = (level: Level): WheelSegment => {
  const table = LEVEL_CONFIG[level].wheel;
  const total = table.reduce((sum, segment) => sum + segment.weight, 0);
  let ticket = randomInt(0, total);
  for (const segment of table) {
    if (ticket < segment.weight) return segment;
    ticket -= segment.weight;
  }
  const last = table[table.length - 1];
  if (!last) throw new Error(`Empty wheel table for level ${level}`);
  return last;
};
