import type { NextRequest } from "next/server";
import { badRequest, errorResponse, failureResponse, internalErrorResponse, isUuid, json, parseJsonBody } from "@/lib/api";
import { getRecycler, resetStore, seedClaimedSessions } from "@/lib/session-store";
import { StoreErrorCode } from "@/types";
import type { DemoResetResponse, DemoSeedResponse, DemoStatusResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TARGET_DROP_OFFS = 50;

/** Demo tools are available only when the process was started with REPLAY_DEMO=true. */
function demoEnabled(): boolean {
  return process.env.REPLAY_DEMO === "true";
}

/**
 * GET /api/demo — 200 DemoStatusResponse { enabled }. Always answers, so the UI can hide its demo tools.
 */
export async function GET() {
  const payload: DemoStatusResponse = { enabled: demoEnabled() };
  return json(payload);
}

/**
 * POST /api/demo
 *
 * Seed:  { action: "seed", recyclerId: "<uuid>", dropOffs: 0-50 }
 *   Raises the recycler to exactly `dropOffs` CLAIMED drop-offs by inserting historical sessions.
 *   200: DemoSeedResponse { recycler, added }   (added may be 0)
 *   400: bad body / dropOffs out of range    409: target is below the current count (it only adds)
 *
 * Reset: { action: "reset" }
 *   Wipes every session, voucher, throttle record and audit event. 200: { ok: true }
 *
 * 403 DEMO_DISABLED when REPLAY_DEMO is not "true"; 500 on unexpected errors.
 */
export async function POST(request: NextRequest) {
  try {
    if (!demoEnabled()) return errorResponse("DEMO_DISABLED", "Demo tools are disabled. Start the server with REPLAY_DEMO=true.", 403);
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;

    if (body.action === "reset") {
      resetStore();
      const payload: DemoResetResponse = { ok: true };
      return json(payload);
    }

    if (body.action === "seed") {
      if (!isUuid(body.recyclerId)) return badRequest("`recyclerId` must be a UUID.");
      const target = body.dropOffs;
      if (typeof target !== "number" || !Number.isInteger(target) || target < 0 || target > MAX_TARGET_DROP_OFFS) {
        return badRequest(`\`dropOffs\` must be an integer between 0 and ${MAX_TARGET_DROP_OFFS}.`);
      }
      const current = getRecycler(body.recyclerId).dropOffs;
      if (target < current) {
        return errorResponse(StoreErrorCode.INVALID_STATE, `Recycler already has ${current} drop-offs. Seeding only adds; use Reset first.`, 409);
      }
      if (target === current) {
        const unchanged: DemoSeedResponse = { recycler: getRecycler(body.recyclerId), added: 0 };
        return json(unchanged);
      }
      const seeded = seedClaimedSessions(body.recyclerId, target - current);
      if (!seeded.ok) return failureResponse(seeded);
      const payload: DemoSeedResponse = { recycler: seeded.recycler, added: target - current };
      return json(payload);
    }

    return badRequest("`action` must be \"seed\" or \"reset\".");
  } catch (err) {
    return internalErrorResponse(err);
  }
}
