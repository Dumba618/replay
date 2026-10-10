import type { ReactNode } from "react";
import type { SpriteName } from "@/lib/minigames/types";
import { cn } from "@/lib/utils";

/**
 * Original flat illustrations for every falling object. Each is drawn on a 64x64 grid with a
 * shared chunky outline (the current ink colour), so they read as one family at any size.
 */
const SPRITE_BODIES: Readonly<Record<SpriteName, ReactNode>> = {
  laptop: (
    <>
      <rect x="11" y="12" width="42" height="29" rx="4" fill="#5b6b85" />
      <rect x="16" y="17" width="32" height="19" rx="2" fill="#8ee0ff" stroke="none" />
      <path d="M22 30 L30 22 M32 34 L42 22" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
      <path d="M4 45 H60 L56 52 H8 Z" fill="#b6c2d6" />
    </>
  ),
  smartphone: (
    <>
      <rect x="17" y="5" width="30" height="54" rx="8" fill="#3b4a66" />
      <rect x="21" y="12" width="22" height="34" rx="3" fill="#8ee0ff" stroke="none" />
      <path d="M25 40 L32 22 M33 42 L40 26" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
      <circle cx="32" cy="52" r="2.6" fill="#cbd5e1" />
    </>
  ),
  monitor: (
    <>
      <rect x="5" y="9" width="54" height="35" rx="5" fill="#5b6b85" />
      <rect x="10" y="14" width="44" height="25" rx="2" fill="#8ee0ff" stroke="none" />
      <path d="M17 34 L27 20 M30 36 L42 20" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
      <rect x="27" y="44" width="10" height="8" fill="#b6c2d6" />
      <rect x="17" y="52" width="30" height="7" rx="3.5" fill="#b6c2d6" />
    </>
  ),
  headphones: (
    <>
      <path d="M12 40 V32 A20 20 0 0 1 52 32 V40" fill="none" strokeWidth="9" />
      <path d="M12 40 V32 A20 20 0 0 1 52 32 V40" fill="none" stroke="#ff6b6b" strokeWidth="3.5" />
      <rect x="7" y="34" width="14" height="22" rx="6" fill="#ff6b6b" />
      <rect x="43" y="34" width="14" height="22" rx="6" fill="#ff6b6b" />
    </>
  ),
  camera: (
    <>
      <rect x="21" y="10" width="22" height="10" rx="3" fill="#475569" />
      <rect x="5" y="17" width="54" height="38" rx="8" fill="#475569" />
      <circle cx="32" cy="36" r="13" fill="#e2e8f0" />
      <circle cx="32" cy="36" r="7" fill="#1e3a5f" />
      <circle cx="50" cy="26" r="3" fill="#ffd23f" />
    </>
  ),
  controller: (
    <>
      <path d="M13 22 H51 C58 22 61 34 58 44 C56 51 49 51 45 44 L41 38 H23 L19 44 C15 51 8 51 6 44 C3 34 6 22 13 22 Z" fill="#8b5cf6" />
      <rect x="16" y="29" width="10" height="4" rx="1" fill="#ffffff" stroke="none" />
      <rect x="19" y="26" width="4" height="10" rx="1" fill="#ffffff" stroke="none" />
      <circle cx="43" cy="28" r="3" fill="#ffd23f" />
      <circle cx="49" cy="33" r="3" fill="#ff6b6b" />
    </>
  ),
  speaker: (
    <>
      <rect x="13" y="5" width="38" height="54" rx="9" fill="#475569" />
      <circle cx="32" cy="20" r="7" fill="#94a3b8" />
      <circle cx="32" cy="42" r="12" fill="#94a3b8" />
      <circle cx="32" cy="42" r="5" fill="#334155" />
    </>
  ),
  charger: (
    <>
      <rect x="22" y="6" width="6" height="14" rx="2" fill="#94a3b8" />
      <rect x="36" y="6" width="6" height="14" rx="2" fill="#94a3b8" />
      <rect x="14" y="18" width="36" height="26" rx="8" fill="#f1f5f9" />
      <path d="M33 22 l-6 10 h5 l-2 8 8-12 h-5 z" fill="#facc15" strokeWidth="2" />
      <path d="M32 44 C32 56 18 50 18 62" fill="none" strokeWidth="4" />
    </>
  ),
  banana: (
    <>
      <path d="M9 42 C9 19 32 5 56 11 C54 17 46 18 42 22 C30 30 25 41 23 54 C15 54 9 49 9 42 Z" fill="#ffd23f" />
      <path d="M52 8 L58 5 L58 14 Z" fill="#7a5200" strokeWidth="2" />
      <path d="M17 40 C19 28 28 19 40 16" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.6" />
    </>
  ),
  apple: (
    <>
      <path d="M32 18 C16 10 5 28 13 45 C18 56 26 59 32 54 C38 59 46 56 51 45 C59 28 48 10 32 18 Z" fill="#ef4444" />
      <path d="M32 18 C32 10 37 5 44 5 C44 13 38 17 32 18 Z" fill="#22c55e" />
      <path d="M17 30 C18 25 21 22 25 21" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.6" />
    </>
  ),
  carrot: (
    <>
      <ellipse cx="25" cy="10" rx="4" ry="9" transform="rotate(-25 25 10)" fill="#22c55e" />
      <ellipse cx="39" cy="10" rx="4" ry="9" transform="rotate(25 39 10)" fill="#22c55e" />
      <path d="M32 14 C46 19 50 31 37 57 C35 62 29 62 27 57 C14 31 18 19 32 14 Z" fill="#fb923c" />
      <path d="M24 30 H31 M33 40 H40 M27 48 H32" stroke="#c2410c" strokeWidth="2.5" fill="none" />
    </>
  ),
  pizza: (
    <>
      <path d="M6 14 C24 4 44 4 58 14 L33 59 Z" fill="#fbbf24" />
      <path d="M6 14 C24 4 44 4 58 14 L55 22 C42 14 22 14 9 22 Z" fill="#d97706" />
      <circle cx="29" cy="30" r="5" fill="#dc2626" strokeWidth="2.5" />
      <circle cx="39" cy="38" r="4" fill="#dc2626" strokeWidth="2.5" />
      <circle cx="31" cy="45" r="3.5" fill="#dc2626" strokeWidth="2.5" />
    </>
  ),
  soda: (
    <>
      <rect x="35" y="2" width="4" height="14" rx="2" fill="#f1f5f9" transform="rotate(12 37 9)" />
      <rect x="13" y="12" width="38" height="9" rx="4" fill="#f1f5f9" />
      <path d="M16 21 H48 L44 59 H20 Z" fill="#fda4af" />
      <path d="M17.5 32 H46.5 L45.4 44 H18.6 Z" fill="#ffffff" stroke="none" />
    </>
  ),
  egg: (
    <>
      <path d="M32 6 C46 6 54 26 54 38 C54 50 44 58 32 58 C20 58 10 50 10 38 C10 26 18 6 32 6 Z" fill="#fff7ed" />
      <path d="M20 28 C21 21 25 15 30 13" fill="none" stroke="#fdba74" strokeWidth="3.5" opacity="0.8" />
    </>
  ),
  battery: (
    <>
      <rect x="27" y="5" width="10" height="8" rx="2" fill="#94a3b8" />
      <rect x="19" y="11" width="26" height="49" rx="7" fill="#facc15" />
      <rect x="19" y="31" width="26" height="13" fill="#1f2937" />
      <path d="M34 33 l-6 7 h5 l-2 7 8-9 h-5 z" fill="#facc15" strokeWidth="1.8" />
    </>
  ),
  "battery-green": (
    <>
      <rect x="27" y="5" width="10" height="8" rx="2" fill="#94a3b8" />
      <rect x="19" y="11" width="26" height="49" rx="7" fill="#4ade80" />
      <rect x="19" y="31" width="26" height="13" fill="#1f2937" />
      <path d="M34 33 l-6 7 h5 l-2 7 8-9 h-5 z" fill="#4ade80" strokeWidth="1.8" />
    </>
  ),
  star: (
    <>
      <circle cx="32" cy="32" r="26" fill="#ffd23f" />
      <circle cx="32" cy="32" r="19" fill="#ffe37a" stroke="none" />
      <path d="M32 15 L37.5 26 L49.5 27.7 L40.8 36.2 L42.9 48.2 L32 42.5 L21.1 48.2 L23.2 36.2 L14.5 27.7 L26.5 26 Z" fill="#f59e0b" strokeWidth="2.5" />
    </>
  ),
  milk: (
    <>
      <path d="M18 22 L32 6 L46 22 Z" fill="#93c5fd" />
      <rect x="18" y="22" width="28" height="37" rx="3" fill="#f8fafc" />
      <circle cx="32" cy="40" r="8" fill="#93c5fd" strokeWidth="2.5" />
    </>
  ),
};

interface SpriteProps {
  name: SpriteName;
  className?: string;
}

/** One illustrated object. Decorative: callers supply any accessible label. */
export function Sprite({ name, className }: SpriteProps) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-full overflow-visible", className)} aria-hidden="true" focusable="false">
      <g stroke="hsl(var(--ink))" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        {SPRITE_BODIES[name]}
      </g>
    </svg>
  );
}
