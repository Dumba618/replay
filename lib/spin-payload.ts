import { LEVEL_CONFIG, type Voucher } from "@/types";
import type { SpinPayload } from "@/types/api";

/**
 * Rebuilds the wheel view of an already-issued voucher: which table it came
 * from, which segment, and where that segment sits. Pure and client-safe; the
 * prize itself is only ever read from the voucher, never recomputed.
 */
export function toSpinPayload(voucher: Voucher, alreadySpun: boolean): SpinPayload | null {
  const wheelSegments = LEVEL_CONFIG[voucher.wheelLevel].wheel;
  const segmentIndex = wheelSegments.findIndex((segment) => segment.id === voucher.segmentId);
  const segment = wheelSegments[segmentIndex];
  if (!segment) return null;
  return { voucher, segment, segmentIndex, wheelSegments, wheelLevel: voucher.wheelLevel, alreadySpun };
}
