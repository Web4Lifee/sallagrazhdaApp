import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { capitalize } from '@/lib/format';
import { activeSeasonYear, nextSeasonDate, nextSeasonYear, seasonOf, seasonStart } from '@/lib/season';
import type { Person, PersonInput, SeasonRecord, Settings, Ticket } from '@/lib/types';

export const DEFAULT_SETTINGS: Settings = {
  adminName: 'Administratori',
  organization: 'Mirëmbajtja e Oborrit',
  goal: 2500,
  annualFee: 35,
  seasonStartMonth: 9, // October
  seasonStartYear: 2027,
  reasons: ['Mirëmbajtja e oborrit', 'Kositja e barit', 'Pastrimi'],
  paperWidth: 58,
};

export type NewPaymentInput = {
  personId: string;
  amount: number;
  reasons: string[];
  note?: string;
  /** Pay this existing unpaid yearly ticket instead of creating a new one. */
  settleTicketId?: string;
  /** Record the payment as this person's yearly fee for the active season. */
  asAnnual?: boolean;
};

type Data = {
  people: Person[];
  tickets: Ticket[];
  settings: Settings;
  /** Seasons that have been started, oldest first. */
  seasons: SeasonRecord[];
  nextTicketNumber: number;
  /** "personId:season" keys of yearly tickets the user deleted, so they are not generated again. */
  dismissedAnnual: string[];
};

type Actions = {
  addPerson: (input: PersonInput) => Person;
  updatePerson: (id: string, input: PersonInput) => void;
  deletePerson: (id: string) => void;
  createPayment: (input: NewPaymentInput) => Ticket;
  markPaid: (ticketId: string, amount?: number) => void;
  markUnpaid: (ticketId: string) => void;
  deleteTicket: (ticketId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addReason: (reason: string) => boolean;
  removeReason: (reason: string) => void;
  /** Starts the next season right now (the Settings button). Returns the season year and how many tickets were created. */
  startSeason: () => { season: number; created: number };
  /** Starts every season whose start date (1st of the chosen month) has arrived. Returns how many seasons were started. */
  startDueSeasons: (now?: Date) => number;
  /** Makes sure every person has a yearly ticket for each started season they belong to. Returns how many were created. */
  ensureAnnualTickets: () => number;
};

export type AppState = Data & Actions;

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const annualKey = (personId: string, season: number) => `${personId}:${season}`;

const cleanPerson = (input: PersonInput): PersonInput => ({
  firstName: capitalize(input.firstName),
  fatherName: capitalize(input.fatherName),
  lastName: capitalize(input.lastName),
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      people: [],
      tickets: [],
      settings: DEFAULT_SETTINGS,
      seasons: [],
      nextTicketNumber: 1,
      dismissedAnnual: [],

      addPerson: (input) => {
        const person: Person = { id: uid(), ...cleanPerson(input), createdAt: new Date().toISOString() };
        set((s) => ({ people: [...s.people, person] }));
        get().ensureAnnualTickets();
        return person;
      },

      updatePerson: (id, input) =>
        set((s) => ({
          people: s.people.map((p) => (p.id === id ? { ...p, ...cleanPerson(input) } : p)),
        })),

      deletePerson: (id) =>
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
          tickets: s.tickets.filter((t) => t.personId !== id),
          dismissedAnnual: s.dismissedAnnual.filter((k) => !k.startsWith(`${id}:`)),
        })),

      createPayment: ({ personId, amount, reasons, note, settleTicketId, asAnnual }) => {
        const { tickets, settings, seasons, nextTicketNumber } = get();
        const now = new Date().toISOString();
        const trimmedNote = note?.trim() || undefined;

        if (settleTicketId) {
          const existing = tickets.find((t) => t.id === settleTicketId);
          if (existing) {
            const updated: Ticket = {
              ...existing,
              amount,
              reasons,
              note: trimmedNote,
              status: 'paid',
              paidAt: now,
            };
            set((s) => ({ tickets: s.tickets.map((t) => (t.id === existing.id ? updated : t)) }));
            return updated;
          }
        }

        const ticket: Ticket = {
          id: uid(),
          number: nextTicketNumber,
          personId,
          kind: asAnnual ? 'annual' : 'payment',
          season: activeSeasonYear(seasons, settings),
          amount,
          due: asAnnual ? settings.annualFee : undefined,
          reasons,
          status: 'paid',
          note: trimmedNote,
          createdAt: now,
          paidAt: now,
        };
        set((s) => ({ tickets: [...s.tickets, ticket], nextTicketNumber: s.nextTicketNumber + 1 }));
        return ticket;
      },

      markPaid: (ticketId, amount) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? { ...t, status: 'paid', paidAt: new Date().toISOString(), amount: amount ?? t.amount }
              : t,
          ),
        })),

      markUnpaid: (ticketId) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, status: 'unpaid', paidAt: undefined, amount: t.due ?? t.amount } : t,
          ),
        })),

      deleteTicket: (ticketId) =>
        set((s) => {
          const ticket = s.tickets.find((t) => t.id === ticketId);
          const dismissed =
            ticket?.kind === 'annual'
              ? [...s.dismissedAnnual, annualKey(ticket.personId, ticket.season)]
              : s.dismissedAnnual;
          return { tickets: s.tickets.filter((t) => t.id !== ticketId), dismissedAnnual: dismissed };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addReason: (reason) => {
        const value = reason.trim();
        const { reasons } = get().settings;
        if (!value || reasons.some((r) => r.toLowerCase() === value.toLowerCase())) return false;
        set((s) => ({ settings: { ...s.settings, reasons: [...s.settings.reasons, value] } }));
        return true;
      },

      removeReason: (reason) =>
        set((s) => ({ settings: { ...s.settings, reasons: s.settings.reasons.filter((r) => r !== reason) } })),

      startSeason: () => {
        const { seasons, settings } = get();
        const year = nextSeasonYear(seasons, settings);
        const record: SeasonRecord = { year, month: settings.seasonStartMonth, startedAt: new Date().toISOString() };
        set((s) => ({ seasons: [...s.seasons, record] }));
        return { season: year, created: get().ensureAnnualTickets() };
      },

      startDueSeasons: (now = new Date()) => {
        let started = 0;
        // Catch up if the app was not opened for a while (at most a few seasons).
        while (started < 5) {
          const { seasons, settings } = get();
          const start = nextSeasonDate(seasons, settings);
          if (start > now) break;
          const record: SeasonRecord = {
            year: nextSeasonYear(seasons, settings),
            month: settings.seasonStartMonth,
            startedAt: start.toISOString(),
          };
          set((s) => ({ seasons: [...s.seasons, record] }));
          started++;
        }
        if (started) get().ensureAnnualTickets();
        return started;
      },

      ensureAnnualTickets: () => {
        const { people, tickets, settings, seasons, nextTicketNumber, dismissedAnnual } = get();
        if (!seasons.length) return 0;
        const sorted = [...seasons].sort((a, b) => a.year - b.year);

        const taken = new Set(dismissedAnnual);
        for (const t of tickets) if (t.kind === 'annual') taken.add(annualKey(t.personId, t.season));

        const now = new Date().toISOString();
        const reason = settings.reasons[0] ?? 'Mirëmbajtja e oborrit';
        const created: Ticket[] = [];
        let number = nextTicketNumber;

        sorted.forEach((season, i) => {
          const endsAt = sorted[i + 1]?.startedAt;
          for (const person of people) {
            // People registered after this season ended don't owe for it.
            if (endsAt && person.createdAt >= endsAt) continue;
            if (taken.has(annualKey(person.id, season.year))) continue;
            created.push({
              id: uid(),
              number: number++,
              personId: person.id,
              kind: 'annual',
              season: season.year,
              amount: settings.annualFee,
              due: settings.annualFee,
              reasons: [reason],
              status: 'unpaid',
              createdAt: person.createdAt > season.startedAt ? now : season.startedAt,
            });
          }
        });

        if (created.length) {
          set((s) => ({ tickets: [...s.tickets, ...created], nextTicketNumber: number }));
        }
        return created.length;
      },
    }),
    {
      name: 'babi-app-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Data => ({
        people: s.people,
        tickets: s.tickets,
        settings: s.settings,
        seasons: s.seasons,
        nextTicketNumber: s.nextTicketNumber,
        dismissedAnnual: s.dismissedAnnual,
      }),
      migrate: (persisted, version) => {
        const data = (persisted ?? {}) as Partial<Data>;
        if (version < 2 && !data.seasons) data.seasons = migrateSeasons(data);
        return data as Data;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
    },
  ),
);

/** Version 1 started seasons by date only; turn that into explicit started seasons. */
function migrateSeasons(data: Partial<Data>): SeasonRecord[] {
  const settings = { ...DEFAULT_SETTINGS, ...data.settings };
  const month = settings.seasonStartMonth;
  const years = new Set<number>();
  for (let y = settings.seasonStartYear; y <= seasonOf(new Date(), month); y++) years.add(y);
  for (const t of data.tickets ?? []) if (t.kind === 'annual' && t.status === 'unpaid') years.add(t.season);
  return [...years]
    .sort((a, b) => a - b)
    .map((year) => ({ year, month, startedAt: seasonStart(year, month).toISOString() }));
}

/** True once the saved data has been loaded from device storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}
