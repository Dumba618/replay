"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Download, Gift, Percent, Printer, Repeat, Scale, ShieldCheck, TrendingUp, Trash2, Users } from "lucide-react";
import { LEVEL_ORDER } from "@/types";
import type { DashboardData, DemoResetResponse, DemoStatusResponse } from "@/types/api";
import { apiFetch } from "@/lib/client-api";
import { formatKg, formatNumber, formatRatio, formatShortDate, formatTime } from "@/lib/format";
import { LEVEL_UI } from "@/lib/ui-maps";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { AuditTable } from "@/components/dashboard/audit-table";
import { ColumnChart, HorizontalBars } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const REFRESH_MS = 3000;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [printing, setPrinting] = useState(false);

  const refresh = useCallback(async () => {
    const result = await apiFetch<DashboardData>("/api/dashboard");
    if (result.ok) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error.message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    void apiFetch<DemoStatusResponse>("/api/demo").then((result) => {
      if (result.ok) setDemoEnabled(result.data.enabled);
    });
    const before = () => setPrinting(true);
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const resetAll = async () => {
    if (!window.confirm("Wipe ALL demo sessions, vouchers and audit events?")) return;
    const result = await apiFetch<DemoResetResponse>("/api/demo", { method: "POST", body: JSON.stringify({ action: "reset" }) });
    if (result.ok) void refresh();
    else setError(result.error.message);
  };

  const kpis = data?.kpis;

  return (
    <div className={cn("min-h-dvh bg-background text-foreground", !printing && "dark")}>
      <main className="container flex flex-col gap-8 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">EPR Compliance Dashboard</h1>
              <p className="text-xs text-muted-foreground">WEEE collection data for the Ministry of Environmental Protection and Agriculture of Georgia</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Badge variant="success">
              <Activity className="size-3 animate-pulse" aria-hidden="true" /> Live{data ? ` · ${formatTime(data.generatedAt)}` : ""}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <a href="/api/dashboard?format=csv" download>
                <Download aria-hidden="true" /> CSV
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden="true" /> PDF
            </Button>
            {demoEnabled && (
              <Button variant="ghost" size="sm" onClick={() => void resetAll()}>
                <Trash2 aria-hidden="true" /> Reset demo
              </Button>
            )}
          </div>
        </header>

        {error && (
          <p role="alert" className="rounded-2xl bg-destructive/15 p-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {!data || !kpis ? (
          <p className="py-24 text-center text-muted-foreground" role="status">
            Loading live data…
          </p>
        ) : (
          <>
            <section aria-labelledby="kpi-title" className="space-y-3">
              <h2 id="kpi-title" className="sr-only">
                Key figures
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="E-waste collected" value={formatKg(kpis.totalKg)} hint={`${kpis.claimed} verified drop-offs`} icon={Scale} />
                <KpiCard label="Claim rate" value={formatRatio(kpis.claimRate)} hint={`${kpis.expired} expired · ${kpis.voided} void · ${kpis.pending} pending`} icon={ShieldCheck} />
                <KpiCard label="Active recyclers" value={String(kpis.recyclers)} hint="Anonymous profiles with 1+ drop-off" icon={Users} />
                <KpiCard label="Vouchers" value={`${kpis.vouchersRedeemed}/${kpis.vouchersIssued}`} hint="redeemed / issued" icon={Gift} />
              </div>
            </section>

            <section aria-labelledby="epr-title" className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle id="epr-title">Statutory collection targets</CardTitle>
                  <CardDescription>{data.periodLabel}. Targets are demo assumptions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {data.statutory.map((row) => (
                    <div key={row.category} className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold">{row.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatKg(row.collectedKg)} / {formatKg(row.targetKg)} · {row.percent}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, row.percent)} label={`${row.label} target progress`} indicatorClassName={row.percent >= 100 ? "bg-lime" : "bg-primary"} className="h-3" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Collected per day</CardTitle>
                  <CardDescription>Last 14 days, kg (Georgia time)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ColumnChart data={data.daily.map((d) => ({ label: formatShortDate(d.date), value: d.kg }))} ariaLabel="Kilograms collected per day" unit="kg" />
                </CardContent>
              </Card>
            </section>

            <section aria-label="Breakdowns" className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By category</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="pb-2 font-semibold">Category</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Items</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.byCategory.map((row) => (
                        <tr key={row.key}>
                          <td className="py-2 font-medium">{row.label}</td>
                          <td className="py-2 text-right font-mono">{row.claimed}</td>
                          <td className="py-2 text-right font-mono">{formatKg(row.kg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">By retailer and city</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="pb-2 font-semibold">Retailer</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Items</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Weight</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Vouchers</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Avg discount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.byRetailer.map((row) => (
                        <tr key={row.key}>
                          <td className="py-2 font-medium">{row.label}</td>
                          <td className="py-2 text-right font-mono">{row.claimed}</td>
                          <td className="py-2 text-right font-mono">{formatKg(row.kg)}</td>
                          <td className="py-2 text-right font-mono">
                            {row.vouchersRedeemed}/{row.vouchersIssued}
                          </td>
                          <td className="py-2 text-right font-mono">{row.avgDiscountPercent === null ? "—" : `${row.avgDiscountPercent}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-wrap gap-3">
                    {data.byCity.map((row) => (
                      <Badge key={row.key} variant="default" className="px-3 py-1.5 text-sm">
                        {row.label}: {row.claimed} items · {formatKg(row.kg)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="loyalty-title" className="space-y-4">
              <div>
                <h2 id="loyalty-title" className="text-2xl font-extrabold tracking-tight">
                  Levels &amp; Loyalty
                </h2>
                <p className="text-sm text-muted-foreground">Level = f(CLAIMED drop-offs). Expired and void sessions never count.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Repeat-recycler rate" value={formatRatio(kpis.repeatRecyclerRate)} hint="2+ drop-offs" icon={Repeat} />
                <KpiCard label="Avg drop-offs / recycler" value={formatNumber(kpis.avgDropOffsPerRecycler, 2)} icon={Percent} />
                <KpiCard label="Level-ups" value={String(kpis.levelUpsTotal)} hint="thresholds crossed" icon={TrendingUp} />
                <KpiCard label="Recyclers" value={String(kpis.recyclers)} icon={Users} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recyclers per level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HorizontalBars
                      ariaLabel="Recyclers per level"
                      unit="recyclers"
                      data={LEVEL_ORDER.map((level) => ({
                        label: data.levelDistribution.find((row) => row.level === level)?.label ?? level,
                        value: data.levelDistribution.find((row) => row.level === level)?.recyclers ?? 0,
                        barClass: LEVEL_UI[level].bg,
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Level-ups over time</CardTitle>
                    <CardDescription>Last 14 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ColumnChart
                      data={data.daily.map((d) => ({ label: formatShortDate(d.date), value: d.levelUps, barClass: "bg-lime" }))}
                      ariaLabel="Level-ups per day"
                      unit="level-ups"
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            <section aria-labelledby="audit-title" className="space-y-3">
              <h2 id="audit-title" className="text-2xl font-extrabold tracking-tight">
                Audit ledger
              </h2>
              <AuditTable rows={data.auditRows} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
