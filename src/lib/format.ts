import type { Person } from './types';

export const MONTHS = [
  'Janar',
  'Shkurt',
  'Mars',
  'Prill',
  'Maj',
  'Qershor',
  'Korrik',
  'Gusht',
  'Shtator',
  'Tetor',
  'Nëntor',
  'Dhjetor',
];

export const MONTHS_SHORT = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];

export function formatMoney(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded % 1) > 0.001;
  const [int, dec] = Math.abs(rounded).toFixed(hasCents ? 2 : 0).split('.');
  return `${rounded < 0 ? '-' : ''}${int}${dec ? `,${dec}` : ''} €`;
}

/** Parses user input such as "35", "35,50" or "35.5". Returns NaN when invalid. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d*\.?\d{0,2}$/.test(cleaned) || cleaned === '' || cleaned === '.') return NaN;
  return Number(cleaned);
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTime(iso: string | Date): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "Sot", "Dje", "para 3 ditësh" or a date. */
export function formatRelative(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return `Sot, ${formatTime(d)}`;
  if (days === 1) return `Dje, ${formatTime(d)}`;
  if (days > 1 && days < 7) return `para ${days} ditësh`;
  return formatDate(d);
}

export function fullName(p: Pick<Person, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

/** Albanian-style full name: First (Father) Last */
export function formalName(p: Pick<Person, 'firstName' | 'fatherName' | 'lastName'>): string {
  return p.fatherName ? `${p.firstName} (${p.fatherName}) ${p.lastName}` : fullName(p);
}

/** "Flori Baftiaj" → "Flori" */
export function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function initials(p: Pick<Person, 'firstName' | 'lastName'>): string {
  return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
}

export function receiptNumber(n: number): string {
  return `#${String(n).padStart(5, '0')}`;
}

export function capitalize(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase() + w.slice(1) : w))
    .join(' ');
}
