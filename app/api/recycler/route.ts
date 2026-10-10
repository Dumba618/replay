import type { NextRequest } from "next/server";
import { badRequest, internalErrorResponse, isUuid, json } from "@/lib/api";
import { getLatestVoucher, getRecycler } from "@/lib/session-store";
import { toSpinPayload } from "@/lib/spin-payload";
import type { RecyclerResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/recycler?recyclerId=<uuid>
 * 200: RecyclerResponse { recycler: { recyclerId, dropOffs, level, progress, lastClaimAt }, latestVoucher }
 *      `latestVoucher` is the newest issued voucher (or null); the phone uses it to resume at the ticket.
 *      Level and progress are derived from the recycler's CLAIMED sessions. An unknown id is a
 *      valid brand-new profile (0 drop-offs, UNRANKED), so there is no 404.
 * 400: missing or malformed recyclerId
 * 500: unexpected error
 */
export async function GET(request: NextRequest) {
  try {
    const recyclerId = request.nextUrl.searchParams.get("recyclerId");
    if (!isUuid(recyclerId)) return badRequest("Query parameter `recyclerId` must be a UUID.");
    const voucher = getLatestVoucher(recyclerId);
    const payload: RecyclerResponse = { recycler: getRecycler(recyclerId), latestVoucher: voucher ? toSpinPayload(voucher, true) : null };
    return json(payload);
  } catch (err) {
    return internalErrorResponse(err);
  }
}
