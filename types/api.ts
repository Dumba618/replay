/**
 * RePlay — HTTP API contracts shared by route handlers and client pages.
 * Client-safe (type-only imports plus plain constants).
 */
import type {
  City,
  ItemCategory,
  Level,
  LevelProgress,
  Recycler,
  Retailer,
  Session,
  SessionStatus,
  StoreErrorCode,
  Voucher,
  VoucherStatus,
  WheelSegment,
} from "@/types";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ApiErrorCode = StoreErrorCode | "BAD_REQUEST" | "DEMO_DISABLED" | "INTERNAL";

export interface ApiErrorBody {
  readonly error: ApiErrorCode;
  readonly message: string;
  readonly retryAfterMs?: number;
}

export interface LevelUp {
  readonly from: Level;
  readonly to: Level;
}

/* ------------------------------ /api/session ------------------------------ */

/** POST /api/session — body is `CreateSessionInput` from "@/types". 201 on success. */
export interface CreateSessionResponse {
  readonly serverNow: number;
  readonly session: Session;
}

/** GET /api/session?id=<uuid>&rev=<n> — 200. */
export type SessionPollResponse =
  | { readonly serverNow: number; readonly changed: false; readonly rev: number; readonly status: SessionStatus }
  | { readonly serverNow: number; readonly changed: true; readonly session: Session; readonly levelUp: LevelUp | null };

/** PATCH /api/session — claim. */
export interface ClaimBody {
  readonly action?: "claim";
  readonly pin: string;
  readonly recyclerId: string;
}

/** PATCH /api/session — void. */
export interface VoidBody {
  readonly action: "void";
  readonly sessionId: string;
  readonly reason: string;
}

/** The reward range at the level reached by a claim. */
export interface RewardRange {
  readonly level: Level;
  readonly minPercent: number;
  readonly maxPercent: number;
}

/** POST /api/reward: ask the server to issue the single reward of a claimed session. */
export interface RewardBody {
  readonly sessionId: string;
  readonly recyclerId: string;
  /** Which game was played. Its kind (SKILL or LUCK) is decided by the server's registry, never by the client. */
  readonly gameId?: string;
  /** SKILL games only: the final score and play time (milliseconds). */
  readonly score?: number;
  readonly durationMs?: number;
}

export interface SpinPayload {
  readonly voucher: Voucher;
  readonly segment: WheelSegment;
  /** Index of the server-chosen segment inside `wheelSegments`, or -1 for score-based (skill) rewards. */
  readonly segmentIndex: number;
  /** The prize table of `wheelLevel`, in on-screen order (lets any minigame render the wheel). */
  readonly wheelSegments: readonly WheelSegment[];
  /** Level whose wheel table was used. */
  readonly wheelLevel: Level;
  readonly alreadySpun: boolean;
}

export interface ClaimResponse {
  readonly serverNow: number;
  readonly session: Session;
  readonly alreadyClaimed: boolean;
  readonly recycler: Recycler;
  readonly progressBefore: LevelProgress;
  /** Updated progress after the claim. */
  readonly progress: LevelProgress;
  /** Present only when a level threshold was crossed by this claim. */
  readonly levelUp: LevelUp | null;
  /** What this level can win: from the 15% floor to the level's cap. */
  readonly range: RewardRange;
  /** The voucher this session already has (a replayed claim after playing), else null. Rewards are issued by POST /api/reward. */
  readonly voucher: SpinPayload | null;
}

export interface VoidResponse {
  readonly serverNow: number;
  readonly session: Session;
  readonly recycler: Recycler | null;
}

/* ------------------------------ /api/recycler ----------------------------- */

export interface RecyclerResponse {
  readonly recycler: Recycler;
  /** Most recent voucher, used to resume at the ticket after a reload. Null when none. */
  readonly latestVoucher: SpinPayload | null;
}

/* ------------------------------- /api/demo -------------------------------- */

export interface DemoStatusResponse {
  readonly enabled: boolean;
}

export interface DemoSeedBody {
  readonly action: "seed";
  readonly recyclerId: string;
  /** Target number of CLAIMED drop-offs (0-50). Only ever increases the count. */
  readonly dropOffs: number;
}

export interface DemoResetBody {
  readonly action: "reset";
}

export interface DemoSeedResponse {
  readonly recycler: Recycler;
  readonly added: number;
}

export interface DemoResetResponse {
  readonly ok: true;
}

/* ------------------------------ /api/dashboard ---------------------------- */

export interface DashboardKpis {
  readonly totalSessions: number;
  readonly claimed: number;
  readonly pending: number;
  readonly expired: number;
  readonly voided: number;
  readonly totalKg: number;
  /** claimed / (claimed + expired); null when there is no data. */
  readonly claimRate: number | null;
  readonly recyclers: number;
  /** Recyclers with 2+ drop-offs / recyclers; null when there are none. */
  readonly repeatRecyclerRate: number | null;
  readonly avgDropOffsPerRecycler: number | null;
  readonly levelUpsTotal: number;
  readonly vouchersIssued: number;
  readonly vouchersRedeemed: number;
}

export interface StatutoryRow {
  readonly category: ItemCategory;
  readonly label: string;
  readonly collectedKg: number;
  readonly targetKg: number;
  readonly percent: number;
}

export interface BreakdownRow {
  readonly key: string;
  readonly label: string;
  readonly claimed: number;
  readonly kg: number;
}

export interface RetailerRow extends BreakdownRow {
  readonly vouchersIssued: number;
  readonly vouchersRedeemed: number;
  readonly avgDiscountPercent: number | null;
}

export interface DailyPoint {
  /** YYYY-MM-DD in Georgia time (UTC+4). */
  readonly date: string;
  readonly kg: number;
  readonly claims: number;
  readonly levelUps: number;
}

export interface LevelDistributionRow {
  readonly level: Level;
  readonly label: string;
  readonly recyclers: number;
}

export interface AuditRow {
  readonly sessionId: string;
  readonly shortId: string;
  readonly createdAt: number;
  readonly claimedAt: number | null;
  readonly status: SessionStatus;
  readonly category: ItemCategory;
  readonly estimatedWeightKg: number;
  readonly retailer: Retailer;
  readonly city: City;
  readonly recyclerShort: string | null;
  /** Recycler's level once this claim was counted. */
  readonly levelAtClaim: Level | null;
  /** 1-based index of this drop-off among the recycler's CLAIMED sessions. */
  readonly dropOffNumber: number | null;
  readonly leveledUp: boolean;
  readonly voucherPercent: number | null;
  readonly voucherStatus: VoucherStatus | null;
  readonly seeded: boolean;
}

export interface DashboardData {
  readonly generatedAt: number;
  readonly periodLabel: string;
  readonly kpis: DashboardKpis;
  readonly statutory: readonly StatutoryRow[];
  readonly byCategory: readonly BreakdownRow[];
  readonly byRetailer: readonly RetailerRow[];
  readonly byCity: readonly BreakdownRow[];
  readonly daily: readonly DailyPoint[];
  readonly levelDistribution: readonly LevelDistributionRow[];
  readonly auditRows: readonly AuditRow[];
}
