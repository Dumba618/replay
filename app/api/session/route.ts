import type { NextRequest } from "next/server";
import { buildClaimMeta } from "@/lib/analytics";
import { clientKeyFrom, failureResponse, badRequest, internalErrorResponse, json, parseJsonBody, stringOrEmpty, errorResponse, isUuid } from "@/lib/api";
import { claimSession, createSession, listSessions, pollSession, voidSession } from "@/lib/session-store";
import { toSpinPayload } from "@/lib/spin-payload";
import { LEVEL_CONFIG, MIN_DISCOUNT_PERCENT, SessionStatus, StoreErrorCode, type City, type ItemCategory, type Retailer } from "@/types";
import type { ClaimResponse, CreateSessionResponse, LevelUp, SessionPollResponse, VoidResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/session — clerk registers an item and receives a one-time PIN.
 * Body:  CreateSessionInput { category, estimatedWeightKg, retailer, city, clerkLabel? }
 * 201:   CreateSessionResponse
 * 400:   invalid body / unknown enum / weight outside the category range
 * 503:   all 10 000 PINs are currently in use
 * 500:   unexpected error
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const result = createSession({
      category: body.category as ItemCategory,
      estimatedWeightKg: body.estimatedWeightKg as number,
      retailer: body.retailer as Retailer,
      city: body.city as City,
      clerkLabel: typeof body.clerkLabel === "string" ? body.clerkLabel : undefined,
    });
    if (!result.ok) return failureResponse(result);
    const payload: CreateSessionResponse = { serverNow: Date.now(), session: result.session };
    return json(payload, 201);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

/**
 * GET /api/session?id=<sessionId>&rev=<lastSeenRev>
 * Cheap change-detection polling for the clerk terminal.
 * 200:   SessionPollResponse  ({changed:false,rev,status} when rev matches; otherwise the full session
 *        plus `levelUp` when that claim crossed a level threshold). EXPIRED/VOID are normal 200 states.
 * 400:   missing `id` or malformed `rev`
 * 404:   unknown session (or an expired one older than the 1 h retention window)
 * 500:   unexpected error
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const id = params.get("id");
    if (!id) return badRequest("Query parameter `id` is required.");
    const revParam = params.get("rev");
    if (revParam !== null && !/^\d{1,9}$/.test(revParam)) return badRequest("Query parameter `rev` must be a non-negative integer.");
    const knownRev = revParam === null ? -1 : Number(revParam);

    const poll = pollSession(id, knownRev);
    if (!poll) return errorResponse(StoreErrorCode.SESSION_NOT_FOUND, "Drop-off not found.", 404);
    if (!poll.changed) {
      const unchanged: SessionPollResponse = { serverNow: Date.now(), changed: false, rev: poll.rev, status: poll.status };
      return json(unchanged);
    }

    let levelUp: LevelUp | null = null;
    const session = poll.session;
    if (session.status === SessionStatus.CLAIMED && session.claimedByRecyclerId) {
      const meta = buildClaimMeta(listSessions({ recyclerId: session.claimedByRecyclerId })).get(session.id);
      if (meta?.leveledUp) levelUp = { from: meta.levelBefore, to: meta.level };
    }
    const changed: SessionPollResponse = { serverNow: Date.now(), changed: true, session, levelUp };
    return json(changed);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

/**
 * PATCH /api/session
 *
 * Claim (default):  { action?: "claim", pin: "1234", recyclerId: "<uuid>" }
 *   Atomically claims the session and re-derives the level. It does NOT issue a reward: the reward
 *   is produced later by POST /api/reward, from the game the player plays (random draw or score).
 *   200: ClaimResponse { session, alreadyClaimed, recycler, progressBefore, progress, levelUp|null, range, voucher|null }
 *        `alreadyClaimed: true` means an idempotent replay: nothing was counted twice.
 *   400: malformed body / PIN not 4 digits / invalid recyclerId
 *   404: PIN does not match a session
 *   409: PIN already used by a different recycler
 *   410: session expired or voided
 *   429: too many wrong PINs (Retry-After header + retryAfterMs)
 *
 * Void:  { action: "void", sessionId: "<uuid>", reason: "text" }
 *   200: VoidResponse    404: unknown session    409: session already expired    400: missing reason
 *
 * 500 on unexpected errors.
 */
export async function PATCH(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const action = body.action === undefined ? "claim" : body.action;

    if (action === "void") {
      const result = voidSession(stringOrEmpty(body.sessionId), stringOrEmpty(body.reason));
      if (!result.ok) return failureResponse(result);
      const payload: VoidResponse = { serverNow: Date.now(), session: result.session, recycler: result.recycler };
      return json(payload);
    }

    if (action !== "claim") return badRequest("`action` must be \"claim\" or \"void\".");

    const recyclerId = stringOrEmpty(body.recyclerId);
    if (!isUuid(recyclerId)) return badRequest("`recyclerId` must be a UUID.");
    const claim = claimSession({ pin: stringOrEmpty(body.pin), recyclerId, clientKey: clientKeyFrom(request) });
    if (!claim.ok) return failureResponse(claim);

    // The reward is NOT decided here. It is issued by POST /api/reward when the player finishes (or draws in) the game.
    const existing = claim.session.voucher;
    const level = claim.levelAfter;
    const payload: ClaimResponse = {
      serverNow: Date.now(),
      session: claim.session,
      alreadyClaimed: claim.alreadyClaimed,
      recycler: claim.recycler,
      progressBefore: claim.progressBefore,
      progress: claim.progressAfter,
      levelUp: claim.leveledUp ? { from: claim.levelBefore, to: claim.levelAfter } : null,
      range: { level, minPercent: MIN_DISCOUNT_PERCENT, maxPercent: LEVEL_CONFIG[level].maxDiscountPercent },
      voucher: existing ? toSpinPayload(existing, true) : null,
    };
    return json(payload);
  } catch (err) {
    return internalErrorResponse(err);
  }
}
