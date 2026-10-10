import { ArrowUp } from "lucide-react";
import { CATEGORY_CONFIG, LEVEL_CONFIG, RETAILER_CONFIG, SessionStatus, type VoucherStatus } from "@/types";
import type { AuditRow } from "@/types/api";
import { formatDateTime, formatKg } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LevelBadge } from "@/components/level-badge";

interface AuditTableProps {
  rows: readonly AuditRow[];
}

function statusVariant(status: SessionStatus): "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case SessionStatus.CLAIMED:
      return "success";
    case SessionStatus.PENDING:
      return "warning";
    case SessionStatus.EXPIRED:
      return "destructive";
    case SessionStatus.VOID:
      return "outline";
  }
}

function voucherText(percent: number | null, status: VoucherStatus | null): string {
  return percent === null || status === null ? "—" : `${percent}% · ${status.toLowerCase()}`;
}

/** Auditable, real-time ledger. Only CLAIMED rows carry a level; EXPIRED/VOID never count. */
export function AuditTable({ rows }: AuditTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <caption className="sr-only">Latest drop-off sessions with the recycler level at the time of claim</caption>
        <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {["Time", "Session", "Status", "Item", "Weight", "Store", "Recycler", "Level at claim", "Drop-off #", "Voucher"].map((heading) => (
              <th key={heading} scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                No drop-offs yet. Create one on /clerk.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.sessionId} className="hover:bg-secondary/50">
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">{formatDateTime(row.claimedAt ?? row.createdAt)}</td>
              <td className="px-3 py-2.5 font-mono text-xs">
                {row.shortId}
                {row.seeded && <span className="ml-1.5 rounded bg-secondary px-1 text-[10px] font-semibold text-muted-foreground">DEMO</span>}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">{CATEGORY_CONFIG[row.category].label}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono">{formatKg(row.estimatedWeightKg)}</td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {RETAILER_CONFIG[row.retailer].label} · {row.city === "TBILISI" ? "Tbilisi" : "Batumi"}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs">{row.recyclerShort ?? "—"}</td>
              <td className="px-3 py-2.5">
                {row.levelAtClaim ? (
                  <span className="flex items-center gap-2">
                    <LevelBadge level={row.levelAtClaim} size="sm" />
                    <span className="font-medium">{LEVEL_CONFIG[row.levelAtClaim].label}</span>
                    {row.leveledUp && (
                      <Badge variant="success">
                        <ArrowUp className="size-3" aria-hidden="true" /> level-up
                      </Badge>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2.5 font-mono">{row.dropOffNumber ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs">{voucherText(row.voucherPercent, row.voucherStatus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
