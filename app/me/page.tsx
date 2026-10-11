"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft, Info, Loader2, RotateCcw } from "lucide-react";
import { LEVEL_CONFIG, Level, Retailer, rewardRangeForLevel, type Recycler } from "@/types";
import type { RecyclerResponse } from "@/types/api";
import { apiFetch } from "@/lib/client-api";
import { setLang, useLang, type Lang } from "@/lib/i18n";
import { enabledMinigames, MINIGAMES } from "@/lib/minigames/registry";
import { hashString } from "@/lib/minigames/rng";
import { EMPTY_ARCADE, loadArcade, recordResult, type ArcadeState } from "@/lib/minigames/storage";
import { STORE_THEME_BY_RETAILER, THEMES } from "@/lib/minigames/themes";
import type { MinigameId, MinigameResult } from "@/lib/minigames/types";
import { getOrCreateRecyclerId } from "@/lib/recycler-client";
import { RewardsSheet } from "@/components/game/RewardsSheet";
import { Stars } from "@/components/game/Stars";
import { GAME_ICONS } from "@/components/game/minigames/icons";
import { MinigameHost } from "@/components/game/minigames/MinigameHost";
import { Scene } from "@/components/game/minigames/Scene";
import { Logo } from "@/components/logo";
import { LevelBadge } from "@/components/level-badge";
import { LevelPath } from "@/components/level-path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PracticeRun {
  readonly id: MinigameId;
  readonly seed: number;
  readonly result: MinigameResult | null;
}

export default function MePage() {
  const reducedMotion = useReducedMotion() ?? false;
  const { lang, t } = useLang();
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [arcade, setArcade] = useState<ArcadeState>(EMPTY_ARCADE);
  const [run, setRun] = useState<PracticeRun | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setArcade(loadArcade());
    const id = getOrCreateRecyclerId();
    void apiFetch<RecyclerResponse>(`/api/recycler?recyclerId=${encodeURIComponent(id)}`).then((response) => {
      if (response.ok) setRecycler(response.data.recycler);
      else setError(response.error.message);
    });
  }, []);

  const start = (id: MinigameId) => setRun({ id, seed: hashString(`practice-${id}-${Date.now()}`), result: null });
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const finish = useCallback((id: MinigameId, result: MinigameResult) => {
    setArcade(recordResult(id, result));
    setRun((current) => (current ? { ...current, result } : current));
  }, []);

  const level = recycler?.level ?? Level.UNRANKED;
  const levelColor = `hsl(var(--level-${level.toLowerCase()}))`;

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-sky">
    <Scene className="fixed" />
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-12 pt-5">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/verify" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-secondary">
          <ArrowLeft className="size-4" aria-hidden="true" /> {t("me.back")}
        </Link>
      </header>

      <h1 className="text-3xl font-extrabold tracking-tight">{t("me.title")}</h1>

      <Card>
        <CardContent className="space-y-4 p-5">
          {recycler ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <LevelBadge level={recycler.level} showLabel />
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold leading-none">{recycler.dropOffs}</p>
                  <p className="text-xs text-muted-foreground">drop-offs</p>
                </div>
              </div>
              <LevelPath progress={recycler.progress} />
              <p className="text-xs text-muted-foreground">{LEVEL_CONFIG[recycler.level].tagline}</p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {error ?? "Loading…"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("me.practice")}</CardTitle>
          <CardDescription>{t("me.practiceNote")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-secondary p-3 text-sm">
            <span>
              {t("me.totalStars")}: <span className="font-mono font-bold">{arcade.totalStars}</span>
            </span>
            <span>
              {t("me.plays")}: <span className="font-mono font-bold">{arcade.plays}</span>
            </span>
          </div>
          <ul className="space-y-2">
            {enabledMinigames().map((id) => {
              const game = MINIGAMES[id];
              const Icon = GAME_ICONS[game.icon];
              const best = arcade.best[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => start(id)}
                    className={cn(
                      "flex min-h-16 w-full cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{lang === "ka" ? game.labelKa : game.labelEn}</span>
                      <span className="block text-xs text-muted-foreground">
                        {game.kind === "SKILL" && best ? `${t("me.best")}: ${best.score}` : lang === "ka" ? game.descKa : game.descEn}
                      </span>
                    </span>
                    {game.kind === "SKILL" ? <Stars count={best?.stars ?? 0} className="[&_svg]:size-5" /> : <Badge variant="outline">{game.durationSec}s</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <Button variant="outline" className="w-full" onClick={() => setSheetOpen(true)}>
            <Info aria-hidden="true" /> {t("intro.how")}
          </Button>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{t("me.language")}</span>
            <div role="radiogroup" aria-label={t("me.language")} className="flex gap-2">
              {(["en", "ka"] as const satisfies readonly Lang[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={lang === option}
                  onClick={() => setLang(option)}
                  className={cn(
                    "min-h-11 min-w-14 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors",
                    lang === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  {option === "en" ? "EN" : "ქა"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {run && run.result === null && (
        <MinigameHost
          key={run.seed}
          gameId={run.id}
          theme={THEMES[STORE_THEME_BY_RETAILER[Retailer.ELIT]]}
          level={level}
          levelColor={levelColor}
          reward={{
            minPercent: rewardRangeForLevel(level).min,
            maxPercent: rewardRangeForLevel(level).max,
            segments: LEVEL_CONFIG[level].wheel,
            draw: async () => {
              const segments = LEVEL_CONFIG[level].wheel;
              const segmentIndex = Math.floor(Math.random() * segments.length);
              return { discountPercent: segments[segmentIndex]?.discountPercent ?? 0, segmentIndex };
            },
          }}
          seed={run.seed}
          mode="PRACTICE"
          reducedMotion={reducedMotion}
          onFinish={(result) => finish(run.id, result)}
        />
      )}

      {run && run.result !== null && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-6 anim-fade-in" role="dialog" aria-modal="true" aria-label={t("reveal.practice")}>
          <div className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 text-center">
            <h2 className="text-xl font-extrabold">{lang === "ka" ? MINIGAMES[run.id].labelKa : MINIGAMES[run.id].labelEn}</h2>
            <p className="text-sm text-muted-foreground">{t("reveal.practice")}</p>
            {MINIGAMES[run.id].kind === "SKILL" && !run.result.skipped && (
              <div className="space-y-2">
                <Stars count={run.result.stars} className="justify-center" />
                <p className="text-sm">
                  {t("result.score")}: <span className="font-mono text-lg font-bold">{run.result.score}</span>
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRun(null)}>
                {t("me.close")}
              </Button>
              <Button className="flex-1" onClick={() => start(run.id)}>
                <RotateCcw aria-hidden="true" /> {t("me.playAgain")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <RewardsSheet open={sheetOpen} onClose={closeSheet} />
    </main>
    </div>
  );
}
