/**
 * Smoke test for lib/session-store.ts. Run: npm run test:store
 * (uses --conditions react-server so the `server-only` guard allows the import).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as S from "../lib/session-store";
import { City, ItemCategory, LEVEL_CONFIG, Level, MIN_DISCOUNT_PERCENT, Retailer, SessionStatus, StoreErrorCode, VoucherStatus, type ClaimResult } from "../types";

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

// Nothing is preset at claim time: a claimed session has no voucher until a game issues one
const unrewarded = S.getSession(s3.id, 4600);
assert(unrewarded !== null && unrewarded.voucher !== null, "the luck draw above issued its voucher");
const fresh = make(20_000);
assert(S.claimSession({ pin: fresh.pin, recyclerId: recycler }, 20_100).ok);
assert.equal(S.getSession(fresh.id, 20_150)?.voucher, null, "claiming does not issue a reward");

// Skill rewards: the discount scales with the score between the 15% floor and the level's cap
const skillOwner = randomUUID();
const skillA = make(30_000);
assert(S.claimSession({ pin: skillA.pin, recyclerId: skillOwner }, 30_100).ok);
const zero = S.awardSkillVoucher({ sessionId: skillA.id, recyclerId: skillOwner, gameId: "RECYCLE_CATCH", score: 0, durationMs: 1_000, fullScore: 900 }, 31_500);
assert(zero.ok && zero.voucher.discountPercent === MIN_DISCOUNT_PERCENT && zero.segmentIndex === -1 && !zero.alreadySpun, "a zero score earns the floor");
const again = S.awardSkillVoucher({ sessionId: skillA.id, recyclerId: skillOwner, gameId: "RECYCLE_CATCH", score: 900, durationMs: 1_000, fullScore: 900 }, 31_600);
assert(again.ok && again.alreadySpun && again.voucher.code === zero.voucher.code, "one reward per session: a second attempt returns the first");

const skillB = make(40_000);
assert(S.claimSession({ pin: skillB.pin, recyclerId: skillOwner }, 40_100).ok);
const fullScore = S.awardSkillVoucher({ sessionId: skillB.id, recyclerId: skillOwner, gameId: "RECYCLE_CATCH", score: 900, durationMs: 20_000, fullScore: 900 }, 60_500);
assert(fullScore.ok && fullScore.voucher.discountPercent === LEVEL_CONFIG[fullScore.wheelLevel].maxDiscountPercent, "the full score earns the level's cap");

const skillC = make(70_000);
assert(S.claimSession({ pin: skillC.pin, recyclerId: skillOwner }, 70_100).ok);
const tooLong = S.awardSkillVoucher({ sessionId: skillC.id, recyclerId: skillOwner, gameId: "RECYCLE_CATCH", score: 10, durationMs: 20_000, fullScore: 900 }, 71_000);
assert(!tooLong.ok && tooLong.error === StoreErrorCode.INVALID_INPUT, "play time cannot exceed the time since the claim");
const impossible = S.awardSkillVoucher({ sessionId: skillC.id, recyclerId: skillOwner, gameId: "RECYCLE_CATCH", score: 4_000, durationMs: 1_500, fullScore: 900 }, 72_000);
assert(!impossible.ok && impossible.error === StoreErrorCode.INVALID_INPUT, "an implausible score is rejected");
const stranger2 = S.awardSkillVoucher({ sessionId: skillC.id, recyclerId: randomUUID(), gameId: "RECYCLE_CATCH", score: 10, durationMs: 1_000, fullScore: 900 }, 72_100);
assert(!stranger2.ok && stranger2.error === StoreErrorCode.FORBIDDEN, "only the claiming profile can be rewarded");
const noGame = S.awardSkillVoucher({ sessionId: skillC.id, recyclerId: skillOwner, gameId: "bad id!", score: 10, durationMs: 1_000, fullScore: 900 }, 72_200);
assert(!noGame.ok && noGame.error === StoreErrorCode.INVALID_INPUT);
assert.equal(S.getSession(skillC.id, 72_300)?.voucher, null, "rejected awards issue nothing");

// Latest voucher lookup (used to resume at the ticket after a reload)
const latest = S.getLatestVoucher(recycler, 5000);
assert(latest !== null && latest.status === VoucherStatus.ISSUED);
assert.equal(S.getLatestVoucher(randomUUID(), 5000), null);

// Void recomputes the level from CLAIMED sessions only
const before = S.getRecycler(recycler).dropOffs;
const voided = S.voidSession(s1.id, "test", 5000);
assert(voided.ok && voided.recycler?.dropOffs === before - 1);
assert(S.getLatestVoucher(recycler, 5001) !== null);

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
