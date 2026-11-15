import type { Person, Settings, Ticket } from '@/lib/types';

export type SeasonStatus = 'paid' | 'unpaid' | 'none';

export type SeasonStats = {
  collected: number;
  goal: number;
  remaining: number;
  progress: number;
  paidPeople: number;
  totalPeople: number;
  unpaidCount: number;
  outstanding: number;
  extra: number;
  paymentsCount: number;
};

const sum = (list: Ticket[]) => list.reduce((acc, t) => acc + t.amount, 0);

export function computeSeasonStats(
  people: Person[],
  tickets: Ticket[],
  settings: Settings,
  season: number,
): SeasonStats {
  const personIds = new Set(people.map((p) => p.id));
  const inSeason = tickets.filter((t) => t.season === season && personIds.has(t.personId));
  const paid = inSeason.filter((t) => t.status === 'paid');
  const annual = inSeason.filter((t) => t.kind === 'annual');
  const unpaid = annual.filter((t) => t.status === 'unpaid');

  const collected = sum(paid);
  const extra = paid.reduce(
    (acc, t) => acc + (t.kind === 'payment' ? t.amount : Math.max(0, t.amount - (t.due ?? settings.annualFee))),
    0,
  );

  return {
    collected,
    goal: settings.goal,
    remaining: Math.max(0, settings.goal - collected),
    progress: settings.goal > 0 ? Math.min(1, collected / settings.goal) : 0,
    paidPeople: new Set(annual.filter((t) => t.status === 'paid').map((t) => t.personId)).size,
    totalPeople: people.length,
    unpaidCount: unpaid.length,
    outstanding: sum(unpaid),
    extra,
    paymentsCount: paid.length,
  };
}

/** Yearly-fee status for each person in the given season. */
export function seasonStatusMap(tickets: Ticket[], season: number): Map<string, SeasonStatus> {
  const map = new Map<string, SeasonStatus>();
  for (const t of tickets) {
    if (t.kind !== 'annual' || t.season !== season) continue;
    if (map.get(t.personId) === 'paid') continue;
    map.set(t.personId, t.status);
  }
  return map;
}

export function ticketDate(t: Ticket): string {
  return t.paidAt ?? t.createdAt;
}

export function sortTicketsByDate(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => ticketDate(b).localeCompare(ticketDate(a)) || b.number - a.number);
}

export function recentPayments(people: Person[], tickets: Ticket[], count = 3) {
  const byId = new Map(people.map((p) => [p.id, p]));
  return tickets
    .filter((t) => t.status === 'paid' && t.paidAt && byId.has(t.personId))
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
    .slice(0, count)
    .map((ticket) => ({ ticket, person: byId.get(ticket.personId)! }));
}

/** All seasons that have data, plus the active one, oldest first. */
export function knownSeasons(tickets: Ticket[], active: number): number[] {
  const set = new Set<number>([active]);
  for (const t of tickets) set.add(t.season);
  return [...set].sort((a, b) => a - b);
}

export function ticketTitle(t: Ticket, seasonLabel: string): string {
  return t.kind === 'annual' ? `Tarifa vjetore ${seasonLabel}` : 'Pagesë shtesë';
}
