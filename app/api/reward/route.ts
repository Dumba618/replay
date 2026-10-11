import type { NextRequest } from "next/server";
import { badRequest, failureResponse, internalErrorResponse, isUuid, json, parseJsonBody, stringOrEmpty } from "@/lib/api";
import { awardSkillVoucher, spinForVoucher } from "@/lib/session-store";
import { toSpinPayload } from "@/lib/spin-payload";
import { drawSegment } from "@/lib/wheel";
import { isMinigameId, MINIGAMES } from "@/lib/minigames/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reward — issue the single reward of a CLAIMED session. Nothing is decided at claim time.
 *
 * Body: RewardBody { sessionId, recyclerId, gameId?, score?, durationMs? }
 *  - LUCK games (and any request without a skill game): the server draws a weighted random segment
 *    from the player's level table right now, with a cryptographic RNG.
 *  - SKILL games: the discount scales with `score` between the 15% floor and the level's cap. The
 *    game's kind and full-score target come from the server registry, never from the client.
 * One reward per session: a repeat call returns the same voucher (`alreadySpun: true`).
 *
 * 200: SpinPayload   400: bad body / implausible score or play time   403: not your drop-off
 * 404: unknown session   409: not claimed yet   410: cancelled or the reward window closed   500: unexpected
 *
 * Limitation: a skill score is reported by the phone. The server bounds it by the time elapsed since the
 * claim and a points-per-second ceiling, but a determined cheater could still inflate it; a production
 * version would replay the recorded inputs on the server.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const recyclerId = stringOrEmpty(body.recyclerId);
    const sessionId = stringOrEmpty(body.sessionId);
    if (!isUuid(recyclerId)) return badRequest("`recyclerId` must be a UUID.");
    if (sessionId.length === 0) return badRequest("`sessionId` is required.");

    const gameId = body.gameId;
    const def = isMinigameId(gameId) ? MINIGAMES[gameId] : null;
    if (gameId !== undefined && def === null) return badRequest("Unknown `gameId`.");

    if (def && def.kind === "SKILL" && def.fullScore !== null) {
      if (typeof body.score !== "number" || typeof body.durationMs !== "number") return badRequest("Skill games need numeric `score` and `durationMs`.");
      const result = awardSkillVoucher({ sessionId, recyclerId, gameId: def.id, score: body.score, durationMs: body.durationMs, fullScore: def.fullScore });
      if (!result.ok) return failureResponse(result);
      return json(toSpinPayload(result.voucher, result.alreadySpun));
    }

    const result = spinForVoucher({ sessionId, recyclerId }, drawSegment);
    if (!result.ok) return failureResponse(result);
    return json(toSpinPayload(result.voucher, result.alreadySpun));
  } catch (err) {
    return internalErrorResponse(err);
  }
}
