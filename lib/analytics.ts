import "server-only";
import {
  CATEGORY_CONFIG,
  CITIES,
  ITEM_CATEGORIES,
  LEVEL_CONFIG,
  LEVEL_ORDER,
  RETAILERS,
  RETAILER_CONFIG,
  SessionStatus,
  VoucherStatus,
  getLevelForDropOffs,
  type ItemCategory,
  type Level,
  type Session,
} from "@/types";
import type {
  AuditRow,
  BreakdownRow,
  DailyPoint,
  DashboardData,
  DashboardKpis,
  LevelDistributionRow,
  RetailerRow,
  StatutoryRow,
} from "@/types/api";
import { listSessions } from "@/lib/session-store";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Georgia is UTC+4 all year (no DST). */
const GEORGIA_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAILY_WINDOW_DAYS = 14;
const AUDIT_ROWS_ON_SCREEN = 100;

/** Demo assumption: collection targets (kg) for the current reporting period. */
const EPR_TARGET_KG: Readonly<Record<ItemCategory, number>> = {
  LAPTOP: 80,
  PHONE: 20,
  MONITOR: 90,
  CABLE: 30,
  BATTERY: 30,
};

export interface ClaimMeta {
  /** 1-based position among the recycler's CLAIMED sessions. */
  readonly dropOffNumber: number;
  readonly level: Level;
  readonly levelBefore: Level;
  readonly leveledUp: boolean;
}

/**
 * Derives, for every CLAIMED session, the recycler's drop-off number and level
 * at that claim. Voided/expired sessions are ignored, so the numbers always
 * agree with the store's derived level.
 */
export function buildClaimMeta(sessions: readonly Session[]): Map<string, ClaimMeta> {
  const byRecycler = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.status !== SessionStatus.CLAIMED || session.claimedByRecyclerId === null || session.claimOrdinal === null) continue;
    const list = byRecycler.get(session.claimedByRecyclerId);
    if (list) list.push(session);
    else byRecycler.set(session.claimedByRecyclerId, [session]);
  }
  const meta = new Map<string, ClaimMeta>();
  for (const list of byRecycler.values()) {
    list.sort((a, b) => (a.claimOrdinal ?? 0) - (b.claimOrdinal ?? 0));
    list.forEach((session, index) => {
      const level = getLevelForDropOffs(index + 1);
      const levelBefore = getLevelForDropOffs(index);
      meta.set(session.id, { dropOffNumber: index + 1, level, levelBefore, leveledUp: level !== levelBefore });
    });
  }
  return meta;
}

function dayKey(ms: number): string {
  return new Date(ms + GEORGIA_OFFSET_MS).toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toAuditRow(session: Session, meta: Map<string, ClaimMeta>): AuditRow {
  const claim = meta.get(session.id);
  return {
    sessionId: session.id,
    shortId: session.id.slice(0, 8),
    createdAt: session.createdAt,
    claimedAt: session.claimedAt,
    status: session.status,
    category: session.category,
    estimatedWeightKg: session.estimatedWeightKg,
    retailer: session.retailer,
    city: session.city,
    recyclerShort: session.claimedByRecyclerId ? session.claimedByRecyclerId.slice(0, 8) : null,
    levelAtClaim: claim ? claim.level : null,
    dropOffNumber: claim ? claim.dropOffNumber : null,
    leveledUp: claim ? claim.leveledUp : false,
    voucherPercent: session.voucher ? session.voucher.discountPercent : null,
    voucherStatus: session.voucher ? session.voucher.status : null,
    seeded: session.seeded,
  };
}

export function buildDashboard(now: number = Date.now()): DashboardData {
  const sessions = listSessions({}, now);
  const claimed = sessions.filter((s) => s.status === SessionStatus.CLAIMED);
  const meta = buildClaimMeta(claimed);

  const count = (status: SessionStatus): number => sessions.filter((s) => s.status === status).length;
  const expired = count(SessionStatus.EXPIRED);
  const dropOffsByRecycler = new Map<string, number>();
  for (const session of claimed) {
    if (session.claimedByRecyclerId) {
      dropOffsByRecycler.set(session.claimedByRecyclerId, (dropOffsByRecycler.get(session.claimedByRecyclerId) ?? 0) + 1);
    }
  }
  const recyclers = dropOffsByRecycler.size;
  const repeaters = [...dropOffsByRecycler.values()].filter((n) => n >= 2).length;
  const vouchers = sessions.flatMap((s) => (s.voucher && s.voucher.status !== VoucherStatus.VOID ? [s.voucher] : []));
  let levelUpsTotal = 0;
  for (const claim of meta.values()) if (claim.leveledUp) levelUpsTotal += 1;

  const kpis: DashboardKpis = {
    totalSessions: sessions.length,
    claimed: claimed.length,
    pending: count(SessionStatus.PENDING),
    expired,
    voided: count(SessionStatus.VOID),
    totalKg: round2(claimed.reduce((sum, s) => sum + s.estimatedWeightKg, 0)),
    claimRate: claimed.length + expired > 0 ? claimed.length / (claimed.length + expired) : null,
    recyclers,
    repeatRecyclerRate: recyclers > 0 ? repeaters / recyclers : null,
    avgDropOffsPerRecycler: recyclers > 0 ? round2(claimed.length / recyclers) : null,
    levelUpsTotal,
    vouchersIssued: vouchers.length,
    vouchersRedeemed: vouchers.filter((v) => v.status === VoucherStatus.REDEEMED).length,
  };

  const byCategory: BreakdownRow[] = ITEM_CATEGORIES.map((category) => {
    const rows = claimed.filter((s) => s.category === category);
    return { key: category, label: CATEGORY_CONFIG[category].label, claimed: rows.length, kg: round2(rows.reduce((sum, s) => sum + s.estimatedWeightKg, 0)) };
  });

  const statutory: StatutoryRow[] = byCategory.map((row, index) => {
    const category = ITEM_CATEGORIES[index] as ItemCategory;
    const targetKg = EPR_TARGET_KG[category];
    return { category, label: row.label, collectedKg: row.kg, targetKg, percent: Math.round((row.kg / targetKg) * 100) };
  });

  const byRetailer: RetailerRow[] = RETAILERS.map((retailer) => {
    const rows = claimed.filter((s) => s.retailer === retailer);
    const retailerVouchers = vouchers.filter((v) => v.retailer === retailer);
    const avg = retailerVouchers.length > 0 ? round2(retailerVouchers.reduce((sum, v) => sum + v.discountPercent, 0) / retailerVouchers.length) : null;
    return {
      key: retailer,
      label: RETAILER_CONFIG[retailer].label,
      claimed: rows.length,
      kg: round2(rows.reduce((sum, s) => sum + s.estimatedWeightKg, 0)),
      vouchersIssued: retailerVouchers.length,
      vouchersRedeemed: retailerVouchers.filter((v) => v.status === VoucherStatus.REDEEMED).length,
      avgDiscountPercent: avg,
    };
  });

  const byCity: BreakdownRow[] = CITIES.map((city) => {
    const rows = claimed.filter((s) => s.city === city);
    return { key: city, label: city === "TBILISI" ? "Tbilisi" : "Batumi", claimed: rows.length, kg: round2(rows.reduce((sum, s) => sum + s.estimatedWeightKg, 0)) };
  });

  const dailyMap = new Map<string, { kg: number; claims: number; levelUps: number }>();
  for (let i = DAILY_WINDOW_DAYS - 1; i >= 0; i -= 1) dailyMap.set(dayKey(now - i * DAY_MS), { kg: 0, claims: 0, levelUps: 0 });
  for (const session of claimed) {
    if (session.claimedAt === null) continue;
    const bucket = dailyMap.get(dayKey(session.claimedAt));
    if (!bucket) continue;
    bucket.kg += session.estimatedWeightKg;
    bucket.claims += 1;
    if (meta.get(session.id)?.leveledUp) bucket.levelUps += 1;
  }
  const daily: DailyPoint[] = [...dailyMap.entries()].map(([date, v]) => ({ date, kg: round2(v.kg), claims: v.claims, levelUps: v.levelUps }));

  const levelDistribution: LevelDistributionRow[] = LEVEL_ORDER.map((level) => ({
    level,
    label: LEVEL_CONFIG[level].label,
    recyclers: [...dropOffsByRecycler.values()].filter((n) => getLevelForDropOffs(n) === level).length,
  }));

  return {
    generatedAt: now,
    periodLabel: "Demo reporting period (in-memory, resets on server restart)",
    kpis,
    statutory,
    byCategory,
    byRetailer,
    byCity,
    daily,
    levelDistribution,
    auditRows: sessions.slice(0, AUDIT_ROWS_ON_SCREEN).map((s) => toAuditRow(s, meta)),
  };
}

function csvCell(value: string | number | boolean | null): string {
  if (value === null) return "";
  let text = String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Full (unpaginated) audit export, one row per session. */
export function buildAuditCsv(now: number = Date.now()): string {
  const sessions = listSessions({}, now);
  const meta = buildClaimMeta(sessions.filter((s) => s.status === SessionStatus.CLAIMED));
  const header = [
    "session_id",
    "created_at_iso",
    "claimed_at_iso",
    "status",
    "category",
    "estimated_weight_kg",
    "retailer",
    "city",
    "recycler_short_id",
    "level_at_claim",
    "drop_off_number",
    "caused_level_up",
    "voucher_percent",
    "voucher_status",
    "seeded_demo_data",
  ];
  const lines = [header.join(",")];
  for (const session of sessions) {
    const row = toAuditRow(session, meta);
    lines.push(
      [
        row.sessionId,
        new Date(row.createdAt).toISOString(),
        row.claimedAt === null ? null : new Date(row.claimedAt).toISOString(),
        row.status,
        row.category,
        row.estimatedWeightKg,
        row.retailer,
        row.city,
        row.recyclerShort,
        row.levelAtClaim,
        row.dropOffNumber,
        row.leveledUp,
        row.voucherPercent,
        row.voucherStatus,
        row.seeded,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
