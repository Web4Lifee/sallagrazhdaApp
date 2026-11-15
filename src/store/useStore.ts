import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api, type NewPaymentInput, type Snapshot } from '@/lib/api';
import { seasonOf, seasonStart } from '@/lib/season';
import type { Person, PersonInput, SeasonRecord, Settings, Ticket } from '@/lib/types';

export type { NewPaymentInput } from '@/lib/api';

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

type Data = {
  people: Person[];
  tickets: Ticket[];
  settings: Settings;
  /** Seasons that have been started, oldest first. */
  seasons: SeasonRecord[];
  nextTicketNumber: number;
  /** "personId:season" keys of yearly tickets the user deleted, so they are not generated again. */
  dismissedAnnual: string[];
  /**
   * "server": a cached copy of the server's data (the normal case).
   * "local": data created by the old offline-only version of the app, not uploaded yet.
   */
  source: 'local' | 'server';
  /** When the cache was last refreshed from the server. */
  syncedAt: string | null;
};

type Actions = {
  /** Downloads everything from the server and replaces the cache. Skips if it ran moments ago unless `force`. */
  sync: (options?: { force?: boolean }) => Promise<void>;
  applySnapshot: (snapshot: Snapshot) => void;
  /** The cached data in the shape the server's import expects. */
  localSnapshot: () => Snapshot;
  /** Forgets all cached data (on sign-out). */
  clear: () => void;

  addPerson: (input: PersonInput) => Promise<Person>;
  updatePerson: (id: string, input: PersonInput) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  createPayment: (input: NewPaymentInput) => Promise<Ticket>;
  markPaid: (ticketId: string, amount?: number) => Promise<void>;
  markUnpaid: (ticketId: string) => Promise<void>;
  deleteTicket: (ticketId: string) => Promise<void>;
  /** Shows the change at once and rolls it back if the server refuses it. */
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** False when the reason is empty or already exists. */
  addReason: (reason: string) => Promise<boolean>;
  removeReason: (reason: string) => Promise<void>;
  /** Starts the next season now (the Settings button). Returns the season year and how many tickets were created. */
  startSeason: () => Promise<{ season: number; created: number }>;
};

export type AppState = Data & Actions;

const EMPTY: Data = {
  people: [],
  tickets: [],
  settings: DEFAULT_SETTINGS,
  seasons: [],
  nextTicketNumber: 1,
  dismissedAnnual: [],
  source: 'server',
  syncedAt: null,
};

/** Amounts go to the server in whole cents. */
const cents = (n: number) => Math.round(n * 100) / 100;

const upsert = (tickets: Ticket[], ticket: Ticket) =>
  tickets.some((t) => t.id === ticket.id) ? tickets.map((t) => (t.id === ticket.id ? ticket : t)) : [...tickets, ticket];

const SYNC_THROTTLE_MS = 15_000;
let syncing: Promise<void> | null = null;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      sync: async ({ force = false } = {}) => {
        const last = get().syncedAt;
        if (!force && last && Date.now() - Date.parse(last) < SYNC_THROTTLE_MS) return;
        syncing ??= api
          .sync()
          .then((snapshot) => get().applySnapshot(snapshot))
          .finally(() => {
            syncing = null;
          });
        return syncing;
      },

      applySnapshot: (snapshot) =>
        set({
          people: snapshot.people,
          tickets: snapshot.tickets,
          settings: { ...DEFAULT_SETTINGS, ...snapshot.settings },
          seasons: snapshot.seasons,
          nextTicketNumber: snapshot.nextTicketNumber,
          dismissedAnnual: snapshot.dismissedAnnual,
          source: 'server',
          syncedAt: new Date().toISOString(),
        }),

      localSnapshot: () => {
        const s = get();
        const clip = (v: string, max: number) => v.trim().slice(0, max);
        return {
          people: s.people.map((p) => ({
            ...p,
            firstName: clip(p.firstName, 80),
            fatherName: clip(p.fatherName, 80),
            lastName: clip(p.lastName, 80),
          })),
          tickets: s.tickets.map((t) => ({
            ...t,
            amount: cents(t.amount),
            ...(t.due !== undefined && { due: cents(t.due) }),
            reasons: t.reasons.map((r) => clip(r, 100)).filter(Boolean).slice(0, 50),
            ...(t.note !== undefined && { note: clip(t.note, 500) }),
          })),
          settings: {
            ...s.settings,
            goal: cents(s.settings.goal),
            annualFee: cents(s.settings.annualFee),
            reasons: s.settings.reasons.map((r) => clip(r, 100)).filter(Boolean).slice(0, 50),
          },
          seasons: s.seasons,
          nextTicketNumber: s.nextTicketNumber,
          dismissedAnnual: s.dismissedAnnual,
        };
      },

      clear: () => set(EMPTY),

      addPerson: async (input) => {
        const { person, createdTickets } = await api.createPerson(input);
        set((s) => ({
          people: [...s.people, person],
          tickets: createdTickets.reduce(upsert, s.tickets),
          nextTicketNumber: Math.max(s.nextTicketNumber, ...createdTickets.map((t) => t.number + 1)),
        }));
        return person;
      },

      updatePerson: async (id, input) => {
        const person = await api.updatePerson(id, input);
        set((s) => ({ people: s.people.map((p) => (p.id === id ? person : p)) }));
      },

      deletePerson: async (id) => {
        await api.deletePerson(id);
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
          tickets: s.tickets.filter((t) => t.personId !== id),
          dismissedAnnual: s.dismissedAnnual.filter((k) => !k.startsWith(`${id}:`)),
        }));
      },

      createPayment: async (input) => {
        const ticket = await api.createPayment({
          ...input,
          amount: cents(input.amount),
          note: input.note?.trim() || undefined,
        });
        set((s) => ({
          tickets: upsert(s.tickets, ticket),
          nextTicketNumber: Math.max(s.nextTicketNumber, ticket.number + 1),
        }));
        return ticket;
      },

      markPaid: async (ticketId, amount) => {
        const ticket = await api.markPaid(ticketId, amount === undefined ? undefined : cents(amount));
        set((s) => ({ tickets: upsert(s.tickets, ticket) }));
      },

      markUnpaid: async (ticketId) => {
        const ticket = await api.markUnpaid(ticketId);
        set((s) => ({ tickets: upsert(s.tickets, ticket) }));
      },

      deleteTicket: async (ticketId) => {
        const ticket = get().tickets.find((t) => t.id === ticketId);
        await api.deleteTicket(ticketId);
        set((s) => ({
          tickets: s.tickets.filter((t) => t.id !== ticketId),
          dismissedAnnual:
            ticket?.kind === 'annual' ? [...s.dismissedAnnual, `${ticket.personId}:${ticket.season}`] : s.dismissedAnnual,
        }));
      },

      updateSettings: async (patch) => {
        const before = get().settings;
        set({ settings: { ...before, ...patch } });
        try {
          const saved = await api.updateSettings({
            ...patch,
            ...(patch.goal !== undefined && { goal: cents(patch.goal) }),
            ...(patch.annualFee !== undefined && { annualFee: cents(patch.annualFee) }),
          });
          set({ settings: { ...DEFAULT_SETTINGS, ...saved } });
        } catch (error) {
          set({ settings: before });
          throw error;
        }
      },

      addReason: async (reason) => {
        const value = reason.trim();
        const { reasons } = get().settings;
        if (!value || reasons.some((r) => r.toLowerCase() === value.toLowerCase())) return false;
        await get().updateSettings({ reasons: [...reasons, value] });
        return true;
      },

      removeReason: (reason) => get().updateSettings({ reasons: get().settings.reasons.filter((r) => r !== reason) }),

      startSeason: async () => {
        const { season, createdTickets } = await api.startSeason();
        // The new yearly tickets are created on the server; fetch them.
        await get().sync({ force: true });
        return { season: season.year, created: createdTickets };
      },
    }),
    {
      name: 'babi-app-store',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Data => ({
        people: s.people,
        tickets: s.tickets,
        settings: s.settings,
        seasons: s.seasons,
        nextTicketNumber: s.nextTicketNumber,
        dismissedAnnual: s.dismissedAnnual,
        source: s.source,
        syncedAt: s.syncedAt,
      }),
      migrate: (persisted, version) => {
        const data = (persisted ?? {}) as Partial<Data>;
        if (version < 2 && !data.seasons) data.seasons = migrateSeasons(data);
        // Everything saved before version 3 was created offline on this phone.
        if (version < 3) {
          data.source = 'local';
          data.syncedAt = null;
        }
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
