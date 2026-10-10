"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, KeyRound, Loader2, Minus, Plus, Store } from "lucide-react";
import {
  CATEGORY_CONFIG,
  CITIES,
  City,
  ITEM_CATEGORIES,
  ItemCategory,
  RETAILERS,
  RETAILER_CONFIG,
  Retailer,
  SessionStatus,
  type Session,
} from "@/types";
import type { CreateSessionResponse, LevelUp, SessionPollResponse, VoidBody, VoidResponse } from "@/types/api";
import { apiFetch } from "@/lib/client-api";
import { formatKg, formatTime } from "@/lib/format";
import { Logo } from "@/components/logo";
import { CategoryPicker } from "@/components/clerk/category-picker";
import { SessionPanel } from "@/components/clerk/session-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const POLL_INTERVAL_MS = 1000;
const SETTINGS_KEY = "replay.clerk.settings";

interface TerminalSettings {
  retailer: Retailer;
  city: City;
  clerkLabel: string;
}

const DEFAULT_SETTINGS: TerminalSettings = { retailer: Retailer.ELIT, city: City.TBILISI, clerkLabel: "" };

interface HistoryEntry {
  id: string;
  label: string;
  pin: string;
  status: SessionStatus;
  at: number;
}

function loadSettings(): TerminalSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TerminalSettings>;
    return {
      retailer: RETAILERS.find((r) => r === parsed.retailer) ?? DEFAULT_SETTINGS.retailer,
      city: CITIES.find((c) => c === parsed.city) ?? DEFAULT_SETTINGS.city,
      clerkLabel: typeof parsed.clerkLabel === "string" ? parsed.clerkLabel.slice(0, 40) : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function clampWeight(value: number, category: ItemCategory): number {
  const { minWeightKg, maxWeightKg } = CATEGORY_CONFIG[category];
  return Math.min(maxWeightKg, Math.max(minWeightKg, Math.round(value * 100) / 100));
}

function weightStep(category: ItemCategory): number {
  const { maxWeightKg } = CATEGORY_CONFIG[category];
  return maxWeightKg <= 1 ? 0.05 : maxWeightKg <= 8 ? 0.25 : 0.5;
}

export default function ClerkPage() {
  const [category, setCategory] = useState<ItemCategory>(ItemCategory.LAPTOP);
  const [weightText, setWeightText] = useState(String(CATEGORY_CONFIG[ItemCategory.LAPTOP].defaultWeightKg));
  const [settings, setSettings] = useState<TerminalSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voidArmed, setVoidArmed] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const weightRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef(false);

  useEffect(() => setSettings(loadSettings()), []);

  const updateSettings = (patch: Partial<TerminalSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: settings simply won't persist.
      }
      return next;
    });
  };

  const selectCategory = useCallback((next: ItemCategory) => {
    setCategory(next);
    setWeightText(String(CATEGORY_CONFIG[next].defaultWeightKg));
  }, []);

  const resetForm = useCallback(() => {
    setSession(null);
    setLevelUp(null);
    setError(null);
    setVoidArmed(false);
    setWeightText(String(CATEGORY_CONFIG[category].defaultWeightKg));
  }, [category]);

  const record = useCallback((next: Session) => {
    setHistory((current) => {
      const entry: HistoryEntry = { id: next.id, label: `${CATEGORY_CONFIG[next.category].label} · ${formatKg(next.estimatedWeightKg)}`, pin: next.pin, status: next.status, at: next.createdAt };
      const index = current.findIndex((item) => item.id === next.id);
      if (index === -1) return [entry, ...current].slice(0, 6);
      const copy = [...current];
      copy[index] = entry;
      return copy;
    });
  }, []);

  const submit = useCallback(async () => {
    if (submitRef.current) return;
    const weight = Number(weightText.replace(",", "."));
    const config = CATEGORY_CONFIG[category];
    if (!Number.isFinite(weight) || weight < config.minWeightKg || weight > config.maxWeightKg) {
      setError(`${config.label} weight must be between ${config.minWeightKg} and ${config.maxWeightKg} kg.`);
      weightRef.current?.focus();
      return;
    }
    submitRef.current = true;
    setSubmitting(true);
    setError(null);
    const result = await apiFetch<CreateSessionResponse>("/api/session", {
      method: "POST",
      body: JSON.stringify({ category, estimatedWeightKg: weight, retailer: settings.retailer, city: settings.city, clerkLabel: settings.clerkLabel || undefined }),
    });
    submitRef.current = false;
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setClockOffset(result.data.serverNow - Date.now());
    setLevelUp(null);
    setVoidArmed(false);
    setSession(result.data.session);
    record(result.data.session);
  }, [category, record, settings, weightText]);

  // Real-time status polling (change-detection: tiny payload while nothing changes).
  const activeId = session?.id ?? null;
  const activeStatus = session?.status ?? null;
  const activeRev = useRef(0);
  useEffect(() => {
    activeRev.current = session?.rev ?? 0;
  }, [session?.rev, activeId]);

  useEffect(() => {
    if (!activeId || activeStatus !== SessionStatus.PENDING) return;
    let cancelled = false;
    let timer: number | undefined;
    const tick = async () => {
      const result = await apiFetch<SessionPollResponse>(`/api/session?id=${encodeURIComponent(activeId)}&rev=${activeRev.current}`);
      if (cancelled) return;
      if (result.ok) {
        setClockOffset(result.data.serverNow - Date.now());
        if (result.data.changed) {
          activeRev.current = result.data.session.rev;
          setSession(result.data.session);
          setLevelUp(result.data.levelUp);
          record(result.data.session);
          if (result.data.session.status !== SessionStatus.PENDING) return;
        }
      } else if (result.error.status === 404) {
        setError("This drop-off no longer exists on the server.");
        return;
      }
      timer = window.setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };
    timer = window.setTimeout(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [activeId, activeStatus, record]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const voidSession = useCallback(async () => {
    if (!session) return;
    if (!voidArmed) {
      setVoidArmed(true);
      window.setTimeout(() => setVoidArmed(false), 4000);
      return;
    }
    setVoidArmed(false);
    const body: VoidBody = { action: "void", sessionId: session.id, reason: "Voided by clerk" };
    const result = await apiFetch<VoidResponse>("/api/session", { method: "PATCH", body: JSON.stringify(body) });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSession(result.data.session);
    record(result.data.session);
  }, [record, session, voidArmed]);

  // Keyboard-first: 1-5 choose a category, W focuses weight, Esc starts a new drop-off.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target !== null && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
      if (event.key === "Escape") {
        resetForm();
        weightRef.current?.focus();
        return;
      }
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
      const index = Number(event.key) - 1;
      const picked = ITEM_CATEGORIES[index];
      if (picked) {
        event.preventDefault();
        selectCategory(picked);
      } else if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        weightRef.current?.focus();
        weightRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetForm, selectCategory]);

  useEffect(() => {
    weightRef.current?.focus();
  }, []);

  const bump = (direction: 1 | -1) => {
    const current = Number(weightText.replace(",", "."));
    const base = Number.isFinite(current) ? current : CATEGORY_CONFIG[category].defaultWeightKg;
    setWeightText(String(clampWeight(base + direction * weightStep(category), category)));
  };

  const config = CATEGORY_CONFIG[category];

  return (
    <main className="container flex min-h-dvh flex-col gap-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Logo />
          <Badge variant="outline">Clerk terminal</Badge>
        </div>
        <p className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          <KeyRound className="size-4" aria-hidden="true" />
          <kbd className="rounded bg-secondary px-1.5 font-mono text-xs">1-5</kbd> category <kbd className="rounded bg-secondary px-1.5 font-mono text-xs">W</kbd> weight{" "}
          <kbd className="rounded bg-secondary px-1.5 font-mono text-xs">Enter</kbd> generate PIN <kbd className="rounded bg-secondary px-1.5 font-mono text-xs">Esc</kbd> new
        </p>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Register drop-off</CardTitle>
            <CardDescription>What is the customer handing in?</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <CategoryPicker value={category} onChange={selectCategory} />

              <div className="space-y-2">
                <label htmlFor="weight" className="text-sm font-semibold">
                  Estimated weight (kg)
                </label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="icon" onClick={() => bump(-1)} aria-label="Decrease weight">
                    <Minus aria-hidden="true" />
                  </Button>
                  <input
                    id="weight"
                    ref={weightRef}
                    value={weightText}
                    onChange={(event) => setWeightText(event.target.value)}
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="weight-hint"
                    className="h-14 w-full rounded-2xl border-2 border-border bg-card px-4 text-center font-mono text-3xl font-bold focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => bump(1)} aria-label="Increase weight">
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
                <p id="weight-hint" className="text-xs text-muted-foreground">
                  {config.label}: {config.minWeightKg}–{config.maxWeightKg} kg{config.hazardous ? " · hazardous: store in the fire-safe box" : ""}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1.5 text-sm font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Store className="size-4" aria-hidden="true" /> Store
                  </span>
                  <select
                    value={settings.retailer}
                    onChange={(event) => updateSettings({ retailer: event.target.value as Retailer })}
                    className="h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3 text-sm font-medium"
                  >
                    {RETAILERS.map((retailer) => (
                      <option key={retailer} value={retailer}>
                        {RETAILER_CONFIG[retailer].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-semibold">
                  City
                  <select
                    value={settings.city}
                    onChange={(event) => updateSettings({ city: event.target.value as City })}
                    className="h-11 w-full cursor-pointer rounded-xl border border-border bg-card px-3 text-sm font-medium"
                  >
                    {CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city === City.TBILISI ? "Tbilisi" : "Batumi"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-semibold">
                  Clerk (optional)
                  <input
                    value={settings.clerkLabel}
                    onChange={(event) => updateSettings({ clerkLabel: event.target.value.slice(0, 40) })}
                    maxLength={40}
                    autoComplete="off"
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium"
                  />
                </label>
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
                Generate PIN <kbd className="rounded bg-white/20 px-1.5 font-mono text-xs">Enter</kbd>
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <SessionPanel session={session} levelUp={levelUp} now={now + clockOffset} voidArmed={voidArmed} onVoid={() => void voidSession()} onNew={() => { resetForm(); weightRef.current?.focus(); }} />

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">This terminal today</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="font-medium">{entry.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground">{formatTime(entry.at)}</span>
                        <Badge variant={entry.status === SessionStatus.CLAIMED ? "success" : entry.status === SessionStatus.PENDING ? "warning" : entry.status === SessionStatus.EXPIRED ? "destructive" : "outline"}>
                          {entry.status}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
