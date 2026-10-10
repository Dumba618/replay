/**
 * Smoke test for lib/session-store.ts. Run: npm run test:store
 * (uses --conditions react-server so the `server-only` guard allows the import).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as S from "../lib/session-store";
import { City, ItemCategory, LEVEL_CONFIG, Level, Retailer, SessionStatus, StoreErrorCode, VoucherStatus, type ClaimResult } from "../types";

const make = (now: number) => {
  const result = S.createSession({ category: ItemCategory.LAPTOP, estimatedWeightKg: 2, retailer: Retailer.ELIT, city: City.TBILISI }, now);
  assert(result.ok, "createSession should succeed");
  return result.session;
};
const topSegment = (level: Level) => LEVEL_CONFIG[level].wheel[7]!;

S.resetStore();
const recycler = randomUUID();

// PIN format and first claim -> BRONZE
const s1 = make(1000);
assert.match(s1.pin, /^\d{4}$/);
const c1 = S.claimSession({ pin: s1.pin, recyclerId: recycler }, 2000);
assert(c1.ok && !c1.alreadyClaimed && c1.leveledUp && c1.levelAfter === Level.BRONZE);

// Idempotent double submit
const replay = S.claimSession({ pin: s1.pin, recyclerId: recycler }, 2001);
assert(replay.ok && replay.alreadyClaimed && replay.leveledUp && replay.recycler.dropOffs === 1);
const stranger = S.claimSession({ pin: s1.pin, recyclerId: randomUUID() }, 2002);
assert(!stranger.ok && stranger.error === StoreErrorCode.ALREADY_CLAIMED);

// Expired sessions never count
const expired = make(0);
const late = S.claimSession({ pin: expired.pin, recyclerId: recycler }, 6 * 60 * 1000);
assert(!late.ok && late.error === StoreErrorCode.SESSION_EXPIRED);
assert.equal(S.getRecycler(recycler).dropOffs, 1);

// Seeding reaches SILVER at 3
const seeded = S.seedClaimedSessions(recycler, 2, {}, 3000);
assert(seeded.ok && seeded.recycler.level === Level.SILVER);

// One voucher per session, drawn inside the margin guard
const s3 = make(4000);
const c3 = S.claimSession({ pin: s3.pin, recyclerId: recycler }, 4100);
assert(c3.ok);
const spin = S.spinForVoucher({ sessionId: s3.id, recyclerId: recycler }, (level) => topSegment(level), 4200);
assert(spin.ok && !spin.alreadySpun && spin.voucher.discountPercent <= LEVEL_CONFIG[spin.wheelLevel].maxDiscountPercent);
const spin2 = S.spinForVoucher({ sessionId: s3.id, recyclerId: recycler }, (level) => LEVEL_CONFIG[level].wheel[0]!, 4300);
assert(spin2.ok && spin2.alreadySpun && spin2.voucher.code === spin.voucher.code, "second spin must return the original prize");

// An illegal draw is rejected loudly
const s4 = make(4400);
assert(S.claimSession({ pin: s4.pin, recyclerId: recycler }, 4500).ok);
assert.throws(() => S.spinForVoucher({ sessionId: s4.id, recyclerId: recycler }, () => ({ id: "BOGUS", label: "99%", discountPercent: 99, weight: 1 }), 4600));

// Latest voucher lookup (used to resume at the ticket after a reload)
const latest = S.getLatestVoucher(recycler, 5000);
assert(latest !== null && latest.code === spin.voucher.code && latest.status === VoucherStatus.ISSUED);
assert.equal(S.getLatestVoucher(randomUUID(), 5000), null);

// Void recomputes the level from CLAIMED sessions only
const before = S.getRecycler(recycler).dropOffs;
const voided = S.voidSession(s1.id, "test", 5000);
assert(voided.ok && voided.recycler?.dropOffs === before - 1);
assert.equal(S.getLatestVoucher(recycler, 5001)?.code, spin.voucher.code);

// Brute force lockout
const guesser = randomUUID();
let last: ClaimResult | undefined;
for (let i = 0; i < 6; i += 1) last = S.claimSession({ pin: "9999", recyclerId: guesser }, 9000);
assert(last && !last.ok && last.error === StoreErrorCode.TOO_MANY_ATTEMPTS);

// PIN uniqueness among live sessions
const pins = new Set<string>();
for (let i = 0; i < 1500; i += 1) pins.add(make(10_000).pin);
assert.equal(pins.size, 1500);

// Capacity
S.resetStore();
for (let i = 0; i < 10_000; i += 1) assert(S.createSession({ category: ItemCategory.CABLE, estimatedWeightKg: 1, retailer: Retailer.ALTA, city: City.BATUMI }, 1).ok);
const full = S.createSession({ category: ItemCategory.CABLE, estimatedWeightKg: 1, retailer: Retailer.ALTA, city: City.BATUMI }, 1);
assert(!full.ok && full.error === StoreErrorCode.CAPACITY_EXHAUSTED);
assert.equal(S.getStoreStats(2).byStatus[SessionStatus.PENDING], 10_000);

console.log("store-smoke: all assertions passed");
