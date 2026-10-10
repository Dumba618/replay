import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { StoreErrorCode, type StoreFailure } from "@/types";
import { UUID_PATTERN, type ApiErrorBody, type ApiErrorCode } from "@/types/api";

const NO_STORE: Record<string, string> = { "Cache-Control": "no-store, max-age=0" };

export function json<T>(body: T, status: number = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function errorResponse(error: ApiErrorCode, message: string, status: number, retryAfterMs?: number): NextResponse {
  const body: ApiErrorBody = retryAfterMs === undefined ? { error, message } : { error, message, retryAfterMs };
  const headers: Record<string, string> = retryAfterMs === undefined ? {} : { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) };
  return json(body, status, headers);
}

/** Maps a store error code to its HTTP status. */
export function statusForError(code: StoreErrorCode): number {
  switch (code) {
    case StoreErrorCode.INVALID_INPUT:
      return 400;
    case StoreErrorCode.FORBIDDEN:
    case StoreErrorCode.SEED_DISABLED:
      return 403;
    case StoreErrorCode.PIN_NOT_FOUND:
    case StoreErrorCode.SESSION_NOT_FOUND:
    case StoreErrorCode.VOUCHER_NOT_FOUND:
      return 404;
    case StoreErrorCode.ALREADY_CLAIMED:
    case StoreErrorCode.NOT_CLAIMED:
    case StoreErrorCode.INVALID_STATE:
      return 409;
    case StoreErrorCode.SESSION_EXPIRED:
    case StoreErrorCode.SESSION_VOID:
    case StoreErrorCode.SPIN_WINDOW_CLOSED:
    case StoreErrorCode.VOUCHER_EXPIRED:
      return 410;
    case StoreErrorCode.TOO_MANY_ATTEMPTS:
      return 429;
    case StoreErrorCode.CAPACITY_EXHAUSTED:
      return 503;
  }
}

export function failureResponse(failure: StoreFailure): NextResponse {
  return errorResponse(failure.error, failure.message, statusForError(failure.error), failure.retryAfterMs);
}

export function badRequest(message: string): NextResponse {
  return errorResponse("BAD_REQUEST", message, 400);
}

export function internalErrorResponse(err: unknown): NextResponse {
  console.error("[RePlay] unhandled API error", err);
  return errorResponse("INTERNAL", "Something went wrong on the server.", 500);
}

export type ParsedBody = { readonly ok: true; readonly body: Record<string, unknown> } | { readonly ok: false; readonly response: NextResponse };

/** Reads a JSON object body; malformed or non-object payloads become a 400 response. */
export async function parseJsonBody(request: NextRequest): Promise<ParsedBody> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest("Request body must be valid JSON.") };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, response: badRequest("Request body must be a JSON object.") };
  }
  return { ok: true, body: raw as Record<string, unknown> };
}

/** Best-effort client identifier for the PIN brute-force throttle. */
export function clientKeyFrom(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || undefined;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}
