# RePlay design system (master)

Source of truth for tokens is `app/globals.css` (HSL variables) and `tailwind.config.ts`. Page overrides live in `design-system/pages/`. Rejected skill suggestions are logged in `DEVIATIONS.md`.

## Brand
- Name: **RePlay**. Tone: friendly, honest, hyper-casual. Never imply that a game influences a reward.
- Icons: Lucide only (`lucide-react@0.577.0`). No emoji as icons, no remote images, no web fonts.

## Tokens (light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `90 25% 96%` | `152 40% 6%` | page |
| `--foreground` | `152 42% 11%` | `90 25% 94%` | text |
| `--primary` | `156 83% 27%` | `74 91% 58%` | main actions |
| `--lime` | `74 91% 58%` | same | highlights, CTA on dark |
| `--amber` | `38 92% 50%` | same | jackpot, warnings |
| `--destructive` | `0 72% 45%` | `0 72% 58%` | errors, "bad" items |
| `--level-*` | unranked, bronze, silver, gold, platinum, diamond | same | level skin tint (cosmetic) |

Game surfaces use a fixed dark field `hsl(152 55% 8%)` in both themes.

## Type
`Plus Jakarta Sans` (sans) and `JetBrains Mono` (numbers, PINs), both through `next/font` (self-hosted at build). Base 16px, line-height 1.5.

## Motion
Durations 150-300ms for UI, up to 700ms for reveals. Only `transform` and `opacity` are animated. Every animation has a `prefers-reduced-motion` fallback (global rule in `globals.css`, plus component-level checks via `useReducedMotion`).

## Touch
Minimum target 44x44px, 8px gap between neighbours, primary controls in the lower half of the screen.
