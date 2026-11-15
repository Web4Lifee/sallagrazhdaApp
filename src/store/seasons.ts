import { useMemo } from 'react';

import { formatMoney } from '@/lib/format';
import { confirm, haptic, notify } from '@/lib/platform';
import { reportError } from '@/lib/useBusy';
import {
  activeSeasonYear,
  currentSeason,
  nextSeasonDate,
  nextSeasonYear,
  seasonRange,
  seasonShort,
} from '@/lib/season';
import type { SeasonRecord, Settings } from '@/lib/types';
import { useStore } from '@/store/useStore';

export type SeasonInfo = {
  /** The latest started season, if any. */
  current?: SeasonRecord;
  /** Season that payments and the dashboard use (current, or the upcoming first one). */
  active: number;
  nextYear: number;
  nextDate: Date;
  /** "2027/28" */
  label: (year: number) => string;
  /** "Tet 2027 – Sht 2028" */
  range: (year: number) => string;
};

export function buildSeasonInfo(seasons: SeasonRecord[], settings: Settings): SeasonInfo {
  const monthOf = (year: number) => seasons.find((s) => s.year === year)?.month ?? settings.seasonStartMonth;
  return {
    current: currentSeason(seasons),
    active: activeSeasonYear(seasons, settings),
    nextYear: nextSeasonYear(seasons, settings),
    nextDate: nextSeasonDate(seasons, settings),
    label: (year) => seasonShort(year, monthOf(year)),
    range: (year) => {
      const next = seasons.find((s) => s.year === year + 1);
      return seasonRange(year, monthOf(year), next?.month);
    },
  };
}

export function useSeasonInfo(): SeasonInfo {
  const seasons = useStore((s) => s.seasons);
  const settings = useStore((s) => s.settings);
  return useMemo(() => buildSeasonInfo(seasons, settings), [seasons, settings]);
}

/** Asks for confirmation, then starts the next season and creates the unpaid yearly tickets. */
export function useStartSeason(): () => Promise<void> {
  const startSeason = useStore((s) => s.startSeason);
  const peopleCount = useStore((s) => s.people.length);
  const fee = useStore((s) => s.settings.annualFee);
  const info = useSeasonInfo();

  return async () => {
    const label = info.label(info.nextYear);
    const ok = await confirm({
      title: `Të fillojë sezoni ${label}?`,
      message:
        `Do të krijohet një fletëpagesë e papaguar (${formatMoney(fee)}) për ` +
        `${peopleCount === 1 ? '1 person' : `secilin nga ${peopleCount} personat`}.` +
        (info.current ? ` Sezoni ${info.label(info.current.year)} mbyllet.` : ''),
      confirmText: 'Fillo sezonin',
    });
    if (!ok) return;
    try {
      const { created } = await startSeason();
      haptic.success();
      notify(`Sezoni ${label} filloi`, `U krijuan ${created} fletëpagesa të papaguara.`);
    } catch (e) {
      reportError(e);
    }
  };
}
