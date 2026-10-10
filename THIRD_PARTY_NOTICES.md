# Third-party notices

RePlay uses the following open-source packages in the game experience. Versions are pinned in `package.json`; the full licence text ships inside each package in `node_modules`.

| Package | Version | Licence | Used for | Our changes |
|---|---|---|---|---|
| [spin-wheel](https://github.com/CrazyTim/spin-wheel) (CrazyTim) | 5.0.2 | MIT | The Fortune Wheel in `components/verify/fortune-wheel.tsx` | Styled with RePlay colours, made non-interactive (no dragging), driven only by `spinToItem(serverIndex)`; own pointer and hub overlays. The library never chooses a result. |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | 1.9.4 | ISC | Celebration bursts in `lib/confetti.ts` | Brand colours, loaded on demand, disabled under reduced motion. |
| [lucide-react](https://github.com/lucide-icons/lucide) | 0.577.0 | ISC | Icons | None. |
| [framer-motion](https://github.com/motiondivision/motion) | 12.43.0 | MIT | Level-up overlay animation | None. |

## Reference game

| Project | Licence | How it was used |
|---|---|---|
| [DeveloperWilliams/Catch-the-Falling-Objects-game](https://github.com/DeveloperWilliams/Catch-the-Falling-Objects-game) | README states MIT, but the repository has no `LICENSE` file | Read as a reference. The golden bonus object idea (a rare item worth extra points) was re-implemented in `lib/minigames/catch-engine.ts`; no code or assets were copied. Used with the project owner's consent for a hackathon prototype. Re-check the licence before any commercial release. |

## Games that are not open-source imports

Recycle Catch, Pick a Device, Claw Machine and all sprites and backgrounds are RePlay's own original code and artwork. A search for permissively licensed (MIT) drop-in versions found nothing usable: the only claw-machine repository found targets the old Phaser 2 engine with an Eclipse project layout, and no falling-item catch game with a confirmed licence turned up.
