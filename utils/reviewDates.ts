import { UserReview } from '../data/mockData';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_ABBR: Record<string, string> = {
  January: 'JAN',
  February: 'FEB',
  March: 'MAR',
  April: 'APR',
  May: 'MAY',
  June: 'JUN',
  July: 'JUL',
  August: 'AUG',
  September: 'SEP',
  October: 'OCT',
  November: 'NOV',
  December: 'DEC',
};

export type ParsedVisitDate = {
  year: number;
  month: string;
  day: number;
  timestamp: number;
};

function buildParsedVisitDate(year: number, monthIndex: number, day: number): ParsedVisitDate | null {
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;

  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month: MONTH_NAMES[monthIndex],
    day,
    timestamp: date.getTime(),
  };
}

function parseVisitDate(visitDate?: string): ParsedVisitDate | null {
  if (!visitDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(visitDate);
  if (!match) return null;
  const [, y, m, d] = match;
  const monthIndex = Number(m) - 1;
  return buildParsedVisitDate(Number(y), monthIndex, Number(d));
}

function parseDisplayDate(displayDate: string): ParsedVisitDate | null {
  const currentDate = new Date();
  if (displayDate === 'Just now') {
    return buildParsedVisitDate(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );
  }

  const dateMatch = displayDate.match(/^(\d+)\s+(\w+)(?:\s+(\d{4}))?$/);
  if (!dateMatch) return null;

  const [, day, month, year] = dateMatch;
  const monthIndex = MONTH_NAMES.indexOf(month);
  return buildParsedVisitDate(
    year ? Number(year) : currentDate.getFullYear(),
    monthIndex,
    Number(day)
  );
}

/** Best-effort visit date for a review: prefer the user-picked `visitDate`,
 *  fall back to parsing the display `date` string. */
export function getReviewVisitDate(review: UserReview): ParsedVisitDate | null {
  return parseVisitDate(review.visitDate) || parseDisplayDate(review.date);
}

export interface ReviewYearGroup {
  year: string;
  reviews: UserReview[];
}

/** Group reviews by visit year (newest first, "Other" last), each group sorted
 *  newest-first. Mirrors the original Diary grouping in profile.tsx. */
export function groupReviewsByYear(userReviews: UserReview[]): ReviewYearGroup[] {
  const grouped: { [key: string]: UserReview[] } = {};

  userReviews.forEach((review) => {
    const visitDate = getReviewVisitDate(review);
    const year = visitDate ? String(visitDate.year) : 'Other';
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(review);
  });

  const sortValueOf = (review: UserReview): number =>
    getReviewVisitDate(review)?.timestamp || 0;

  return Object.keys(grouped)
    .sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return Number(b) - Number(a);
    })
    .map((year) => ({
      year,
      reviews: grouped[year].sort((a, b) => sortValueOf(b) - sortValueOf(a)),
    }));
}

export interface ReviewMonthGroup {
  /** Display label for the band, e.g. "October" or "October 2025". */
  label: string;
  /** Stable key: "2026-09", or "other" when the date could not be parsed. */
  key: string;
  reviews: UserReview[];
}

/**
 * Group reviews by visit month, newest first, each group sorted newest-first.
 * This is what the Figma diary shows: cream bands headed by a month name.
 *
 * The frames label bands with a bare month name. That is ambiguous once the
 * diary spans more than a year, so a month outside the current year carries its
 * year too. Undated reviews collect under "Earlier" at the end rather than
 * being dropped.
 */
export function groupReviewsByMonth(userReviews: UserReview[]): ReviewMonthGroup[] {
  const grouped = new Map<string, { label: string; sort: number; reviews: UserReview[] }>();
  const currentYear = new Date().getFullYear();

  userReviews.forEach((review) => {
    const visitDate = getReviewVisitDate(review);

    if (!visitDate) {
      const existing = grouped.get('other');
      if (existing) existing.reviews.push(review);
      else grouped.set('other', { label: 'Earlier', sort: -1, reviews: [review] });
      return;
    }

    const monthIndex = MONTH_NAMES.indexOf(visitDate.month);
    const key = `${visitDate.year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const label =
      visitDate.year === currentYear
        ? visitDate.month
        : `${visitDate.month} ${visitDate.year}`;

    const existing = grouped.get(key);
    if (existing) existing.reviews.push(review);
    else {
      grouped.set(key, {
        label,
        sort: visitDate.year * 12 + monthIndex,
        reviews: [review],
      });
    }
  });

  const sortValueOf = (review: UserReview): number =>
    getReviewVisitDate(review)?.timestamp || 0;

  return Array.from(grouped.entries())
    .sort(([, a], [, b]) => b.sort - a.sort)
    .map(([key, group]) => ({
      key,
      label: group.label,
      reviews: group.reviews.sort((a, b) => sortValueOf(b) - sortValueOf(a)),
    }));
}
