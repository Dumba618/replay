import { UUID_PATTERN } from "@/types/api";

const STORAGE_KEY = "replay.recyclerId";
const COOKIE_NAME = "replay_rid";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * RFC 4122 v4 UUID. `crypto.randomUUID` only exists in secure contexts, and a
 * phone opening http://<laptop-ip>:3000 is NOT one, so build it from
 * `getRandomValues` (available everywhere).
 */
function generateUuid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readCookie(): string | null {
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : null;
}

function persist(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode: the cookie below still keeps the profile for this browser.
  }
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

/** Returns the anonymous recycler id, creating and storing one on first visit. Browser only. */
export function getOrCreateRecyclerId(): string {
  const stored = readStorage();
  if (stored && UUID_PATTERN.test(stored)) {
    persist(stored);
    return stored;
  }
  const fromCookie = readCookie();
  if (fromCookie && UUID_PATTERN.test(fromCookie)) {
    persist(fromCookie);
    return fromCookie;
  }
  const created = generateUuid();
  persist(created);
  return created;
}

/** Demo helper: forgets the current profile and creates a brand-new one. */
export function createNewRecyclerId(): string {
  const created = generateUuid();
  persist(created);
  return created;
}
