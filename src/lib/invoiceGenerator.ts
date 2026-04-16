import { format } from 'date-fns';

export interface InvoiceLineItem {
  type: 'boarding' | 'daycare';
  isHoliday: boolean;
  count: number;
  rate: number;
}

export interface InvoiceOverrides {
  lineItems: InvoiceLineItem[];
  creditAmount: number;
}

export interface InvoiceInput {
  sitterName: string;
  clientName: string;
  dogName: string;
  startDate: string;
  endDate: string;
  subtotal: number;
  tipAmount?: number;
  paymentNotes?: string | null;
  lineItems?: InvoiceLineItem[];
  creditAmount?: number;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeLineItem(value: unknown): InvoiceLineItem | null {
  if (!isRecord(value)) return null;
  if (value.type !== 'boarding' && value.type !== 'daycare') return null;
  if (typeof value.isHoliday !== 'boolean') return null;

  const rawCount = toFiniteNumber(value.count, NaN);
  const rawRate = toFiniteNumber(value.rate, NaN);
  if (!Number.isFinite(rawCount) || !Number.isFinite(rawRate)) return null;

  return {
    type: value.type,
    isHoliday: value.isHoliday,
    count: Math.max(1, rawCount),
    rate: Math.max(0, rawRate),
  };
}

function normalizeCreditAmount(value: unknown): number {
  return Math.max(0, toFiniteNumber(value, 0));
}

export function parseInvoiceOverrides(value: unknown): InvoiceOverrides | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.lineItems)) return null;

  const lineItems: InvoiceLineItem[] = [];
  for (const item of value.lineItems) {
    const normalized = normalizeLineItem(item);
    if (!normalized) return null;
    lineItems.push(normalized);
  }

  return {
    lineItems,
    creditAmount: normalizeCreditAmount(value.creditAmount),
  };
}

export interface InvoiceTotals {
  lineItems: InvoiceLineItem[];
  hasLineItems: boolean;
  baseSubtotal: number;
  credit: number;
  subtotal: number;
  tip: number;
  total: number;
}

export function calculateInvoiceTotals(input: InvoiceInput): InvoiceTotals {
  const lineItems = (input.lineItems ?? []).map((item) => ({
    ...item,
    count: Math.max(1, toFiniteNumber(item.count, 1)),
    rate: Math.max(0, toFiniteNumber(item.rate, 0)),
  }));
  const hasLineItems = lineItems.length > 0;
  const baseSubtotal = hasLineItems
    ? lineItems.reduce((sum, item) => sum + item.count * item.rate, 0)
    : Math.max(0, toFiniteNumber(input.subtotal, 0));
  const credit = Math.min(baseSubtotal, normalizeCreditAmount(input.creditAmount));
  const subtotal = Math.max(0, baseSubtotal - credit);
  const tip = Math.max(0, toFiniteNumber(input.tipAmount, 0));
  const total = Math.max(0, subtotal + tip);

  return { lineItems, hasLineItems, baseSubtotal, credit, subtotal, tip, total };
}

export function generateInvoiceMarkdown(input: InvoiceInput): string {
  const { subtotal, tip, total } = calculateInvoiceTotals(input);

  return [
    `# Invoice`,
    ``,
    `Sitter: ${input.sitterName}`,
    `Client: ${input.clientName}`,
    `Dog: ${input.dogName}`,
    `Dates: ${format(new Date(input.startDate), 'MMM d, yyyy')} - ${format(new Date(input.endDate), 'MMM d, yyyy')}`,
    ``,
    `Subtotal: $${subtotal.toFixed(2)}`,
    `Tip: $${tip.toFixed(2)}`,
    `Total: $${total.toFixed(2)}`,
    input.paymentNotes ? `Notes: ${input.paymentNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
