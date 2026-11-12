export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatDistance(km: number) {
  return `${km.toFixed(1)} km`;
}

export function formatDayLabel(date: string | Date, locale: string = "fr") {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatNumber(value: number, locale: string = "fr") {
  return value.toLocaleString(locale);
}

// MAD has no conventional narrow symbol recognized across locales, so this
// spells out the ISO code (e.g. "1 234 MAD") rather than using
// style: "currency", which would render an unfamiliar "MAD" prefix/suffix
// placement that shifts per locale in ways users wouldn't recognize.
export function formatCurrencyMad(amount: number, locale: string = "fr") {
  return `${amount.toLocaleString(locale)} MAD`;
}

export function formatDateTime(date: string | Date, locale: string = "fr") {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

// Whole calendar days between two dates, floored at 1 — endDate is treated as
// an exclusive return/handover day. Shared by the booking price preview (client)
// and the server-authoritative price computation so they can never drift apart.
export function diffInDays(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}
