import { LEVEL_CONFIG, type Voucher, type WheelSegment } from "@/types";
import type { SpinPayload } from "@/types/api";

/**
 * Rebuilds the reward view of an already-issued voucher. Wheel/luck vouchers point at a segment of
 * their level's prize table; skill-game vouchers have no segment (`segmentIndex` is -1) and get a
 * synthetic one. Pure and client-safe; the reward is only ever read from the voucher.
 */
export function toSpinPayload(voucher: Voucher, alreadySpun: boolean): SpinPayload {
  const wheelSegments = LEVEL_CONFIG[voucher.wheelLevel].wheel;
  const segmentIndex = wheelSegments.findIndex((segment) => segment.id === voucher.segmentId);
  const segment: WheelSegment = wheelSegments[segmentIndex] ?? { id: voucher.segmentId, label: voucher.label, discountPercent: voucher.discountPercent, weight: 1 };
  return { voucher, segment, segmentIndex, wheelSegments, wheelLevel: voucher.wheelLevel, alreadySpun };
}
