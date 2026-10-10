# Deviations from skill suggestions

| Suggestion (ui-ux-pro-max) | Decision | Reason |
|---|---|---|
| Style "Pixel Art" with fonts `Press Start 2P` / `VT323` | Rejected | Needs web fonts from Google Fonts; brief forbids web fonts and CDNs. |
| Neon red + blue palette (`#DC2626` / `#2563EB`) | Rejected | Clashes with RePlay's green/lime brand; red is reserved for "bad item"/errors. |
| Style "Cyberpunk UI": scanlines, glitch, neon text-shadow | Rejected | Heavy paint effects (blur/text-shadow animation) violate "animate only transform and opacity" and hurt low-end phones. |
| Style "HUD / Sci-Fi FUI" fine-line drawing animation | Rejected | Needs SVG stroke animation; not transform/opacity. Kept only the HUD idea. |
| Pattern "Hero-Centric Design" | Not applicable | Landing-page pattern; games are in-flow screens. |
| "Instant transitions" for pixel style | Rejected | Conflicts with the 150-300ms feedback guideline. |
| "Vibrate on confirmations" guideline | Adopted, narrowed | Only catch/miss/confirm; off under reduced motion. |
| "Auto-rotating content needs user control" | Adopted | Mapped to the always-available Skip button and the 30 s cap. |
| Timer ring as animated `stroke-dashoffset` | Changed | Not transform/opacity. Ring is redrawn in discrete 4 Hz steps (no CSS transition). |
| Framer Motion / game engines (Phaser, Pixi) | Not added | Brief: no new dependencies. `framer-motion` was already in the project and is used only by the existing level-up overlay. Games use refs, CSS keyframes and SVG. |
| Spec names `lib/config.ts`, `rewards.ts`, `badges.ts`, `i18n` (assumed to exist) | Adapted | Not in this project. Thresholds/prizes stay in `types/index.ts`; minimal `lib/i18n.ts` and `lib/haptics.ts` were created; there is no badge system, so the `BADGES` stage exists in the state machine but is never entered. |
| Tailwind v4 | Not applicable | Project is on Tailwind 3.4.19. |

## Round 2 (direction B)
| Suggestion / earlier choice | Decision | Reason |
|---|---|---|
| Orange/yellow "friendly illustrated" theme (round 1) | Replaced | Owner rejected it; direction B (bright green/blue/yellow, level path) chosen. |
| Dotted / striped textures on the backdrop | Removed | Owner asked for no texture; depth comes from layered shapes and parallax only. |
| Lucide icon tiles for falling items | Replaced with original SVG sprites | Owner asked for real objects (banana, battery...), not boxes. |
| Gift box and capsule illustrations | Replaced with gadget sprites | Pick a Box became Pick a Device; the claw now lifts gadgets. |
| Duolingo-style streaks | Not implemented | RePlay has no streak data; showing one would be invented. |
| Hosting a reference falling-objects game | Used as reference only | The repo has no LICENSE file; the golden bonus idea was re-implemented, no code copied. |
