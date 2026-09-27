/**
 * What the owner tells the app about their own car: its mileage, the last
 * oil change, when the technical inspection and the insurance fall due.
 *
 * Only what they typed. No service interval is assumed — manufacturers and
 * oils differ, and "vidange tous les 10 000 km" printed for every car would
 * be a rule this app made up. The owner picks their interval from their own
 * service book, and the reminder is arithmetic on their numbers.
 *
 * On this phone only, keyed by engine id; never sent to the shop.
 */
export type VehicleCare = {
  mileageKm?: number;
  /** When the mileage was entered (ISO), so a stale reading can say so. */
  mileageAt?: string;
  oilChangeKm?: number;
  oilChangeDate?: string;
  oilIntervalKm?: number;
  inspectionDue?: string;
  insuranceDue?: string;
  /** The owner asked for reminders of the two dates, on this phone. */
  remind?: boolean;
  /** The local notifications scheduled for them, so a new date replaces them. */
  reminderIds?: string[];
};

export type CareDue =
  | { kind: 'oil'; km: number; overdue: boolean }
  | { kind: 'inspection' | 'insurance'; days: number; overdue: boolean };

/** What falls due, soonest first — from the owner's own numbers only. */
export function careDue(care: VehicleCare | undefined, today = new Date()): CareDue[] {
  if (!care) return [];
  const out: CareDue[] = [];
  if (care.mileageKm != null && care.oilChangeKm != null && care.oilIntervalKm) {
    const km = care.oilChangeKm + care.oilIntervalKm - care.mileageKm;
    out.push({ kind: 'oil', km: Math.abs(km), overdue: km < 0 });
  }
  const day = 86_400_000;
  for (const kind of ['inspection', 'insurance'] as const) {
    const iso = kind === 'inspection' ? care.inspectionDue : care.insuranceDue;
    if (!iso) continue;
    const d = Math.ceil((new Date(iso).getTime() - today.getTime()) / day);
    if (Number.isFinite(d)) out.push({ kind, days: Math.abs(d), overdue: d < 0 });
  }
  // Oil in km and dates in days are not comparable; overdue first, then as listed.
  return out.sort((a, b) => Number(b.overdue) - Number(a.overdue));
}

/** "25/12/2026" → ISO date, or null. Days first, as Tunisia writes them. */
export function parseDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

export function showDate(iso: string | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export type ReminderMoment = { kind: 'inspection' | 'insurance'; when: 'soon' | 'today'; at: Date; date: string };

/** Days before a date that the first reminder comes; the second is on the day. */
export const REMIND_DAYS_BEFORE = 7;

/**
 * When to remind the owner of their own dates: a week before and on the day,
 * at nine in the morning on the phone's clock. Moments already past are left
 * out, so a date entered three days ahead still gets its "today" reminder.
 */
export function reminderMoments(care: VehicleCare | undefined, now = new Date()): ReminderMoment[] {
  if (!care) return [];
  const out: ReminderMoment[] = [];
  for (const kind of ['inspection', 'insurance'] as const) {
    const iso = kind === 'inspection' ? care.inspectionDue : care.insuranceDue;
    if (!iso) continue;
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    for (const [when, back] of [['soon', REMIND_DAYS_BEFORE], ['today', 0]] as const) {
      const at = new Date(y, m - 1, d - back, 9, 0, 0);
      if (at.getTime() > now.getTime()) out.push({ kind, when, at, date: iso.slice(0, 10) });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
