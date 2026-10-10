"use client";

import { useEffect, useState } from "react";
import { FlaskConical, RotateCcw, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import type { DemoResetBody, DemoResetResponse, DemoSeedBody, DemoSeedResponse, DemoStatusResponse } from "@/types/api";

interface DemoToolsProps {
  recyclerId: string;
  /** Called after any demo action so the page can reload the profile. */
  onChanged: () => void;
  onNewProfile: () => void;
}

const QUICK_TARGETS: ReadonlyArray<{ dropOffs: number; hint: string }> = [
  { dropOffs: 2, hint: "next claim → Silver" },
  { dropOffs: 4, hint: "next claim → Gold" },
  { dropOffs: 7, hint: "next claim → Platinum" },
  { dropOffs: 11, hint: "next claim → Diamond" },
];

/** Stage helpers. Renders nothing unless the server runs with REPLAY_DEMO=true. */
export function DemoTools({ recyclerId, onChanged, onNewProfile }: DemoToolsProps) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<DemoStatusResponse>("/api/demo").then((result) => {
      if (!cancelled && result.ok) setEnabled(result.data.enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  const seed = async (dropOffs: number) => {
    setBusy(true);
    const body: DemoSeedBody = { action: "seed", recyclerId, dropOffs };
    const result = await apiFetch<DemoSeedResponse>("/api/demo", { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    setMessage(result.ok ? `Profile now has ${result.data.recycler.dropOffs} drop-offs (+${result.data.added}).` : result.error.message);
    if (result.ok) onChanged();
  };

  const reset = async () => {
    setBusy(true);
    const body: DemoResetBody = { action: "reset" };
    const result = await apiFetch<DemoResetResponse>("/api/demo", { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    setMessage(result.ok ? "All demo data wiped." : result.error.message);
    if (result.ok) onChanged();
  };

  return (
    <details className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold text-muted-foreground">
        <FlaskConical className="size-4" aria-hidden="true" /> Demo tools
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_TARGETS.map((target) => (
            <Button key={target.dropOffs} size="sm" variant="outline" disabled={busy} onClick={() => void seed(target.dropOffs)}>
              Seed to {target.dropOffs} <span className="font-normal text-muted-foreground">({target.hint})</span>
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" disabled={busy} onClick={onNewProfile}>
            <UserPlus aria-hidden="true" /> New profile
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void reset()}>
            <RotateCcw aria-hidden="true" /> Reset ALL data
          </Button>
        </div>
        {message && (
          <p role="status" className="text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </details>
  );
}
