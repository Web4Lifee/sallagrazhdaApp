/**
 * Client for the sallagrazhda backend (see docs/API.md in the backend project).
 * The server is the source of truth: it assigns receipt numbers, starts seasons and
 * creates the yearly tickets. The app keeps a cached copy for fast, offline reading.
 */
import type { Person, PersonInput, SeasonRecord, Settings, Ticket } from '@/lib/types';

export type User = { id: string; username: string; displayName: string };

/** Everything the app stores, in the same shape the server sends from /v1/sync. */
export type Snapshot = {
  people: Person[];
  tickets: Ticket[];
  settings: Settings;
  seasons: SeasonRecord[];
  nextTicketNumber: number;
  dismissedAnnual: string[];
};

export type NewPaymentInput = {
  personId: string;
  amount: number;
  reasons: string[];
  note?: string;
  settleTicketId?: string;
  asAnnual?: boolean;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TIMEOUT_MS = 20_000;

let baseUrl = '';
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function configureApi(options: { baseUrl?: string; token?: string | null; onUnauthorized?: () => void }) {
  if (options.baseUrl !== undefined) baseUrl = options.baseUrl;
  if (options.token !== undefined) token = options.token;
  if (options.onUnauthorized !== undefined) onUnauthorized = options.onUnauthorized;
}

async function request<T>(method: string, path: string, body?: unknown, { auth = true } = {}): Promise<T> {
  if (!baseUrl) throw new ApiError(0, 'NO_SERVER', 'No server address');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(auth && token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Network request failed');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string; details?: unknown } })
    | null;

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    const error = data?.error;
    throw new ApiError(res.status, error?.code ?? 'HTTP_ERROR', error?.message ?? `HTTP ${res.status}`, error?.details);
  }
  return data as T;
}

export const api = {
  /** Checks that the address belongs to this backend before sending a password to it. */
  async ping(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(`${url}/health`, { signal: controller.signal });
      clearTimeout(timer);
      const body = (await res.json().catch(() => null)) as { status?: string } | null;
      return res.ok && body?.status === 'ok';
    } catch {
      return false;
    }
  },

  login: (username: string, password: string) =>
    request<{ token: string; expiresAt: string; user: User }>(
      'POST',
      '/v1/auth/login',
      { username, password },
      { auth: false },
    ),
  logout: () => request<void>('POST', '/v1/auth/logout'),
  me: () => request<{ user: User }>('GET', '/v1/auth/me'),

  sync: () => request<Snapshot & { serverTime: string }>('GET', '/v1/sync'),
  importData: (data: Snapshot) =>
    request<{ people: number; tickets: number; seasons: number; dismissedAnnual: number }>('POST', '/v1/import', data),

  createPerson: (input: PersonInput) =>
    request<{ person: Person; createdTickets: Ticket[] }>('POST', '/v1/people', input),
  updatePerson: (id: string, input: PersonInput) => request<Person>('PUT', `/v1/people/${encodeURIComponent(id)}`, input),
  deletePerson: (id: string) => request<void>('DELETE', `/v1/people/${encodeURIComponent(id)}`),

  createPayment: (input: NewPaymentInput) => request<Ticket>('POST', '/v1/payments', input),
  markPaid: (id: string, amount?: number) =>
    request<Ticket>('POST', `/v1/tickets/${encodeURIComponent(id)}/pay`, amount === undefined ? {} : { amount }),
  markUnpaid: (id: string) => request<Ticket>('POST', `/v1/tickets/${encodeURIComponent(id)}/unpay`),
  deleteTicket: (id: string) => request<void>('DELETE', `/v1/tickets/${encodeURIComponent(id)}`),

  updateSettings: (patch: Partial<Settings>) => request<Settings>('PATCH', '/v1/settings', patch),
  startSeason: () => request<{ season: SeasonRecord; createdTickets: number }>('POST', '/v1/seasons/start'),
};

/** A short Albanian explanation of what went wrong, for alerts. */
export function errorMessage(error: unknown): { title: string; message?: string } {
  if (!(error instanceof ApiError)) return { title: 'Diçka shkoi keq', message: 'Provoni përsëri.' };
  switch (error.code) {
    case 'NETWORK':
    case 'NO_SERVER':
      return { title: 'Nuk ka lidhje me serverin', message: 'Kontrolloni internetin dhe provoni përsëri.' };
    case 'UNAUTHORIZED':
      return { title: 'Sesioni ka skaduar', message: 'Hyni përsëri në llogari.' };
    case 'RATE_LIMITED':
      return { title: 'Shumë përpjekje', message: 'Prisni pak minuta dhe provoni përsëri.' };
    case 'ANNUAL_TICKET_EXISTS':
      return { title: 'Fletëpagesa vjetore ekziston', message: 'Ky person e ka tashmë fletëpagesën vjetore për këtë sezon.' };
    case 'NOT_FOUND':
      return { title: 'Nuk u gjet', message: 'Mund të jetë fshirë nga një pajisje tjetër. Rifreskoni të dhënat.' };
    case 'CONFLICT':
      return { title: 'Nuk u ruajt', message: 'Të dhënat kanë ndryshuar ndërkohë. Rifreskoni dhe provoni përsëri.' };
    case 'BAD_REQUEST':
      return { title: 'Të dhëna të pavlefshme', message: 'Kontrolloni fushat dhe provoni përsëri.' };
    default:
      return error.status >= 500
        ? { title: 'Problem në server', message: 'Provoni përsëri pas pak.' }
        : { title: 'Diçka shkoi keq', message: 'Provoni përsëri.' };
  }
}
