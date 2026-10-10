import type { ApiErrorBody } from "@/types/api";

export interface ClientApiError {
  readonly error: ApiErrorBody["error"] | "NETWORK";
  readonly message: string;
  readonly status: number;
  readonly retryAfterMs?: number;
}

export type ClientApiResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ClientApiError };

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "error" in value && "message" in value;
}

/** fetch wrapper: never throws; always resolves to a typed success or error. */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ClientApiResult<T>> {
  try {
    const response = await fetch(input, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      if (isApiErrorBody(payload)) {
        return {
          ok: false,
          error: { error: payload.error, message: payload.message, status: response.status, retryAfterMs: payload.retryAfterMs },
        };
      }
      return { ok: false, error: { error: "INTERNAL", message: "Unexpected server response.", status: response.status } };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: { error: "NETWORK", message: "Cannot reach the RePlay server.", status: 0 } };
  }
}
