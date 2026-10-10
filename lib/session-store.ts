import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import {
  AuditEventType,
  CATEGORY_CONFIG,
  City,
  ItemCategory,
  LEVEL_CONFIG,
  PIN_LENGTH,
  Retailer,
  SESSION_TTL_MS,
  SPIN_WINDOW_MS,
  SessionStatus,
  StoreErrorCode,
  VOUCHER_TTL_MS,
  VoucherStatus,
  buildLevelProgress,
  getLevelForDropOffs,
  validateLevelConfig,
  type AuditEvent,
  type ClaimInput,
  type ClaimResult,
  type CreateSessionInput,
  type CreateSessionResult,
  type Level,
  type RedeemResult,
  type Recycler,
  type SeedOptions,
  type Session,
  type SessionFilter,
  type SessionPollResult,
  type SpinInput,
  type SpinResult,
  type StoreFailure,
  type StoreStats,
  type Voucher,
  type VoidResult,
  type WheelDraw,
  type WheelSegment,
} from "@/types";

/*
 * Concurrency model
 * -----------------
 * The prototype runs as ONE Node.js process. JavaScript executes each
 * synchronous function to completion before any other request handler can
 * run, so every exported function below is a critical section as long as it
 * contains no `await`. DO NOT add `await` (or any async boundary) inside a
 * mutation: that is what would reintroduce races. A production version would
 * replace this module with a database transaction (e.g. SELECT ... FOR UPDATE
 * on the session row, unique constraint on (recyclerId, sessionId)).
 *
 * The state lives on `globalThis` so Next.js dev hot-reloads (which re-evaluate
 * this module) keep the same data.
 */

/* ------------------------------ tunables ---------------------------------- */

/** After a claim, the PIN keeps resolving to the claimed session (for idempotent replays). */
const PIN_REPLAY_GRACE_MS = 10 * 60 * 1000;
/** EXPIRED sessions are dropped from memory after this long (the audit log keeps the trace). */
const EXPIRED_RETENTION_MS = 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const FAIL_WINDOW_MS = 60 * 1000;
const LOCKOUT_MS = 60 * 1000;
const SWEEP_MIN_INTERVAL_MS = 1000;
const AUDIT_MAX = 5000;
const CLERK_LABEL_MAX = 40;
const VOID_REASON_MAX = 200;
const SEED_MAX_COUNT = 100;
const VOUCHER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const PIN_PATTERN = /^\d{4}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/* ------------------------------ internal state ----------------------------- */

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type MutableVoucher = Mutable<Voucher>;
type MutableSession = Omit<Mutable<Session>, "voucher"> & { voucher: MutableVoucher | null };

interface FailureRecord {
  count: number;
  windowStart: number;
  lockedUntil: number;
}

interface StoreState {
  readonly sessions: Map<string, MutableSession>;
  /** pin -> sessionId of the most recent session issued with that PIN. */
  readonly pinIndex: Map<string, string>;
  /** recyclerId -> ids of sessions claimed by them (status re-checked on read). */
  readonly claimedByRecycler: Map<string, Set<string>>;
  /** voucher code -> sessionId. */
  readonly voucherIndex: Map<string, string>;
  readonly failures: Map<string, FailureRecord>;
  audit: AuditEvent[];
  auditSeq: number;
  claimCounter: number;
  lastSweepAt: number;
}

interface GlobalWithStore {
  __replayStore__?: StoreState;
}

function createState(): StoreState {
  return {
    sessions: new Map(),
    pinIndex: new Map(),
    claimedByRecycler: new Map(),
    voucherIndex: new Map(),
    failures: new Map(),
    audit: [],
    auditSeq: 0,
    claimCounter: 0,
    lastSweepAt: 0,
  };
}

function getState(): StoreState {
  const holder = globalThis as unknown as GlobalWithStore;
  if (!holder.__replayStore__) holder.__replayStore__ = createState();
  return holder.__replayStore__;
}

const configProblems = validateLevelConfig();
if (configProblems.length > 0) {
  throw new Error(`Invalid LEVEL_CONFIG: ${configProblems.join("; ")}`);
}

/* ------------------------------ small helpers ------------------------------ */

function fail(error: StoreErrorCode, message: string, retryAfterMs?: number): StoreFailure {
  return retryAfterMs === undefined ? { ok: false, error, message } : { ok: false, error, message, retryAfterMs };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isEnumValue<T extends string>(enumObject: Record<string, T>, value: unknown): value is T {
  return typeof value === "string" && (Object.values(enumObject) as string[]).includes(value);
}

function normalizeId(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function pick<T>(items: readonly T[]): T {
  const item = items[randomInt(0, items.length)];
  if (item === undefined) throw new Error("pick() called with an empty list");
  return item;
}

function recordAudit(
  st: StoreState,
  type: AuditEventType,
  sessionId: string | null,
  recyclerId: string | null,
  detail: string,
  now: number,
): void {
  st.auditSeq += 1;
  st.audit.push({ seq: st.auditSeq, at: now, type, sessionId, recyclerId, detail });
  if (st.audit.length > AUDIT_MAX + 500) st.audit = st.audit.slice(st.audit.length - AUDIT_MAX);
}

/* ------------------------------ lifecycle ---------------------------------- */

/** Applies time-based transitions to ONE session. O(1). Safe to call on every read. */
function refresh(st: StoreState, session: MutableSession, now: number): void {
  if (session.status === SessionStatus.PENDING && now >= session.expiresAt) {
    session.status = SessionStatus.EXPIRED;
    session.rev += 1;
    recordAudit(st, AuditEventType.SESSION_EXPIRED, session.id, null, "PIN not claimed within TTL", now);
  }
  const voucher = session.voucher;
  if (voucher && voucher.status === VoucherStatus.ISSUED && now >= voucher.expiresAt) {
    voucher.status = VoucherStatus.EXPIRED;
    session.rev += 1;
    recordAudit(st, AuditEventType.VOUCHER_EXPIRED, session.id, session.claimedByRecyclerId, voucher.code, now);
  }
}

/** Full pass; throttled so rapid polling cannot turn into O(n) work per request. */
function sweep(st: StoreState, now: number): void {
  if (now - st.lastSweepAt < SWEEP_MIN_INTERVAL_MS) return;
  st.lastSweepAt = now;
  for (const session of st.sessions.values()) {
    refresh(st, session, now);
    if (session.status === SessionStatus.EXPIRED && now - session.expiresAt > EXPIRED_RETENTION_MS) {
      st.sessions.delete(session.id);
      if (st.pinIndex.get(session.pin) === session.id) st.pinIndex.delete(session.pin);
    }
  }
  for (const [key, record] of st.failures) {
    if (now >= record.lockedUntil && now - record.windowStart > FAIL_WINDOW_MS) st.failures.delete(key);
  }
}

/* ------------------------------ PIN handling ------------------------------- */

function isPinFree(st: StoreState, pin: string, now: number): boolean {
  const sessionId = st.pinIndex.get(pin);
  if (sessionId === undefined) return true;
  const session = st.sessions.get(sessionId);
  if (!session) {
    st.pinIndex.delete(pin);
    return true;
  }
  refresh(st, session, now);
  if (session.status === SessionStatus.PENDING) return false;
  if (session.status === SessionStatus.CLAIMED && session.claimedAt !== null && now - session.claimedAt < PIN_REPLAY_GRACE_MS) {
    return false;
  }
  return true;
}

function formatPin(value: number): string {
  return value.toString().padStart(PIN_LENGTH, "0");
}

/** Cryptographically secure, collision-free among live sessions. Returns null when all 10 000 PINs are busy. */
function generatePin(st: StoreState, now: number): string | null {
  const space = 10 ** PIN_LENGTH;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const candidate = formatPin(randomInt(0, space));
    if (isPinFree(st, candidate, now)) return candidate;
  }
  const start = randomInt(0, space);
  for (let offset = 0; offset < space; offset += 1) {
    const candidate = formatPin((start + offset) % space);
    if (isPinFree(st, candidate, now)) return candidate;
  }
  return null;
}

/* ------------------------------ brute-force throttle ----------------------- */

function throttleKeys(recyclerId: string, clientKey: string | undefined): string[] {
  const keys = [`r:${recyclerId}`];
  const trimmed = clientKey?.trim().slice(0, 64);
  if (trimmed) keys.push(`c:${trimmed}`);
  return keys;
}

function lockRemaining(st: StoreState, keys: readonly string[], now: number): number {
  let remaining = 0;
  for (const key of keys) {
    const record = st.failures.get(key);
    if (record && record.lockedUntil > now) remaining = Math.max(remaining, record.lockedUntil - now);
  }
  return remaining;
}

function registerFailure(st: StoreState, keys: readonly string[], now: number): void {
  for (const key of keys) {
    const existing = st.failures.get(key);
    const record: FailureRecord =
      existing && now - existing.windowStart <= FAIL_WINDOW_MS ? existing : { count: 0, windowStart: now, lockedUntil: 0 };
    record.count += 1;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
      record.count = 0;
      record.windowStart = now;
    }
    st.failures.set(key, record);
  }
}

function clearFailures(st: StoreState, keys: readonly string[]): void {
  for (const key of keys) st.failures.delete(key);
}

/* ------------------------------ level derivation --------------------------- */

/** Level is DERIVED: the number of this recycler's sessions currently in CLAIMED status. */
function countClaimed(st: StoreState, recyclerId: string): number {
  const ids = st.claimedByRecycler.get(recyclerId);
  if (!ids) return 0;
  let count = 0;
  for (const id of ids) {
    const session = st.sessions.get(id);
    if (session && session.status === SessionStatus.CLAIMED && session.claimedByRecyclerId === recyclerId) count += 1;
  }
  return count;
}

/** CLAIMED sessions of the recycler that were claimed strictly before the given claim ordinal. */
function countClaimedBefore(st: StoreState, recyclerId: string, ordinal: number): number {
  const ids = st.claimedByRecycler.get(recyclerId);
  if (!ids) return 0;
  let count = 0;
  for (const id of ids) {
    const session = st.sessions.get(id);
    if (
      session &&
      session.status === SessionStatus.CLAIMED &&
      session.claimedByRecyclerId === recyclerId &&
      session.claimOrdinal !== null &&
      session.claimOrdinal < ordinal
    ) {
      count += 1;
    }
  }
  return count;
}

function buildRecycler(st: StoreState, recyclerId: string): Recycler {
  const dropOffs = countClaimed(st, recyclerId);
  let lastClaimAt: number | null = null;
  const ids = st.claimedByRecycler.get(recyclerId);
  if (ids) {
    for (const id of ids) {
      const session = st.sessions.get(id);
      if (session && session.status === SessionStatus.CLAIMED && session.claimedAt !== null) {
        if (lastClaimAt === null || session.claimedAt > lastClaimAt) lastClaimAt = session.claimedAt;
      }
    }
  }
  return {
    recyclerId,
    dropOffs,
    level: getLevelForDropOffs(dropOffs),
    progress: buildLevelProgress(dropOffs),
    lastClaimAt,
  };
}

function indexClaim(st: StoreState, recyclerId: string, sessionId: string): void {
  let ids = st.claimedByRecycler.get(recyclerId);
  if (!ids) {
    ids = new Set();
    st.claimedByRecycler.set(recyclerId, ids);
  }
  ids.add(sessionId);
}

/* ------------------------------ public API --------------------------------- */

/** Clerk action: registers an item and issues a secure 4-digit PIN. */
export function createSession(input: CreateSessionInput, now: number = Date.now()): CreateSessionResult {
  const st = getState();
  if (!input || typeof input !== "object") return fail(StoreErrorCode.INVALID_INPUT, "Request body is required.");
  if (!isEnumValue(ItemCategory, input.category)) return fail(StoreErrorCode.INVALID_INPUT, "Unknown item category.");
  if (!isEnumValue(Retailer, input.retailer)) return fail(StoreErrorCode.INVALID_INPUT, "Unknown retailer.");
  if (!isEnumValue(City, input.city)) return fail(StoreErrorCode.INVALID_INPUT, "Unknown city.");
  if (typeof input.estimatedWeightKg !== "number" || !Number.isFinite(input.estimatedWeightKg)) {
    return fail(StoreErrorCode.INVALID_INPUT, "Weight must be a number.");
  }
  const config = CATEGORY_CONFIG[input.category];
  const weight = Math.round(input.estimatedWeightKg * 100) / 100;
  if (weight < config.minWeightKg || weight > config.maxWeightKg) {
    return fail(StoreErrorCode.INVALID_INPUT, `${config.label} weight must be between ${config.minWeightKg} and ${config.maxWeightKg} kg.`);
  }
  const clerkLabel = typeof input.clerkLabel === "string" ? input.clerkLabel.trim().slice(0, CLERK_LABEL_MAX) : "";

  sweep(st, now);
  const pin = generatePin(st, now);
  if (pin === null) return fail(StoreErrorCode.CAPACITY_EXHAUSTED, "All PINs are in use. Try again in a minute.", 60_000);

  const session: MutableSession = {
    id: randomUUID(),
    pin,
    category: input.category,
    estimatedWeightKg: weight,
    retailer: input.retailer,
    city: input.city,
    clerkLabel: clerkLabel.length > 0 ? clerkLabel : null,
    status: SessionStatus.PENDING,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    claimedAt: null,
    claimedByRecyclerId: null,
    claimOrdinal: null,
    voidedAt: null,
    voidReason: null,
    voucher: null,
    rev: 1,
    seeded: false,
  };
  st.sessions.set(session.id, session);
  st.pinIndex.set(pin, session.id);
  recordAudit(st, AuditEventType.SESSION_CREATED, session.id, null, `${session.category} ${session.estimatedWeightKg}kg @ ${session.retailer}/${session.city}`, now);
  return { ok: true, session: clone(session) };
}

/** Read a session (applies lazy expiry). Cheap enough for rapid polling. */
export function getSession(sessionId: string, now: number = Date.now()): Session | null {
  const st = getState();
  const session = st.sessions.get(normalizeId(sessionId));
  if (!session) return null;
  refresh(st, session, now);
  return clone(session);
}

/** Change-detection polling: returns a tiny payload when nothing changed. */
export function pollSession(sessionId: string, knownRev: number, now: number = Date.now()): SessionPollResult | null {
  const st = getState();
  const session = st.sessions.get(normalizeId(sessionId));
  if (!session) return null;
  refresh(st, session, now);
  if (session.rev === knownRev) return { changed: false, rev: session.rev, status: session.status };
  return { changed: true, session: clone(session) };
}

/**
 * Consumer action: claim a session by PIN.
 * Atomic (single synchronous critical section) and idempotent: replaying the
 * same (pin, recyclerId) after success returns the same outcome with
 * `alreadyClaimed: true` and never increments the count a second time.
 */
export function claimSession(input: ClaimInput, now: number = Date.now()): ClaimResult {
  const st = getState();
  const pin = typeof input?.pin === "string" ? input.pin.trim() : "";
  const recyclerId = normalizeId(input?.recyclerId);
  if (!PIN_PATTERN.test(pin)) return fail(StoreErrorCode.INVALID_INPUT, "PIN must be exactly 4 digits.");
  if (!UUID_PATTERN.test(recyclerId)) return fail(StoreErrorCode.INVALID_INPUT, "Invalid recycler id.");

  const keys = throttleKeys(recyclerId, input.clientKey);
  const locked = lockRemaining(st, keys, now);
  if (locked > 0) {
    recordAudit(st, AuditEventType.CLAIM_REJECTED, null, recyclerId, StoreErrorCode.TOO_MANY_ATTEMPTS, now);
    return fail(StoreErrorCode.TOO_MANY_ATTEMPTS, "Too many wrong PINs. Please wait a moment.", locked);
  }

  const reject = (error: StoreErrorCode, message: string, sessionId: string | null): StoreFailure => {
    registerFailure(st, keys, now);
    recordAudit(st, AuditEventType.CLAIM_REJECTED, sessionId, recyclerId, error, now);
    const lockedNow = lockRemaining(st, keys, now);
    return fail(error, message, lockedNow > 0 ? lockedNow : undefined);
  };

  sweep(st, now);
  const sessionId = st.pinIndex.get(pin);
  const session = sessionId === undefined ? undefined : st.sessions.get(sessionId);
  if (!session) return reject(StoreErrorCode.PIN_NOT_FOUND, "That PIN does not match an active drop-off.", null);
  refresh(st, session, now);

  if (session.status === SessionStatus.EXPIRED) return reject(StoreErrorCode.SESSION_EXPIRED, "This PIN has expired. Ask the clerk for a new one.", session.id);
  if (session.status === SessionStatus.VOID) return reject(StoreErrorCode.SESSION_VOID, "This drop-off was cancelled.", session.id);

  if (session.status === SessionStatus.CLAIMED) {
    if (session.claimedByRecyclerId !== recyclerId || session.claimOrdinal === null) {
      return reject(StoreErrorCode.ALREADY_CLAIMED, "This PIN has already been used.", session.id);
    }
    // Idempotent replay by the same recycler: rebuild the original outcome.
    clearFailures(st, keys);
    const before = countClaimedBefore(st, recyclerId, session.claimOrdinal);
    return {
      ok: true,
      session: clone(session),
      alreadyClaimed: true,
      recycler: buildRecycler(st, recyclerId),
      levelBefore: getLevelForDropOffs(before),
      levelAfter: getLevelForDropOffs(before + 1),
      leveledUp: getLevelForDropOffs(before + 1) !== getLevelForDropOffs(before),
      progressBefore: buildLevelProgress(before),
      progressAfter: buildLevelProgress(before + 1),
    };
  }

  // PENDING -> CLAIMED (the only place a fresh claim happens)
  const before = countClaimed(st, recyclerId);
  st.claimCounter += 1;
  session.status = SessionStatus.CLAIMED;
  session.claimedAt = now;
  session.claimedByRecyclerId = recyclerId;
  session.claimOrdinal = st.claimCounter;
  session.rev += 1;
  indexClaim(st, recyclerId, session.id);
  clearFailures(st, keys);

  const levelBefore = getLevelForDropOffs(before);
  const levelAfter = getLevelForDropOffs(before + 1);
  recordAudit(st, AuditEventType.SESSION_CLAIMED, session.id, recyclerId, `${levelBefore} -> ${levelAfter} (${before + 1} drop-offs)`, now);
  return {
    ok: true,
    session: clone(session),
    alreadyClaimed: false,
    recycler: buildRecycler(st, recyclerId),
    levelBefore,
    levelAfter,
    leveledUp: levelAfter !== levelBefore,
    progressBefore: buildLevelProgress(before),
    progressAfter: buildLevelProgress(before + 1),
  };
}

function generateVoucherCode(st: StoreState): string {
  for (;;) {
    let body = "";
    for (let i = 0; i < 8; i += 1) body += VOUCHER_CODE_ALPHABET.charAt(randomInt(0, VOUCHER_CODE_ALPHABET.length));
    const code = `RP-${body.slice(0, 4)}-${body.slice(4)}`;
    if (!st.voucherIndex.has(code)) return code;
  }
}

/**
 * Consumer action: spin the Fortune Wheel for a CLAIMED session.
 * At most one voucher per session: a second call returns the original prize
 * (`alreadySpun: true`). `draw` is injected so the (server-side) randomness
 * lives in lib/wheel.ts; the store validates its answer against LEVEL_CONFIG
 * and the margin guard, and throws if the draw is illegal.
 */
export function spinForVoucher(input: SpinInput, draw: WheelDraw, now: number = Date.now()): SpinResult {
  const st = getState();
  const recyclerId = normalizeId(input?.recyclerId);
  const sessionId = normalizeId(input?.sessionId);
  if (!UUID_PATTERN.test(recyclerId) || sessionId.length === 0) return fail(StoreErrorCode.INVALID_INPUT, "Session and recycler ids are required.");

  const session = st.sessions.get(sessionId);
  if (!session) return fail(StoreErrorCode.SESSION_NOT_FOUND, "Drop-off not found.");
  refresh(st, session, now);
  if (session.status === SessionStatus.VOID) return fail(StoreErrorCode.SESSION_VOID, "This drop-off was cancelled.");
  if (session.status !== SessionStatus.CLAIMED || session.claimOrdinal === null || session.claimedAt === null) {
    return fail(StoreErrorCode.NOT_CLAIMED, "Enter the PIN before spinning the wheel.");
  }
  if (session.claimedByRecyclerId !== recyclerId) return fail(StoreErrorCode.FORBIDDEN, "This drop-off belongs to another profile.");

  const wheelLevel: Level = getLevelForDropOffs(countClaimedBefore(st, recyclerId, session.claimOrdinal) + 1);
  const table = LEVEL_CONFIG[wheelLevel].wheel;

  if (session.voucher) {
    const existing = session.voucher;
    const index = table.findIndex((segment) => segment.id === existing.segmentId);
    const segment = table[index];
    if (!segment) return fail(StoreErrorCode.INVALID_STATE, "Stored prize no longer exists in the prize table.");
    return { ok: true, voucher: clone(existing), segment: clone(segment), segmentIndex: index, wheelLevel: existing.wheelLevel, alreadySpun: true };
  }

  if (now - session.claimedAt > SPIN_WINDOW_MS) {
    return fail(StoreErrorCode.SPIN_WINDOW_CLOSED, "The wheel is only available shortly after the hand-off.");
  }

  const drawn: WheelSegment = draw(wheelLevel);
  const index = table.findIndex((segment) => segment.id === drawn.id);
  const segment = table[index];
  if (!segment || segment.discountPercent > LEVEL_CONFIG[wheelLevel].maxDiscountPercent) {
    throw new Error(`Wheel draw returned an illegal segment "${drawn.id}" for level ${wheelLevel}`);
  }

  const voucher: MutableVoucher = {
    id: randomUUID(),
    code: generateVoucherCode(st),
    sessionId: session.id,
    recyclerId,
    retailer: session.retailer,
    discountPercent: segment.discountPercent,
    label: segment.label,
    segmentId: segment.id,
    wheelLevel,
    status: VoucherStatus.ISSUED,
    issuedAt: now,
    expiresAt: now + VOUCHER_TTL_MS,
    redeemedAt: null,
  };
  session.voucher = voucher;
  session.rev += 1;
  st.voucherIndex.set(voucher.code, session.id);
  recordAudit(st, AuditEventType.VOUCHER_ISSUED, session.id, recyclerId, `${voucher.code} ${voucher.discountPercent}% (${wheelLevel})`, now);
  return { ok: true, voucher: clone(voucher), segment: clone(segment), segmentIndex: index, wheelLevel, alreadySpun: false };
}

/** Cashier action: mark a voucher as used at the till. Idempotent. */
export function redeemVoucher(code: string, now: number = Date.now()): RedeemResult {
  const st = getState();
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  const sessionId = st.voucherIndex.get(normalized);
  const session = sessionId === undefined ? undefined : st.sessions.get(sessionId);
  const voucher = session?.voucher;
  if (!session || !voucher) return fail(StoreErrorCode.VOUCHER_NOT_FOUND, "Voucher not found.");
  refresh(st, session, now);
  if (voucher.status === VoucherStatus.REDEEMED) return { ok: true, voucher: clone(voucher), alreadyRedeemed: true };
  if (voucher.status === VoucherStatus.EXPIRED) return fail(StoreErrorCode.VOUCHER_EXPIRED, "Voucher has expired.");
  if (voucher.status === VoucherStatus.VOID) return fail(StoreErrorCode.INVALID_STATE, "Voucher was voided.");
  voucher.status = VoucherStatus.REDEEMED;
  voucher.redeemedAt = now;
  session.rev += 1;
  recordAudit(st, AuditEventType.VOUCHER_REDEEMED, session.id, voucher.recyclerId, voucher.code, now);
  return { ok: true, voucher: clone(voucher), alreadyRedeemed: false };
}

/**
 * Clerk/admin action: void a PENDING or CLAIMED session. A voided CLAIMED
 * session stops counting towards the level immediately (no demotion UI).
 * Idempotent for already-VOID sessions.
 */
export function voidSession(sessionId: string, reason: string, now: number = Date.now()): VoidResult {
  const st = getState();
  const session = st.sessions.get(normalizeId(sessionId));
  if (!session) return fail(StoreErrorCode.SESSION_NOT_FOUND, "Drop-off not found.");
  const trimmed = typeof reason === "string" ? reason.trim().slice(0, VOID_REASON_MAX) : "";
  if (trimmed.length === 0) return fail(StoreErrorCode.INVALID_INPUT, "A reason is required to void a drop-off.");
  refresh(st, session, now);

  const recyclerId = session.claimedByRecyclerId;
  if (session.status === SessionStatus.VOID) {
    return { ok: true, session: clone(session), recycler: recyclerId ? buildRecycler(st, recyclerId) : null };
  }
  if (session.status === SessionStatus.EXPIRED) return fail(StoreErrorCode.INVALID_STATE, "Expired drop-offs cannot be voided.");

  session.status = SessionStatus.VOID;
  session.voidedAt = now;
  session.voidReason = trimmed;
  session.rev += 1;
  if (session.voucher && session.voucher.status === VoucherStatus.ISSUED) session.voucher.status = VoucherStatus.VOID;
  if (recyclerId) st.claimedByRecycler.get(recyclerId)?.delete(session.id);
  recordAudit(st, AuditEventType.SESSION_VOIDED, session.id, recyclerId, trimmed, now);
  return { ok: true, session: clone(session), recycler: recyclerId ? buildRecycler(st, recyclerId) : null };
}

/** Derived recycler profile. Unknown ids simply have 0 drop-offs (UNRANKED). */
export function getRecycler(recyclerId: string): Recycler {
  return buildRecycler(getState(), normalizeId(recyclerId));
}

/**
 * Most recent voucher (by claim time) among the recycler's CLAIMED sessions, or null.
 * Lets the phone resume at the ticket after a reload without re-playing a game.
 */
export function getLatestVoucher(recyclerId: string, now: number = Date.now()): Voucher | null {
  const st = getState();
  const ids = st.claimedByRecycler.get(normalizeId(recyclerId));
  if (!ids) return null;
  let latest: MutableSession | null = null;
  for (const id of ids) {
    const session = st.sessions.get(id);
    if (!session || session.status !== SessionStatus.CLAIMED || !session.voucher) continue;
    refresh(st, session, now);
    if (latest === null || (session.claimedAt ?? 0) > (latest.claimedAt ?? 0)) latest = session;
  }
  return latest?.voucher ? clone(latest.voucher) : null;
}

/** Newest-first snapshot of sessions, for the B2B dashboard. */
export function listSessions(filter: SessionFilter = {}, now: number = Date.now()): Session[] {
  const st = getState();
  sweep(st, now);
  const wanted = filter.recyclerId ? normalizeId(filter.recyclerId) : null;
  const result: Session[] = [];
  for (const session of st.sessions.values()) {
    refresh(st, session, now);
    if (filter.status && session.status !== filter.status) continue;
    if (filter.retailer && session.retailer !== filter.retailer) continue;
    if (filter.city && session.city !== filter.city) continue;
    if (filter.category && session.category !== filter.category) continue;
    if (wanted && session.claimedByRecyclerId !== wanted) continue;
    if (filter.since !== undefined && session.createdAt < filter.since) continue;
    result.push(clone(session));
  }
  result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
}

/** Append-only audit trail (bounded), newest first. */
export function getAuditLog(limit: number = 200): AuditEvent[] {
  const st = getState();
  const safeLimit = Math.max(1, Math.min(AUDIT_MAX, Math.floor(limit)));
  return clone(st.audit.slice(-safeLimit).reverse());
}

export function getStoreStats(now: number = Date.now()): StoreStats {
  const st = getState();
  sweep(st, now);
  const byStatus: Record<SessionStatus, number> = {
    [SessionStatus.PENDING]: 0,
    [SessionStatus.CLAIMED]: 0,
    [SessionStatus.EXPIRED]: 0,
    [SessionStatus.VOID]: 0,
  };
  let activePins = 0;
  for (const session of st.sessions.values()) {
    refresh(st, session, now);
    byStatus[session.status] += 1;
    if (session.status === SessionStatus.PENDING) activePins += 1;
  }
  return {
    totalSessions: st.sessions.size,
    byStatus,
    activePins,
    recyclers: st.claimedByRecycler.size,
    auditEvents: st.audit.length,
  };
}

/**
 * DEMO ONLY. Inserts `count` historical CLAIMED sessions for a recycler so a
 * presenter can jump straight to a higher level. Disabled when the env var
 * REPLAY_DISABLE_SEED is "true". (NODE_ENV is not used because `next start`
 * is also a valid way to run the demo.)
 */
export function seedClaimedSessions(
  recyclerId: string,
  count: number,
  options: SeedOptions = {},
  now: number = Date.now(),
): { readonly ok: true; readonly sessions: Session[]; readonly recycler: Recycler } | StoreFailure {
  if (process.env.REPLAY_DISABLE_SEED === "true") return fail(StoreErrorCode.SEED_DISABLED, "Seeding is disabled in this environment.");
  const st = getState();
  const id = normalizeId(recyclerId);
  if (!UUID_PATTERN.test(id)) return fail(StoreErrorCode.INVALID_INPUT, "Invalid recycler id.");
  if (!Number.isInteger(count) || count < 1 || count > SEED_MAX_COUNT) {
    return fail(StoreErrorCode.INVALID_INPUT, `Seed count must be an integer between 1 and ${SEED_MAX_COUNT}.`);
  }
  if (options.category !== undefined && !isEnumValue(ItemCategory, options.category)) return fail(StoreErrorCode.INVALID_INPUT, "Unknown item category.");
  if (options.retailer !== undefined && !isEnumValue(Retailer, options.retailer)) return fail(StoreErrorCode.INVALID_INPUT, "Unknown retailer.");
  if (options.city !== undefined && !isEnumValue(City, options.city)) return fail(StoreErrorCode.INVALID_INPUT, "Unknown city.");
  const spreadDays = options.spreadDays === undefined ? 30 : options.spreadDays;
  if (!Number.isFinite(spreadDays) || spreadDays < 1 || spreadDays > 365) return fail(StoreErrorCode.INVALID_INPUT, "spreadDays must be between 1 and 365.");

  const dayMs = 24 * 60 * 60 * 1000;
  // Oldest first so claim ordinals increase with claim time.
  const createdTimes: number[] = [];
  for (let i = 0; i < count; i += 1) {
    createdTimes.push(now - Math.floor(((i + 1) / (count + 1)) * spreadDays * dayMs) - randomInt(0, 60 * 60 * 1000));
  }
  createdTimes.sort((a, b) => a - b);

  const categories = Object.values(ItemCategory);
  const retailers = Object.values(Retailer);
  const cities = Object.values(City);
  const inserted: Session[] = [];

  for (const createdAt of createdTimes) {
    const category = options.category ?? pick(categories);
    const config = CATEGORY_CONFIG[category];
    const jitter = 0.5 + randomInt(0, 101) / 100;
    const weight = Math.round(Math.min(config.maxWeightKg, Math.max(config.minWeightKg, config.defaultWeightKg * jitter)) * 100) / 100;
    const claimedAt = createdAt + randomInt(30_000, 3 * 60 * 1000);
    st.claimCounter += 1;
    const session: MutableSession = {
      id: randomUUID(),
      pin: "0000",
      category,
      estimatedWeightKg: weight,
      retailer: options.retailer ?? pick(retailers),
      city: options.city ?? pick(cities),
      clerkLabel: "seed",
      status: SessionStatus.CLAIMED,
      createdAt,
      expiresAt: createdAt + SESSION_TTL_MS,
      claimedAt,
      claimedByRecyclerId: id,
      claimOrdinal: st.claimCounter,
      voidedAt: null,
      voidReason: null,
      voucher: null,
      rev: 2,
      seeded: true,
    };
    st.sessions.set(session.id, session);
    indexClaim(st, id, session.id);
    inserted.push(clone(session));
  }
  recordAudit(st, AuditEventType.SEEDED, null, id, `${count} historical CLAIMED sessions`, now);
  return { ok: true, sessions: inserted, recycler: buildRecycler(st, id) };
}

/** DEMO/TEST ONLY: wipes every session, voucher, throttle record and audit event. */
export function resetStore(): void {
  const holder = globalThis as unknown as GlobalWithStore;
  holder.__replayStore__ = createState();
}
