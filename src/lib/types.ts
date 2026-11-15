export type Person = {
  id: string;
  firstName: string;
  fatherName: string;
  lastName: string;
  createdAt: string;
};

export type PersonInput = Pick<Person, 'firstName' | 'fatherName' | 'lastName'>;

/**
 * annual  – the yearly maintenance fee, one per person per season (auto-generated or paid manually)
 * payment – any extra payment / donation outside the yearly fee
 */
export type TicketKind = 'annual' | 'payment';
export type TicketStatus = 'paid' | 'unpaid';

export type Ticket = {
  id: string;
  /** Sequential receipt number shown on printed tickets. */
  number: number;
  personId: string;
  kind: TicketKind;
  /** Season start year, e.g. 2027 means Oct 2027 – Sep 2028. */
  season: number;
  /** Amount paid (or still to pay while unpaid). */
  amount: number;
  /** For annual tickets: the yearly fee at the time the ticket was created. */
  due?: number;
  reasons: string[];
  status: TicketStatus;
  note?: string;
  createdAt: string;
  paidAt?: string;
};

/** A maintenance season that has been started (automatically or with the button). */
export type SeasonRecord = {
  /** Start year, e.g. 2027 for season 2027/28. */
  year: number;
  /** 0 = January … 9 = October */
  month: number;
  startedAt: string;
};

export type PaperWidth = 58 | 80;

export type Settings = {
  adminName: string;
  organization: string;
  goal: number;
  annualFee: number;
  /** Month the next season starts: 0 = January … 9 = October */
  seasonStartMonth: number;
  /** Year of the very first season (later seasons follow automatically). */
  seasonStartYear: number;
  reasons: string[];
  paperWidth: PaperWidth;
};
