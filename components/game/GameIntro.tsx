"use client";

import { Gift, Info, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME_ICONS } from "@/components/game/minigames/icons";
import { Sprite } from "@/components/game/minigames/sprites";
import { useLang } from "@/lib/i18n";
import type { MinigameDef, SpriteName } from "@/lib/minigames/types";

const SHOWCASE: Readonly<Record<MinigameDef["id"], readonly SpriteName[]>> = {
  RECYCLE_CATCH: ["smartphone", "banana", "battery"],
  PICK_BOX: ["laptop", "smartphone", "headphones"],
  CLAW: ["camera", "controller", "speaker"],
  WHEEL: ["star", "charger", "monitor"],
};

interface GameIntroProps {
  game: MinigameDef;
  reducedMotion: boolean;
  onPlay: () => void;
  onRevealNow: () => void;
  onHow: () => void;
}

/** GAME_INTRO stage: names the game and states, honestly, that the reward is already unlocked. */
export function GameIntro({ game, reducedMotion, onPlay, onRevealNow, onHow }: GameIntroProps) {
  const { lang, t } = useLang();
  const Icon = GAME_ICONS[game.icon];
  return (
    <section className="space-y-6 text-center" aria-labelledby="intro-title">
      <div className="relative mx-auto flex h-28 max-w-xs items-end justify-center gap-2" aria-hidden="true">
        {SHOWCASE[game.id].map((sprite, index) => (
          <span key={sprite} className={reducedMotion ? "size-20" : "anim-bob size-20"} style={reducedMotion ? undefined : { animationDelay: `${index * 0.35}s` }}>
            <Sprite name={sprite} />
          </span>
        ))}
      </div>
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-white px-4 py-1 text-sm font-bold text-ink shadow-[0_3px_0_hsl(var(--ink)/0.3)]">
          <Gift className="size-4 text-primary" aria-hidden="true" /> {t("intro.unlocked")}
        </p>
        <h1 id="intro-title" className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Icon className="size-7 text-azure" aria-hidden="true" />
          {lang === "ka" ? game.labelKa : game.labelEn}
        </h1>
        <p className="font-medium text-ink/80">{lang === "ka" ? game.descKa : game.descEn}</p>
      </div>
      <p className="rounded-2xl border-2 border-ink/20 bg-white/90 p-4 text-sm font-semibold">
        {t("intro.fun")} {t("intro.local")}
      </p>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={onPlay} className="w-full">
          <Play aria-hidden="true" /> {t("intro.play")}
        </Button>
        {reducedMotion && (
          <Button size="lg" variant="outline" onClick={onRevealNow} className="w-full">
            {t("intro.revealNow")}
          </Button>
        )}
        <Button variant="ghost" onClick={onHow} className="mx-auto">
          <Info aria-hidden="true" /> {t("intro.how")}
        </Button>
      </div>
    </section>
  );
}
