"use client";

import { Ban, CheckCircle2, Clock, Hourglass, PackageOpen, TriangleAlert } from "lucide-react";
import { CATEGORY_CONFIG, LEVEL_CONFIG, RETAILER_CONFIG, SessionStatus, type Session } from "@/types";
import type { LevelUp } from "@/types/api";
import { formatCountdown, formatKg } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LevelBadge } from "@/components/level-badge";
import { cn } from "@/lib/utils";

interface SessionPanelProps {
  session: Session | null;
  levelUp: LevelUp | null;
  /** Server-aligned "now" in ms, used for the countdown. */
  now: number;
  voidArmed: boolean;
  onVoid: () => void;
  onNew: () => void;
}

export function SessionPanel({ session, levelUp, now, voidArmed, onVoid, onNew }: SessionPanelProps) {
  if (!session) {
    return (
      <Card className="h-full min-h-72">
        <CardContent className="flex h-full min-h-72 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
          <PackageOpen className="size-12" aria-hidden="true" />
          <p className="text-lg font-semibold text-foreground">No active drop-off</p>
          <p className="max-w-xs text-sm">Pick a category, enter the weight and press Enter. The one-time PIN appears here.</p>
        </CardContent>
      </Card>
    );
  }

  const remaining = session.expiresAt - now;
  const status = session.status === SessionStatus.PENDING && remaining <= 0 ? SessionStatus.EXPIRED : session.status;
  const config = CATEGORY_CONFIG[session.category];
  const canVoid = status === SessionStatus.PENDING || status === SessionStatus.CLAIMED;

  return (
    <Card className={cn("overflow-hidden transition-colors", status === SessionStatus.CLAIMED && "border-primary")}>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {config.label} · {formatKg(session.estimatedWeightKg)} · {RETAILER_CONFIG[session.retailer].label}
          </p>
          {status === SessionStatus.PENDING && (
            <Badge variant="warning">
              <Hourglass className="size-3" aria-hidden="true" /> Waiting for customer
            </Badge>
          )}
          {status === SessionStatus.CLAIMED && (
            <Badge variant="success">
              <CheckCircle2 className="size-3" aria-hidden="true" /> Claimed
            </Badge>
          )}
          {status === SessionStatus.EXPIRED && (
            <Badge variant="destructive">
              <TriangleAlert className="size-3" aria-hidden="true" /> Expired
            </Badge>
          )}
          {status === SessionStatus.VOID && (
            <Badge variant="outline">
              <Ban className="size-3" aria-hidden="true" /> Void
            </Badge>
          )}
        </div>

        <div className="text-center" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Customer PIN</p>
          <p
            className={cn(
              "mt-1 select-all font-mono text-7xl font-bold leading-none tracking-[0.2em] sm:text-8xl",
              status === SessionStatus.PENDING ? "text-foreground" : "text-muted-foreground/50 line-through decoration-2",
            )}
            aria-label={`PIN ${session.pin.split("").join(" ")}`}
          >
            {session.pin}
          </p>
        </div>

        {status === SessionStatus.PENDING && (
          <p className="flex items-center justify-center gap-2 text-base font-semibold" role="timer">
            <Clock className="size-4 text-primary" aria-hidden="true" /> Expires in <span className="font-mono">{formatCountdown(remaining)}</span>
          </p>
        )}

        {status === SessionStatus.CLAIMED && (
          <div className="space-y-3 rounded-2xl bg-primary/10 p-4 text-center" role="status">
            <p className="text-lg font-bold text-primary">Customer verified — drop-off counted</p>
            {session.voucher && <p className="text-sm font-medium">Voucher issued: {session.voucher.discountPercent}% off ({session.voucher.code})</p>}
            {levelUp && (
              <div className="mx-auto flex w-fit animate-pop-in items-center gap-3 rounded-full bg-lime px-4 py-2 text-lime-foreground">
                <LevelBadge level={levelUp.to} size="sm" />
                <span className="text-sm font-extrabold">New level reached: {LEVEL_CONFIG[levelUp.to].label}</span>
              </div>
            )}
          </div>
        )}

        {status === SessionStatus.EXPIRED && <p className="rounded-2xl bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">PIN expired. Create a new drop-off for this customer.</p>}
        {status === SessionStatus.VOID && <p className="rounded-2xl bg-secondary p-3 text-center text-sm font-medium">Cancelled{session.voidReason ? `: ${session.voidReason}` : ""}.</p>}

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="default" onClick={onNew}>
            New drop-off <kbd className="rounded bg-white/20 px-1.5 font-mono text-xs">Esc</kbd>
          </Button>
          {canVoid && (
            <Button variant={voidArmed ? "destructive" : "outline"} onClick={onVoid}>
              <Ban aria-hidden="true" /> {voidArmed ? "Confirm void" : "Void"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
