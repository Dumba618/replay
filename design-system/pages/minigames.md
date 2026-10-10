# Page override: minigames (`/verify` game stages, `/me` practice)

Direction chosen by the project owner: **B "Bold level path"** with a **2.5D layered-hills background, no texture**.
Research that informed it (Too Good To Go, Starbucks Rewards, Duolingo, Plastic Bank, hyper-casual HUD guidance) is summarised in the project chat; skill output from ui-ux-pro-max was used for type pairing (Fredoka + Nunito) and touch/motion rules.

## Look
- Bright flat colour, chunky 3px ink outlines, offset "button-press" shadows, rounded display font for numbers and headings.
- Palette: leaf green (primary actions), azure (controls, timer), sunshine yellow (highlights), flame orange (jackpot), sky blue backdrop, navy ink.
- **Backdrop** (`Scene`): sky + sun + drifting clouds, then three flat hill layers with a lighter crest line and a soft cast shadow. The layers shift at different speeds with the pointer or finger (transform only). No textures, no gradients, no network assets. Static under reduced motion.
- **Level path**: the six levels as a path (done = tick, current = highlighted badge, rest = locked) plus the drop-off progress bar.

## Games
| Id | Name | Kind | Notes |
|---|---|---|---|
| `RECYCLE_CATCH` | Recycle Catch | SKILL | Illustrated gadgets fall (laptop, phone, headphones...). Catch them in the bin; dodge banana, apple, pizza, plastic cup. Battery restores a heart, golden coin is worth 5x. Pop-up points, bin squash, red flash on a miss. |
| `WHEEL` | Fortune Wheel | LUCK | Open-source `spin-wheel`, animates to the server-chosen segment. |
| `PICK_BOX` | Pick a Device | LUCK | Three gadgets; whichever is tapped shows the already-set reward (disclosed). |
| `CLAW` | Claw Machine | LUCK | Claw lifts a gadget that opens to the already-set reward (disclosed). |

## Rules (unchanged)
Touch targets >= 44px, controls in the lower half, contrast >= 4.5:1 for text, good/bad/power-up/bonus differ by badge shape (check, cross, bolt, star) as well as colour, transform/opacity-only animation, reduced-motion fallbacks, Skip from 3 s, 30 s hard cap, prize decided by the server and never influenced by a game.
