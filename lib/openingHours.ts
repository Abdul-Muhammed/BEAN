/**
 * Open/closed from Google legacy `opening_hours.periods`, in New Zealand time.
 *
 * Mirrors public.cafe_open_now (supabase/migrations/20261112000000_cafe_open_now.sql)
 * so the cafe screen agrees with the list filters. Each period becomes a span
 * in minutes-of-week (day 0 = Sunday); a close at or before its open runs past
 * Saturday night into the next week, and a lone period with no close means
 * open 24/7.
 */

export interface HoursPoint {
  day: number;
  time: string; // 'HHMM'
}

export interface HoursPeriod {
  open?: HoursPoint | null;
  close?: HoursPoint | null;
}

const WEEK = 7 * 1440;
const NZ_TIME_ZONE = 'Pacific/Auckland';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isPoint(value: unknown): value is HoursPoint {
  const p = value as HoursPoint | null | undefined;
  return (
    !!p &&
    Number.isInteger(p.day) &&
    p.day >= 0 &&
    p.day <= 6 &&
    typeof p.time === 'string' &&
    /^\d{4}$/.test(p.time)
  );
}

function minuteOfWeek(p: HoursPoint): number {
  return p.day * 1440 + Number(p.time.slice(0, 2)) * 60 + Number(p.time.slice(2));
}

/** Day of week and minute of day in New Zealand, falling back to device time. */
export function nzClock(now: Date = new Date()): { day: number; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: NZ_TIME_ZONE,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const day = WEEKDAYS.indexOf(get('weekday'));
    const hour = Number(get('hour')) % 24;
    const minute = Number(get('minute'));
    if (day >= 0 && Number.isFinite(hour) && Number.isFinite(minute)) {
      return { day, minutes: hour * 60 + minute };
    }
  } catch {
    // Intl without time zone support: use the device clock below.
  }
  return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
}

interface Span {
  open: number;
  close: number | null; // null = open 24/7
}

function spansFor(periods: unknown): Span[] {
  if (!Array.isArray(periods)) return [];
  return periods
    .filter((p: HoursPeriod) => isPoint(p?.open))
    .map((p: HoursPeriod) => {
      const open = minuteOfWeek(p.open as HoursPoint);
      if (!isPoint(p.close)) return { open, close: null };
      const close = minuteOfWeek(p.close);
      return { open, close: close <= open ? close + WEEK : close };
    });
}

/** True/false when hours are known, null when there are no usable periods. */
export function isOpenNow(periods: unknown, now: Date = new Date()): boolean | null {
  const spans = spansFor(periods);
  if (spans.length === 0) return null;
  const { day, minutes } = nzClock(now);
  const m = day * 1440 + minutes;
  return spans.some(
    (s) =>
      s.close === null ||
      (m >= s.open && m < s.close) ||
      (m + WEEK >= s.open && m + WEEK < s.close)
  );
}

/** 1530 minutes-of-day -> "3:30pm". */
function formatMinutes(minutesOfDay: number): string {
  const h = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${m.toString().padStart(2, '0')}${suffix}`;
}

/**
 * Today's hours for display, e.g. "7:00am - 2:00pm, 5:00pm - 9:00pm", or
 * "Open 24 hours", or null when the cafe has no opening today.
 */
export function todayHoursLabel(periods: unknown, now: Date = new Date()): string | null {
  const spans = spansFor(periods);
  if (spans.length === 0) return null;
  if (spans.some((s) => s.close === null)) return 'Open 24 hours';

  const { day } = nzClock(now);
  const today = spans
    .filter((s) => Math.floor(s.open / 1440) === day)
    .sort((a, b) => a.open - b.open);
  if (today.length === 0) return null;

  return today
    .map((s) => `${formatMinutes(s.open % 1440)} - ${formatMinutes((s.close as number) % 1440)}`)
    .join(', ');
}
