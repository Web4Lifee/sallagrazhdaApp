import { MONTHS, MONTHS_SHORT } from './format';
import type { SeasonRecord, Settings } from './types';

/** Old date-based season of a date (used only to migrate data from the first version). */
export function seasonOf(date: Date, startMonth: number): number {
  return date.getMonth() >= startMonth ? date.getFullYear() : date.getFullYear() - 1;
}

export function seasonStart(season: number, startMonth: number): Date {
  return new Date(season, startMonth, 1);
}

/** The latest started season, if any. */
export function currentSeason(seasons: SeasonRecord[]): SeasonRecord | undefined {
  let latest: SeasonRecord | undefined;
  for (const s of seasons) if (!latest || s.year > latest.year) latest = s;
  return latest;
}

/** Year of the next season to start: the one after the current, or the configured first season. */
export function nextSeasonYear(seasons: SeasonRecord[], settings: Settings): number {
  const current = currentSeason(seasons);
  return current ? current.year + 1 : settings.seasonStartYear;
}

/** When the next season starts automatically: the 1st of the chosen month. */
export function nextSeasonDate(seasons: SeasonRecord[], settings: Settings): Date {
  return seasonStart(nextSeasonYear(seasons, settings), settings.seasonStartMonth);
}

/**
 * The season that new payments and the dashboard belong to:
 * the current season, or the upcoming first season if none has started yet.
 */
export function activeSeasonYear(seasons: SeasonRecord[], settings: Settings): number {
  return currentSeason(seasons)?.year ?? settings.seasonStartYear;
}

/** "2027/28" (or "2027" for seasons starting in January). */
export function seasonShort(season: number, startMonth: number): string {
  if (startMonth === 0) return String(season);
  return `${season}/${String((season + 1) % 100).padStart(2, '0')}`;
}

/** "Tet 2027 – Sht 2028". If the next season started in a different month, the range ends the month before it. */
export function seasonRange(season: number, startMonth: number, nextStartMonth = startMonth): string {
  const endMonth = (nextStartMonth + 11) % 12;
  const endYear = nextStartMonth === 0 ? season : season + 1;
  return `${MONTHS_SHORT[startMonth]} ${season} – ${MONTHS_SHORT[endMonth]} ${endYear}`;
}

/** "1 Tetor 2027" */
export function seasonStartLabel(season: number, startMonth: number): string {
  return `1 ${MONTHS[startMonth]} ${season}`;
}
