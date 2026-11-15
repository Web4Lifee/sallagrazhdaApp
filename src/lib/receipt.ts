import * as Print from 'expo-print';
import { Platform } from 'react-native';

import { formatMoney, formalName, receiptNumber } from './format';
import type { Person, Settings, Ticket } from './types';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pad = (n: number) => String(n).padStart(2, '0');
const numericDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Points per millimetre (expo-print sizes are in 1/72 inch). */
const PT_PER_MM = 72 / 25.4;

export function receiptHtml(ticket: Ticket, person: Person, settings: Settings, seasonLabel: string): string {
  const paid = ticket.status === 'paid';
  const width = settings.paperWidth;
  const base = width === 58 ? 9.5 : 11;
  const type = ticket.kind === 'annual' ? 'Tarifa vjetore' : 'Pagesë shtesë';
  const extra = ticket.kind === 'annual' && ticket.due && ticket.amount > ticket.due ? ticket.amount - ticket.due : 0;

  return `<!DOCTYPE html>
<html lang="sq"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: ${width}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${width}mm; background: #fff; }
  body { padding: 3mm 3mm 8mm; font-family: 'Courier New', Courier, monospace; font-size: ${base}pt; color: #000; line-height: 1.35; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .org { font-size: ${base + 2.5}pt; font-weight: 700; text-transform: uppercase; letter-spacing: .5pt; }
  .title { font-size: ${base + 0.5}pt; letter-spacing: 2pt; margin-top: 1mm; }
  .sep { border-top: 1px dashed #000; margin: 2.2mm 0; }
  .row { display: flex; justify-content: space-between; gap: 2mm; }
  .row span:last-child { text-align: right; }
  .muted { font-size: ${base - 1}pt; }
  .total { font-size: ${base + 5}pt; font-weight: 700; }
  .stamp { display: inline-block; border: 2px solid #000; padding: .8mm 3mm; font-weight: 700; letter-spacing: 1.5pt; margin-top: 2mm; font-size: ${base + 1}pt; }
</style></head>
<body>
  <div class="c org">${esc(settings.organization)}</div>
  <div class="c title">FLETËPAGESË</div>
  <div class="sep"></div>
  <div class="row"><span>Nr.</span><span class="b">${receiptNumber(ticket.number)}</span></div>
  <div class="row"><span>Data</span><span>${numericDate(ticket.paidAt ?? ticket.createdAt)}</span></div>
  <div class="row"><span>Sezoni</span><span>${esc(seasonLabel)}</span></div>
  <div class="sep"></div>
  <div class="muted">Paguesi</div>
  <div class="b">${esc(formalName(person))}</div>
  <div class="sep"></div>
  <div class="muted">${type}</div>
  ${ticket.reasons.map((r) => `<div>- ${esc(r)}</div>`).join('')}
  ${ticket.note ? `<div class="muted" style="margin-top:1.5mm">Shënim: ${esc(ticket.note)}</div>` : ''}
  <div class="sep"></div>
  ${extra > 0 ? `<div class="row muted"><span>Tarifa</span><span>${formatMoney(ticket.due ?? 0)}</span></div><div class="row muted"><span>Shtesë</span><span>${formatMoney(extra)}</span></div>` : ''}
  <div class="row total"><span>${paid ? 'TOTALI' : 'PËR T\'U PAGUAR'}</span><span>${formatMoney(ticket.amount)}</span></div>
  <div class="c"><span class="stamp">${paid ? 'PAGUAR' : 'PA PAGUAR'}</span></div>
  <div class="sep"></div>
  <div class="row"><span>Pranoi</span><span>${esc(settings.adminName)}</span></div>
  <div class="c" style="margin-top:4mm">Faleminderit!</div>
</body></html>`;
}

function estimateHeightPt(ticket: Ticket, settings: Settings): number {
  const lines = 22 + ticket.reasons.length + (ticket.note ? Math.ceil(ticket.note.length / 24) + 1 : 0);
  const lineMm = settings.paperWidth === 58 ? 4.6 : 5.4;
  return Math.ceil((lines * lineMm + 20) * PT_PER_MM);
}

/**
 * Prints through the phone's print system (AirPrint on iOS, Android print services).
 * For Bluetooth thermal printers on Android, install the printer's print-service app (e.g. RawBT).
 */
export async function printReceipt(
  ticket: Ticket,
  person: Person,
  settings: Settings,
  seasonLabel: string,
): Promise<void> {
  const html = receiptHtml(ticket, person, settings, seasonLabel);

  if (Platform.OS === 'web') {
    const win = globalThis.open?.('', '_blank', 'width=420,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
    return;
  }

  await Print.printAsync({
    html,
    width: Math.round(settings.paperWidth * PT_PER_MM),
    height: estimateHeightPt(ticket, settings),
  });
}
