const TIME_ZONE = "Asia/Tbilisi";

export function formatKg(value: number): string {
  return `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })} kg`;
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: TIME_ZONE });
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day ?? "--"}/${month ?? "--"}`;
}

/** m:ss for a remaining duration in ms (never negative). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${Math.round(ratio * 100)}%`;
}

export function formatNumber(value: number | null, digits: number = 1): string {
  return value === null ? "—" : value.toLocaleString("en-GB", { maximumFractionDigits: digits });
}
