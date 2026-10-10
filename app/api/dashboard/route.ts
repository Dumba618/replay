import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildAuditCsv, buildDashboard } from "@/lib/analytics";
import { badRequest, internalErrorResponse, json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard                 — 200 DashboardData (aggregates + latest 100 audit rows)
 * GET /api/dashboard?format=csv      — 200 text/csv attachment with one row per session
 * 400: unknown `format`    500: unexpected error
 */
export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format");
    if (format === null || format === "json") return json(buildDashboard());
    if (format !== "csv") return badRequest("`format` must be \"json\" or \"csv\".");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return new NextResponse(buildAuditCsv(), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="replay-epr-audit-${stamp}.csv"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return internalErrorResponse(err);
  }
}
