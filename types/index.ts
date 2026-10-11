/**
 * RePlay — core data contracts.
 *
 * Client-safe: this module has NO Node imports and may be used from both
 * server and client components. All numbers marked "demo assumption" are
 * placeholders documented as such in the BRD.
 */

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export enum ItemCategory {
  LAPTOP = "LAPTOP",
  PHONE = "PHONE",
  MONITOR = "MONITOR",
  CABLE = "CABLE",
  BATTERY = "BATTERY",
}

export enum SessionStatus {
  PENDING = "PENDING",
  CLAIMED = "CLAIMED",
  EXPIRED = "EXPIRED",
  VOID = "VOID",
}

export enum VoucherStatus {
  ISSUED = "ISSUED",
  REDEEMED = "REDEEMED",
  EXPIRED = "EXPIRED",
  VOID = "VOID",
}

export enum Level {
  UNRANKED = "UNRANKED",
  BRONZE = "BRONZE",
  SILVER = "SILVER",
  GOLD = "GOLD",
  PLATINUM = "PLATINUM",
  DIAMOND = "DIAMOND",
}

export enum Retailer {
  ELIT = "ELIT",
  ZOOMMER = "ZOOMMER",
  ALTA = "ALTA",
  GSTORE = "GSTORE",
}

export enum City {
  TBILISI = "TBILISI",
  BATUMI = "BATUMI",
}

export enum StoreErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  PIN_NOT_FOUND = "PIN_NOT_FOUND",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  SESSION_VOID = "SESSION_VOID",
  ALREADY_CLAIMED = "ALREADY_CLAIMED",
  NOT_CLAIMED = "NOT_CLAIMED",
  FORBIDDEN = "FORBIDDEN",
  TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS",
  SPIN_WINDOW_CLOSED = "SPIN_WINDOW_CLOSED",
  VOUCHER_NOT_FOUND = "VOUCHER_NOT_FOUND",
  VOUCHER_EXPIRED = "VOUCHER_EXPIRED",
  INVALID_STATE = "INVALID_STATE",
  CAPACITY_EXHAUSTED = "CAPACITY_EXHAUSTED",
  SEED_DISABLED = "SEED_DISABLED",
}

export enum AuditEventType {
  SESSION_CREATED = "SESSION_CREATED",
  SESSION_CLAIMED = "SESSION_CLAIMED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  SESSION_VOIDED = "SESSION_VOIDED",
  VOUCHER_ISSUED = "VOUCHER_ISSUED",
  VOUCHER_REDEEMED = "VOUCHER_REDEEMED",
  VOUCHER_EXPIRED = "VOUCHER_EXPIRED",
  CLAIM_REJECTED = "CLAIM_REJECTED",
  SEEDED = "SEEDED",
}

/* -------------------------------------------------------------------------- */
/*  Category & retailer config                                                 */
/* -------------------------------------------------------------------------- */

export type CategoryIcon = "Laptop" | "Smartphone" | "Monitor" | "Cable" | "BatteryCharging";

export interface CategoryConfig {
  readonly category: ItemCategory;
  readonly label: string;
  readonly icon: CategoryIcon;
  readonly minWeightKg: number;
  readonly maxWeightKg: number;
  readonly defaultWeightKg: number;
  readonly hazardous: boolean;
}

export const CATEGORY_CONFIG: Readonly<Record<ItemCategory, CategoryConfig>> = {
  [ItemCategory.LAPTOP]: { category: ItemCategory.LAPTOP, label: "Laptop", icon: "Laptop", minWeightKg: 0.5, maxWeightKg: 6, defaultWeightKg: 2, hazardous: false },
  [ItemCategory.PHONE]: { category: ItemCategory.PHONE, label: "Phone", icon: "Smartphone", minWeightKg: 0.05, maxWeightKg: 0.8, defaultWeightKg: 0.2, hazardous: false },
  [ItemCategory.MONITOR]: { category: ItemCategory.MONITOR, label: "Monitor", icon: "Monitor", minWeightKg: 1, maxWeightKg: 20, defaultWeightKg: 5, hazardous: false },
  [ItemCategory.CABLE]: { category: ItemCategory.CABLE, label: "Cables", icon: "Cable", minWeightKg: 0.02, maxWeightKg: 5, defaultWeightKg: 0.3, hazardous: false },
  [ItemCategory.BATTERY]: { category: ItemCategory.BATTERY, label: "Batteries", icon: "BatteryCharging", minWeightKg: 0.02, maxWeightKg: 8, defaultWeightKg: 0.5, hazardous: true },
};

export const ITEM_CATEGORIES: readonly ItemCategory[] = [
  ItemCategory.LAPTOP,
  ItemCategory.PHONE,
  ItemCategory.MONITOR,
  ItemCategory.CABLE,
  ItemCategory.BATTERY,
];

export interface RetailerConfig {
  readonly retailer: Retailer;
  readonly label: string;
}

export const RETAILER_CONFIG: Readonly<Record<Retailer, RetailerConfig>> = {
  [Retailer.ELIT]: { retailer: Retailer.ELIT, label: "Elit Electronics" },
  [Retailer.ZOOMMER]: { retailer: Retailer.ZOOMMER, label: "Zoommer" },
  [Retailer.ALTA]: { retailer: Retailer.ALTA, label: "Alta" },
  [Retailer.GSTORE]: { retailer: Retailer.GSTORE, label: "Gstore" },
};

export const RETAILERS: readonly Retailer[] = [Retailer.ELIT, Retailer.ZOOMMER, Retailer.ALTA, Retailer.GSTORE];
export const CITIES: readonly City[] = [City.TBILISI, City.BATUMI];

/* -------------------------------------------------------------------------- */
/*  Timing & protocol constants                                                */
/* -------------------------------------------------------------------------- */

/** How long a clerk-issued PIN stays valid. Demo assumption. */
export const SESSION_TTL_MS = 5 * 60 * 1000;
/** How long after a claim the consumer may still spin the wheel. Demo assumption. */
export const SPIN_WINDOW_MS = 30 * 60 * 1000;
/** Validity of an issued voucher. Demo assumption. */
export const VOUCHER_TTL_MS = 24 * 60 * 60 * 1000;
export const PIN_LENGTH = 4;

/* -------------------------------------------------------------------------- */
/*  Levels, perks and wheel prize tables                                       */
/* -------------------------------------------------------------------------- */

export interface WheelSegment {
  readonly id: string;
  readonly label: string;
  readonly discountPercent: number;
  /** Relative weight; probability = weight / sum(weights of the level's wheel). */
  readonly weight: number;
}

export interface LevelConfig {
  readonly level: Level;
  readonly label: string;
  /** Minimum number of CLAIMED sessions required. */
  readonly minDropOffs: number;
  /** Voucher margin guard: no segment at this level may exceed this discount. Demo assumption. */
  readonly maxDiscountPercent: number;
  readonly tagline: string;
  /** Exactly WHEEL_SEGMENT_COUNT segments, in on-screen clockwise order. */
  readonly wheel: readonly WheelSegment[];
}

export const WHEEL_SEGMENT_COUNT = 8;

/** Lowest discount any wheel segment may offer (demo assumption). The highest is each level's `maxDiscountPercent`, topping out at 40%. */
export const MIN_DISCOUNT_PERCENT = 15;

/** Ordered lowest -> highest. */
export const LEVEL_ORDER: readonly Level[] = [
  Level.UNRANKED,
  Level.BRONZE,
  Level.SILVER,
  Level.GOLD,
  Level.PLATINUM,
  Level.DIAMOND,
];

/**
 * SINGLE SOURCE OF TRUTH for thresholds and prize tables.
 * All values are demo assumptions (see BRD). Edit here only.
 */
export const LEVEL_CONFIG: Readonly<Record<Level, LevelConfig>> = {
  [Level.UNRANKED]: {
    level: Level.UNRANKED,
    label: "Unranked",
    minDropOffs: 0,
    maxDiscountPercent: 20,
    tagline: "Bring your first device to get started.",
    wheel: [
      { id: "UNRANKED-1", label: "15% off", discountPercent: 15, weight: 20 },
      { id: "UNRANKED-2", label: "15% off", discountPercent: 15, weight: 20 },
      { id: "UNRANKED-3", label: "16% off", discountPercent: 16, weight: 15 },
      { id: "UNRANKED-4", label: "17% off", discountPercent: 17, weight: 15 },
      { id: "UNRANKED-5", label: "15% off", discountPercent: 15, weight: 10 },
      { id: "UNRANKED-6", label: "18% off", discountPercent: 18, weight: 8 },
      { id: "UNRANKED-7", label: "16% off", discountPercent: 16, weight: 8 },
      { id: "UNRANKED-8", label: "20% off", discountPercent: 20, weight: 4 },
    ],
  },
  [Level.BRONZE]: {
    level: Level.BRONZE,
    label: "Bronze",
    minDropOffs: 1,
    maxDiscountPercent: 24,
    tagline: "You are in the loop.",
    wheel: [
      { id: "BRONZE-1", label: "15% off", discountPercent: 15, weight: 20 },
      { id: "BRONZE-2", label: "16% off", discountPercent: 16, weight: 18 },
      { id: "BRONZE-3", label: "18% off", discountPercent: 18, weight: 16 },
      { id: "BRONZE-4", label: "15% off", discountPercent: 15, weight: 14 },
      { id: "BRONZE-5", label: "20% off", discountPercent: 20, weight: 12 },
      { id: "BRONZE-6", label: "17% off", discountPercent: 17, weight: 10 },
      { id: "BRONZE-7", label: "22% off", discountPercent: 22, weight: 8 },
      { id: "BRONZE-8", label: "24% off", discountPercent: 24, weight: 2 },
    ],
  },
  [Level.SILVER]: {
    level: Level.SILVER,
    label: "Silver",
    minDropOffs: 3,
    maxDiscountPercent: 28,
    tagline: "A regular recycler.",
    wheel: [
      { id: "SILVER-1", label: "16% off", discountPercent: 16, weight: 18 },
      { id: "SILVER-2", label: "18% off", discountPercent: 18, weight: 18 },
      { id: "SILVER-3", label: "20% off", discountPercent: 20, weight: 14 },
      { id: "SILVER-4", label: "17% off", discountPercent: 17, weight: 14 },
      { id: "SILVER-5", label: "22% off", discountPercent: 22, weight: 12 },
      { id: "SILVER-6", label: "19% off", discountPercent: 19, weight: 10 },
      { id: "SILVER-7", label: "25% off", discountPercent: 25, weight: 10 },
      { id: "SILVER-8", label: "28% off", discountPercent: 28, weight: 4 },
    ],
  },
  [Level.GOLD]: {
    level: Level.GOLD,
    label: "Gold",
    minDropOffs: 5,
    maxDiscountPercent: 32,
    tagline: "Circular economy champion.",
    wheel: [
      { id: "GOLD-1", label: "18% off", discountPercent: 18, weight: 14 },
      { id: "GOLD-2", label: "20% off", discountPercent: 20, weight: 16 },
      { id: "GOLD-3", label: "22% off", discountPercent: 22, weight: 14 },
      { id: "GOLD-4", label: "25% off", discountPercent: 25, weight: 14 },
      { id: "GOLD-5", label: "20% off", discountPercent: 20, weight: 12 },
      { id: "GOLD-6", label: "24% off", discountPercent: 24, weight: 12 },
      { id: "GOLD-7", label: "28% off", discountPercent: 28, weight: 12 },
      { id: "GOLD-8", label: "32% off", discountPercent: 32, weight: 6 },
    ],
  },
  [Level.PLATINUM]: {
    level: Level.PLATINUM,
    label: "Platinum",
    minDropOffs: 8,
    maxDiscountPercent: 36,
    tagline: "Top-tier impact.",
    wheel: [
      { id: "PLATINUM-1", label: "20% off", discountPercent: 20, weight: 12 },
      { id: "PLATINUM-2", label: "24% off", discountPercent: 24, weight: 14 },
      { id: "PLATINUM-3", label: "25% off", discountPercent: 25, weight: 14 },
      { id: "PLATINUM-4", label: "28% off", discountPercent: 28, weight: 14 },
      { id: "PLATINUM-5", label: "30% off", discountPercent: 30, weight: 14 },
      { id: "PLATINUM-6", label: "26% off", discountPercent: 26, weight: 12 },
      { id: "PLATINUM-7", label: "32% off", discountPercent: 32, weight: 12 },
      { id: "PLATINUM-8", label: "36% off", discountPercent: 36, weight: 8 },
    ],
  },
  [Level.DIAMOND]: {
    level: Level.DIAMOND,
    label: "Diamond",
    minDropOffs: 12,
    maxDiscountPercent: 40,
    tagline: "Legend of the loop.",
    wheel: [
      { id: "DIAMOND-1", label: "24% off", discountPercent: 24, weight: 10 },
      { id: "DIAMOND-2", label: "25% off", discountPercent: 25, weight: 12 },
      { id: "DIAMOND-3", label: "28% off", discountPercent: 28, weight: 14 },
      { id: "DIAMOND-4", label: "30% off", discountPercent: 30, weight: 14 },
      { id: "DIAMOND-5", label: "32% off", discountPercent: 32, weight: 14 },
      { id: "DIAMOND-6", label: "35% off", discountPercent: 35, weight: 14 },
      { id: "DIAMOND-7", label: "38% off", discountPercent: 38, weight: 12 },
      { id: "DIAMOND-8", label: "40% off", discountPercent: 40, weight: 10 },
    ],
  },
};

/** Level reached with `dropOffs` claimed sessions. Pure, client-safe. */
export function getLevelForDropOffs(dropOffs: number): Level {
  const safe = Number.isFinite(dropOffs) ? Math.max(0, Math.floor(dropOffs)) : 0;
  let current: Level = LEVEL_ORDER[0] ?? Level.UNRANKED;
  for (const level of LEVEL_ORDER) {
    if (safe >= LEVEL_CONFIG[level].minDropOffs) current = level;
  }
  return current;
}

/** Next level above `level`, or null at the top. */
export function getNextLevel(level: Level): Level | null {
  const index = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[index + 1] ?? null;
}

/** Progress snapshot for the progress bar. Pure, client-safe. */
export function buildLevelProgress(dropOffs: number): LevelProgress {
  const safe = Number.isFinite(dropOffs) ? Math.max(0, Math.floor(dropOffs)) : 0;
  const level = getLevelForDropOffs(safe);
  const next = getNextLevel(level);
  const currentThreshold = LEVEL_CONFIG[level].minDropOffs;
  if (next === null) {
    return {
      level,
      dropOffs: safe,
      currentThreshold,
      nextLevel: null,
      nextThreshold: null,
      dropOffsIntoLevel: safe - currentThreshold,
      dropOffsRequired: 0,
      dropOffsRemaining: 0,
      percent: 100,
      isMaxLevel: true,
    };
  }
  const nextThreshold = LEVEL_CONFIG[next].minDropOffs;
  const required = nextThreshold - currentThreshold;
  const into = safe - currentThreshold;
  return {
    level,
    dropOffs: safe,
    currentThreshold,
    nextLevel: next,
    nextThreshold,
    dropOffsIntoLevel: into,
    dropOffsRequired: required,
    dropOffsRemaining: nextThreshold - safe,
    percent: Math.max(0, Math.min(100, Math.round((into / required) * 100))),
    isMaxLevel: false,
  };
}

/** Reward range available at a level: from the global floor up to the level's cap. */
export function rewardRangeForLevel(level: Level): { readonly min: number; readonly max: number } {
  return { min: MIN_DISCOUNT_PERCENT, max: LEVEL_CONFIG[level].maxDiscountPercent };
}

/**
 * Discount earned by a skill-game score: a score of 0 earns the floor (15%), `fullScore` or more
 * earns the level's cap, and anything in between scales linearly. Pure, so the phone can preview it
 * and the server can compute the real value.
 */
export function discountForScore(score: number, fullScore: number, level: Level): number {
  const { min, max } = rewardRangeForLevel(level);
  const ratio = fullScore > 0 && Number.isFinite(score) ? Math.min(1, Math.max(0, score / fullScore)) : 0;
  return Math.round(min + ratio * (max - min));
}

/**
 * Validates LEVEL_CONFIG invariants: ascending thresholds, 8 segments, unique
 * ids, positive weights, and the margin guard. Returns a list of problems
 * (empty when valid).
 */
export function validateLevelConfig(): string[] {
  const problems: string[] = [];
  let previousMin = -1;
  const seenIds = new Set<string>();
  for (const level of LEVEL_ORDER) {
    const cfg = LEVEL_CONFIG[level];
    if (cfg.minDropOffs <= previousMin) problems.push(`${level}: threshold ${cfg.minDropOffs} is not above ${previousMin}`);
    previousMin = cfg.minDropOffs;
    if (cfg.wheel.length !== WHEEL_SEGMENT_COUNT) problems.push(`${level}: wheel needs ${WHEEL_SEGMENT_COUNT} segments, has ${cfg.wheel.length}`);
    for (const seg of cfg.wheel) {
      if (seenIds.has(seg.id)) problems.push(`${level}: duplicate segment id ${seg.id}`);
      seenIds.add(seg.id);
      if (!(seg.weight > 0)) problems.push(`${seg.id}: weight must be > 0`);
      if (seg.discountPercent > cfg.maxDiscountPercent) problems.push(`${seg.id}: ${seg.discountPercent}% exceeds ${level} margin guard ${cfg.maxDiscountPercent}%`);
      if (seg.discountPercent < MIN_DISCOUNT_PERCENT) problems.push(`${seg.id}: discount ${seg.discountPercent}% is below the ${MIN_DISCOUNT_PERCENT}% floor`);
    }
  }
  return problems;
}

/* -------------------------------------------------------------------------- */
/*  Domain entities                                                            */
/* -------------------------------------------------------------------------- */

export interface LevelProgress {
  readonly level: Level;
  readonly dropOffs: number;
  readonly currentThreshold: number;
  readonly nextLevel: Level | null;
  readonly nextThreshold: number | null;
  /** Drop-offs earned since the current level threshold. */
  readonly dropOffsIntoLevel: number;
  /** Size of the current level band (0 at max level). */
  readonly dropOffsRequired: number;
  readonly dropOffsRemaining: number;
  /** 0-100, rounded. */
  readonly percent: number;
  readonly isMaxLevel: boolean;
}

export interface Recycler {
  readonly recyclerId: string;
  readonly dropOffs: number;
  readonly level: Level;
  readonly progress: LevelProgress;
  /** Epoch ms of the most recent CLAIMED session, or null. */
  readonly lastClaimAt: number | null;
}

export interface Voucher {
  readonly id: string;
  /** Human-readable code shown to the cashier, e.g. RP-7K3M-Q9XD. */
  readonly code: string;
  readonly sessionId: string;
  readonly recyclerId: string;
  readonly retailer: Retailer;
  readonly discountPercent: number;
  readonly label: string;
  readonly segmentId: string;
  /** Level whose wheel table was used (level at claim time). */
  readonly wheelLevel: Level;
  readonly status: VoucherStatus;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly redeemedAt: number | null;
}

export interface Session {
  readonly id: string;
  readonly pin: string;
  readonly category: ItemCategory;
  readonly estimatedWeightKg: number;
  readonly retailer: Retailer;
  readonly city: City;
  readonly clerkLabel: string | null;
  readonly status: SessionStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly claimedAt: number | null;
  readonly claimedByRecyclerId: string | null;
  /** Global monotonic claim sequence; used to make claim replays deterministic. */
  readonly claimOrdinal: number | null;
  readonly voidedAt: number | null;
  readonly voidReason: string | null;
  readonly voucher: Voucher | null;
  /** Increments on every mutation; enables cheap change-detection polling. */
  readonly rev: number;
  /** True when inserted by the demo seed function. */
  readonly seeded: boolean;
}

export interface AuditEvent {
  readonly seq: number;
  readonly at: number;
  readonly type: AuditEventType;
  readonly sessionId: string | null;
  readonly recyclerId: string | null;
  readonly detail: string;
}

/* -------------------------------------------------------------------------- */
/*  Store inputs / results                                                     */
/* -------------------------------------------------------------------------- */

export interface CreateSessionInput {
  readonly category: ItemCategory;
  readonly estimatedWeightKg: number;
  readonly retailer: Retailer;
  readonly city: City;
  readonly clerkLabel?: string;
}

export interface ClaimInput {
  readonly pin: string;
  readonly recyclerId: string;
  /** Optional extra throttle key (e.g. client IP) so new UUIDs cannot bypass lockout. */
  readonly clientKey?: string;
}

export interface SpinInput {
  readonly sessionId: string;
  readonly recyclerId: string;
}

export interface StoreFailure {
  readonly ok: false;
  readonly error: StoreErrorCode;
  readonly message: string;
  readonly retryAfterMs?: number;
}

export interface CreateSessionSuccess {
  readonly ok: true;
  readonly session: Session;
}

export interface ClaimSuccess {
  readonly ok: true;
  readonly session: Session;
  /** True when this call was a replay of an earlier successful claim (no double count). */
  readonly alreadyClaimed: boolean;
  readonly recycler: Recycler;
  readonly levelBefore: Level;
  readonly levelAfter: Level;
  readonly leveledUp: boolean;
  readonly progressBefore: LevelProgress;
  readonly progressAfter: LevelProgress;
}

export interface SpinSuccess {
  readonly ok: true;
  readonly voucher: Voucher;
  readonly segment: WheelSegment;
  readonly segmentIndex: number;
  readonly wheelLevel: Level;
  /** True when the session had already been spun; the original prize is returned. */
  readonly alreadySpun: boolean;
}

export interface VoidSuccess {
  readonly ok: true;
  readonly session: Session;
  readonly recycler: Recycler | null;
}

export interface RedeemSuccess {
  readonly ok: true;
  readonly voucher: Voucher;
  readonly alreadyRedeemed: boolean;
}

export type CreateSessionResult = CreateSessionSuccess | StoreFailure;
export type ClaimResult = ClaimSuccess | StoreFailure;
export type SpinResult = SpinSuccess | StoreFailure;
export type VoidResult = VoidSuccess | StoreFailure;
export type RedeemResult = RedeemSuccess | StoreFailure;

/** Picks a wheel segment for the given level. Must be server-side and unbiased. */
export type WheelDraw = (level: Level) => WheelSegment;

export type SessionPollResult =
  | { readonly changed: false; readonly rev: number; readonly status: SessionStatus }
  | { readonly changed: true; readonly session: Session };

export interface SessionFilter {
  readonly status?: SessionStatus;
  readonly retailer?: Retailer;
  readonly city?: City;
  readonly recyclerId?: string;
  readonly category?: ItemCategory;
  /** Inclusive lower bound on createdAt. */
  readonly since?: number;
}

export interface SeedOptions {
  readonly category?: ItemCategory;
  readonly retailer?: Retailer;
  readonly city?: City;
  /** Spread the historical claims over this many days back from `now`. Default 30. */
  readonly spreadDays?: number;
}

export interface StoreStats {
  readonly totalSessions: number;
  readonly byStatus: Readonly<Record<SessionStatus, number>>;
  readonly activePins: number;
  readonly recyclers: number;
  readonly auditEvents: number;
}
