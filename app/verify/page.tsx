"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, Loader2, RefreshCw, ShieldCheck, User } from "lucide-react";
import { LEVEL_CONFIG, type Level, type LevelProgress, type Recycler } from "@/types";
import type { ClaimBody, ClaimResponse, DemoStatusResponse, RecyclerResponse, RewardBody, SpinPayload } from "@/types/api";
import { apiFetch, type ClientApiError } from "@/lib/client-api";
import { useLang } from "@/lib/i18n";
import { nextStage, type FlowContext, type RewardStage } from "@/lib/minigames/flow";
import { pickMinigame } from "@/lib/minigames/pick";
import { enabledMinigames, isMinigameId, MINIGAMES } from "@/lib/minigames/registry";
import { clearResume, getResume, loadArcade, recordPick, recordResult, setResume } from "@/lib/minigames/storage";
import { STORE_THEME_BY_RETAILER, THEMES } from "@/lib/minigames/themes";
import type { MinigameId, MinigameResult, RewardDraw } from "@/lib/minigames/types";
import { createNewRecyclerId, getOrCreateRecyclerId } from "@/lib/recycler-client";
import { ConfirmedStage } from "@/components/game/ConfirmedStage";
import { GameIntro } from "@/components/game/GameIntro";
import { MinigameHost } from "@/components/game/minigames/MinigameHost";
import { PrizeReveal } from "@/components/game/minigames/PrizeReveal";
import { RewardsSheet } from "@/components/game/RewardsSheet";
import { Stars } from "@/components/game/Stars";
import { Scene } from "@/components/game/minigames/Scene";
import { Logo } from "@/components/logo";
import { LevelBadge } from "@/components/level-badge";
import { LevelPath } from "@/components/level-path";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DemoTools } from "@/components/verify/demo-tools";
import { LevelUpCelebration } from "@/components/verify/level-up-celebration";
import { PinInput } from "@/components/verify/pin-input";
import { VoucherTicket } from "@/components/verify/voucher-ticket";

const MIN_HANDSHAKE_MS = 1100;

function describeError(error: ClientApiError): string {
  switch (error.error) {
    case "PIN_NOT_FOUND":
      return "That PIN doesn't match an active drop-off. Check the code on the clerk's screen.";
    case "SESSION_EXPIRED":
      return "That PIN has expired. Ask the clerk for a new one.";
    case "SESSION_VOID":
      return "That drop-off was cancelled by the clerk.";
    case "ALREADY_CLAIMED":
      return "That PIN was already used by another profile.";
    case "TOO_MANY_ATTEMPTS":
      return `Too many wrong PINs. Try again in ${Math.max(1, Math.ceil((error.retryAfterMs ?? 60000) / 1000))}s.`;
    case "NETWORK":
      return "Can't reach the RePlay server. Check that your phone is on the store Wi-Fi.";
    default:
      return error.message;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Real randomness for the game seed and the game choice (nothing is derived from the session id). */
function randomFloat(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] ?? 0) / 4294967296;
}

function randomSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 1;
}

function levelColor(level: Level): string {
  return `hsl(var(--level-${level.toLowerCase()}))`;
}

export default function VerifyPage() {
  const reducedMotion = useReducedMotion() ?? false;
  const { t } = useLang();
  const [recyclerId, setRecyclerId] = useState<string | null>(null);
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [stage, setStage] = useState<RewardStage>("IDLE");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [claim, setClaim] = useState<ClaimResponse | null>(null);
  const [reward, setReward] = useState<SpinPayload | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [awardFailed, setAwardFailed] = useState(false);
  const [pendingFinish, setPendingFinish] = useState<MinigameResult | null>(null);
  const [playSeed, setPlaySeed] = useState(1);
  const [gameId, setGameId] = useState<MinigameId | null>(null);
  const [result, setResult] = useState<MinigameResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [booting, setBooting] = useState(true);
  const inFlight = useRef(false);

  const loadRecycler = useCallback(async (id: string): Promise<RecyclerResponse | null> => {
    const response = await apiFetch<RecyclerResponse>(`/api/recycler?recyclerId=${encodeURIComponent(id)}`);
    if (!response.ok) {
      setError(describeError(response.error));
      return null;
    }
    setRecycler(response.data.recycler);
    setProgress(response.data.recycler.progress);
    return response.data;
  }, []);

  // Bootstrap: recycler id, profile, demo flag, and reload-resume at the ticket.
  useEffect(() => {
    const id = getOrCreateRecyclerId();
    setRecyclerId(id);
    void apiFetch<DemoStatusResponse>("/api/demo").then((demo) => {
      if (demo.ok) setDemoEnabled(demo.data.enabled);
    });
    void loadRecycler(id).then(async (data) => {
      const resumeSession = getResume();
      if (resumeSession && data?.latestVoucher && data.latestVoucher.voucher.sessionId === resumeSession) {
        setReward(data.latestVoucher);
        setStage("TICKET");
      } else if (resumeSession) {
        // Claimed earlier but the reward was never issued (reload mid-game): the game is never a gate,
        // so the server draws a reward now.
        const body: RewardBody = { sessionId: resumeSession, recyclerId: id };
        const drawn = await apiFetch<SpinPayload>("/api/reward", { method: "POST", body: JSON.stringify(body) });
        if (drawn.ok) {
          setReward(drawn.data);
          setStage("TICKET");
        } else {
          clearResume();
        }
      }
      setBooting(false);
    });
  }, [loadRecycler]);

  // Animate the progress bar from "before" to "after" once a claim lands.
  useEffect(() => {
    if (!claim || claim.alreadyClaimed) return;
    setProgress(claim.progressBefore);
    const timer = window.setTimeout(() => setProgress(claim.progress), 650);
    return () => window.clearTimeout(timer);
  }, [claim]);

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) setLockedUntil(null);
    }, 500);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const locked = lockedUntil !== null && now < lockedUntil;
  const gameKind = gameId ? MINIGAMES[gameId].kind : null;

  const context = useCallback(
    (overrides: Partial<FlowContext> = {}): FlowContext => ({
      alreadyClaimed: claim?.alreadyClaimed ?? false,
      hasLevelUp: claim !== null && !claim.alreadyClaimed && claim.levelUp !== null,
      hasNewBadges: false,
      gameKind,
      skipped: result?.skipped ?? false,
      ...overrides,
    }),
    [claim, gameKind, result],
  );

  const advance = useCallback(
    (from: RewardStage, overrides?: Partial<FlowContext>) => {
      setStage(nextStage(from, context(overrides)));
    },
    [context],
  );

  const submit = useCallback(
    async (code: string) => {
      if (inFlight.current || !recyclerId) return; // double-submit guard (the server is idempotent too)
      inFlight.current = true;
      setStage("VERIFYING");
      setError(null);
      const body: ClaimBody = { action: "claim", pin: code, recyclerId };
      const [response] = await Promise.all([apiFetch<ClaimResponse>("/api/session", { method: "PATCH", body: JSON.stringify(body) }), delay(MIN_HANDSHAKE_MS)]);
      inFlight.current = false;
      if (!response.ok) {
        setPin("");
        setError(describeError(response.error));
        setShakeKey((key) => key + 1);
        if (response.error.retryAfterMs) {
          setNow(Date.now());
          setLockedUntil(Date.now() + response.error.retryAfterMs);
        }
        setStage("IDLE");
        return;
      }

      const data = response.data;
      setRecycler(data.recycler);
      setResult(null);
      setClaim(data);
      setReward(data.voucher);
      setPlaySeed(randomSeed());
      setResume(data.session.id);

      // Nothing is preset: the game is chosen at random and the reward comes from how it is played.
      // A replayed claim of a session that already has a voucher goes straight to the ticket.
      let chosen: MinigameId | null = null;
      if (!data.voucher) {
        const forced = new URLSearchParams(window.location.search).get("game");
        const arcade = loadArcade();
        chosen =
          demoEnabled && isMinigameId(forced) && MINIGAMES[forced].enabled
            ? forced
            : pickMinigame({
                theme: STORE_THEME_BY_RETAILER[data.session.retailer],
                category: data.session.category,
                sessionId: data.session.id,
                recentIds: arcade.recentIds,
                firstEverReward: !arcade.firstRewardDone,
                random: randomFloat,
              });
        recordPick(chosen);
      }
      setGameId(chosen);
      setStage(
        data.voucher
          ? "TICKET"
          : nextStage("VERIFYING", {
              alreadyClaimed: false,
              hasLevelUp: !data.alreadyClaimed && data.levelUp !== null,
              hasNewBadges: false,
              gameKind: chosen ? MINIGAMES[chosen].kind : null,
              skipped: false,
            }),
      );
    },
    [demoEnabled, recyclerId],
  );

  /** Asks the server to issue the reward for this session (random draw for luck games, score for skill games). */
  const requestReward = useCallback(
    async (extra: Partial<RewardBody> = {}): Promise<SpinPayload | null> => {
      if (!claim || !recyclerId) return null;
      const body: RewardBody = { sessionId: claim.session.id, recyclerId, ...(gameId ? { gameId } : {}), ...extra };
      const response = await apiFetch<SpinPayload>("/api/reward", { method: "POST", body: JSON.stringify(body) });
      if (!response.ok) return null;
      setReward(response.data);
      return response.data;
    },
    [claim, gameId, recyclerId],
  );

  /** Used by luck games at the moment of the spin, pick or grab. */
  const draw = useCallback(async (): Promise<RewardDraw | null> => {
    const issued = await requestReward();
    return issued ? { discountPercent: issued.voucher.discountPercent, segmentIndex: issued.segmentIndex } : null;
  }, [requestReward]);

  const completeAward = useCallback(
    async (finished: MinigameResult) => {
      if (!reward) {
        // A skill game reports its score; a luck game skipped before drawing gets a random draw.
        const kind = gameId ? MINIGAMES[gameId].kind : null;
        setAwarding(true);
        setAwardFailed(false);
        const issued = kind === "SKILL" ? await requestReward({ score: finished.score, durationMs: finished.durationMs }) : await requestReward();
        setAwarding(false);
        if (!issued) {
          setPendingFinish(finished);
          setAwardFailed(true);
          return;
        }
      }
      setPendingFinish(null);
      advance("PLAYING", { skipped: finished.skipped });
    },
    [advance, gameId, requestReward, reward],
  );

  const handleFinish = useCallback(
    (finished: MinigameResult) => {
      if (gameId) recordResult(gameId, finished);
      setResult(finished);
      void completeAward(finished);
    },
    [completeAward, gameId],
  );

  const reset = useCallback(() => {
    clearResume();
    setClaim(null);
    setReward(null);
    setPendingFinish(null);
    setAwardFailed(false);
    setResult(null);
    setGameId(null);
    setPin("");
    setError(null);
    setStage("IDLE");
    if (recyclerId) void loadRecycler(recyclerId);
  }, [loadRecycler, recyclerId]);

  const startNewProfile = useCallback(() => {
    const id = createNewRecyclerId();
    setRecyclerId(id);
    clearResume();
    setClaim(null);
    setReward(null);
    setPendingFinish(null);
    setAwardFailed(false);
    setResult(null);
    setGameId(null);
    setPin("");
    setStage("IDLE");
    void loadRecycler(id);
  }, [loadRecycler]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const shownLevel = progress?.level ?? recycler?.level ?? null;
  const gameProps = useMemo(() => {
    if (!claim) return null;
    const { range } = claim;
    return {
      theme: THEMES[STORE_THEME_BY_RETAILER[claim.session.retailer]],
      level: range.level,
      levelColor: levelColor(range.level),
      reward: { minPercent: range.minPercent, maxPercent: range.maxPercent, segments: LEVEL_CONFIG[range.level].wheel, draw },
      seed: playSeed,
    };
  }, [claim, draw, playSeed]);

  const inEntry = stage === "IDLE" || stage === "VERIFYING";
  const showHeaderCard = stage !== "PLAYING" && stage !== "PRIZE_REVEAL" && stage !== "GAME_INTRO";

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-sky">
    <Scene className="fixed" />
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-10 pt-5">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/me" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-secondary">
          <User className="size-4" aria-hidden="true" />
          {t("me.title")}
        </Link>
      </header>

      {showHeaderCard && (
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 p-5">
            {shownLevel && progress ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <LevelBadge level={shownLevel} size="md" showLabel />
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold leading-none">{progress.dropOffs}</p>
                    <p className="text-xs text-muted-foreground">drop-offs</p>
                  </div>
                </div>
                <LevelPath progress={progress} />
                <p className="text-xs text-muted-foreground">{LEVEL_CONFIG[shownLevel].tagline}</p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading your profile…
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {inEntry && !booting && (
          <motion.section key="entry" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }} className="space-y-6" aria-labelledby="entry-title">
            <div className="space-y-2 text-center">
              <h1 id="entry-title" className="text-3xl font-extrabold tracking-tight">
                Enter your 4-digit PIN
              </h1>
              <p className="text-muted-foreground">The clerk shows it on the counter screen. It confirms your drop-off and unlocks your reward.</p>
            </div>
            {stage === "VERIFYING" ? (
              <div className="space-y-4 py-6 text-center" role="status" aria-live="polite">
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10">
                  <ShieldCheck className="size-9 animate-pulse text-primary" aria-hidden="true" />
                </div>
                <p className="text-lg font-bold">Handshaking with the counter…</p>
                <p className="text-sm text-muted-foreground">Verifying your drop-off</p>
              </div>
            ) : (
              <>
                <PinInput value={pin} onChange={setPin} onComplete={(code) => void submit(code)} disabled={locked} invalid={error !== null} shakeKey={shakeKey} />
                <div className="min-h-12" aria-live="assertive">
                  {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.section>
        )}

        {stage === "CONFIRMED" && (
          <motion.div key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConfirmedStage reducedMotion={reducedMotion} onDone={() => advance("CONFIRMED")} />
          </motion.div>
        )}

        {stage === "GAME_INTRO" && gameId && (
          <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GameIntro
              game={MINIGAMES[gameId]}
              range={claim?.range ?? { minPercent: 15, maxPercent: 20 }}
              choices={demoEnabled ? enabledMinigames().map((id) => MINIGAMES[id]) : undefined}
              onChoose={(id) => {
                recordPick(id);
                setGameId(id);
              }}
              reducedMotion={reducedMotion}
              onPlay={() => advance("GAME_INTRO")}
              onRevealNow={() => handleFinish({ stars: 0, score: 0, completed: false, skipped: true, durationMs: 0 })}
              onHow={() => setSheetOpen(true)}
            />
          </motion.div>
        )}

        {(stage === "TICKET" || stage === "DONE") && (
          <motion.section key="ticket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5" aria-labelledby="ticket-title">
            {stage === "TICKET" ? (
              <>
                <div className="space-y-1 text-center">
                  <h1 id="ticket-title" className="text-3xl font-extrabold tracking-tight">
                    {t("ticket.title")}
                  </h1>
                  <p className="text-muted-foreground">Thanks for giving e-waste a second round.</p>
                </div>
                {reward ? <VoucherTicket voucher={reward.voucher} /> : <p role="alert" className="rounded-2xl bg-amber/20 p-4 text-sm font-medium">{t("ticket.missing")}</p>}
                {result && !result.skipped && gameKind === "SKILL" && (
                  <div className="space-y-1 text-center">
                    <p className="text-sm text-muted-foreground">{t("ticket.stars")}</p>
                    <Stars count={result.stars} />
                  </div>
                )}
                <Button size="lg" className="w-full" onClick={() => { clearResume(); advance("TICKET"); }}>
                  {t("ticket.done")}
                </Button>
              </>
            ) : (
              <div className="space-y-5 py-6 text-center">
                <h1 id="ticket-title" className="text-3xl font-extrabold tracking-tight">
                  {t("done.title")}
                </h1>
                <Button size="lg" variant="outline" className="w-full" onClick={reset}>
                  <RefreshCw aria-hidden="true" /> {t("done.another")}
                </Button>
                <Link href="/me" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary">
                  {t("done.profile")} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === "LEVEL_UP" && claim?.levelUp && <LevelUpCelebration key="levelup" levelUp={claim.levelUp} onContinue={() => advance("LEVEL_UP")} />}
      </AnimatePresence>

      {stage === "PLAYING" && gameId && gameProps && (
        <MinigameHost key={claim?.session.id} gameId={gameId} {...gameProps} mode="REWARD" reducedMotion={reducedMotion} onFinish={handleFinish} />
      )}

      {stage === "PLAYING" && (awarding || awardFailed) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-sky/90 p-6" role="alertdialog" aria-live="assertive" aria-label={t("reward.counting")}>
          <div className="w-full max-w-sm space-y-4 rounded-3xl border-[3px] border-ink bg-white p-6 text-center shadow-[0_6px_0_hsl(var(--ink))]">
            {awardFailed ? (
              <>
                <p className="font-display text-xl font-bold">{t("reward.error")}</p>
                <Button size="lg" className="w-full" onClick={() => pendingFinish && void completeAward(pendingFinish)}>
                  <RefreshCw aria-hidden="true" /> {t("reward.retry")}
                </Button>
              </>
            ) : (
              <p className="flex items-center justify-center gap-3 font-display text-xl font-bold">
                <Loader2 className="size-6 animate-spin" aria-hidden="true" /> {t("reward.counting")}
              </p>
            )}
          </div>
        </div>
      )}

      {stage === "PRIZE_REVEAL" && reward && <PrizeReveal discountPercent={reward.voucher.discountPercent} levelColor={levelColor(reward.wheelLevel)} reducedMotion={reducedMotion} onContinue={() => advance("PRIZE_REVEAL")} />}

      <RewardsSheet open={sheetOpen} onClose={closeSheet} />

      {recyclerId && inEntry && <DemoTools recyclerId={recyclerId} onChanged={() => void loadRecycler(recyclerId)} onNewProfile={startNewProfile} />}
    </main>
    </div>
  );
}
