/**
 * When a shipped order should arrive — from the shop's own published delay
 * and the moment the order was really marked shipped, nothing else.
 *
 * "24h" or "48–72h" (the shop's words, in hours) added to the SHIPPED row's
 * time gives a window of days. Anything the shop wrote that is not in hours
 * gives no date: an estimate from a sentence we cannot read would be a
 * promise the shop never made.
 */
export function arrivalWindow(shippedAt: string, delay: string | null): { from: Date; to: Date } | null {
  if (!delay || !/^\s*[\d\s–-]+h\s*$/i.test(delay)) return null;
  const hours = (delay.match(/\d+/g) ?? []).map(Number);
  if (!hours.length) return null;
  const start = new Date(shippedAt).getTime();
  if (!Number.isFinite(start)) return null;
  const h = 3_600_000;
  return { from: new Date(start + Math.min(...hours) * h), to: new Date(start + Math.max(...hours) * h) };
}

/** Same calendar day, in the phone's time zone. */
export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
