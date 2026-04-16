import { format } from 'date-fns';

export interface InvoiceLineItem {
  type: 'boarding' | 'daycare';
  isHoliday: boolean;
  count: number;
  rate: number;
}

export type InvoiceAdjustmentKind = 'discount' | 'charge';

export interface InvoiceAdjustment {
  id: string;
  kind: InvoiceAdjustmentKind;
  description: string;
  amount: number;
}

export interface InvoiceOverrides {
  lineItems: InvoiceLineItem[];
  creditAmount: number;
  adjustments?: InvoiceAdjustment[];
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
  adjustments?: InvoiceAdjustment[];
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

function normalizeAdjustment(value: unknown): InvoiceAdjustment | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (value.kind !== 'discount' && value.kind !== 'charge') return null;
  if (typeof value.description !== 'string') return null;

  const amount = toFiniteNumber(value.amount, NaN);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return {
    id: value.id,
    kind: value.kind,
    description: value.description,
    amount,
  };
}

function sumAdjustmentAmounts(adjustments: InvoiceAdjustment[]): {
  charges: number;
  discounts: number;
} {
  let charges = 0;
  let discounts = 0;

  for (const adjustment of adjustments) {
    if (adjustment.kind === 'charge') {
      charges += adjustment.amount;
      continue;
    }

    discounts += adjustment.amount;
  }

  return { charges, discounts };
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

  const creditAmount = normalizeCreditAmount(value.creditAmount);
  const hasAdjustmentsField = Object.hasOwn(value, 'adjustments');
  let adjustments: InvoiceAdjustment[] | undefined;

  if (hasAdjustmentsField) {
    if (!Array.isArray(value.adjustments)) return null;

    adjustments = [];
    for (const item of value.adjustments) {
      const normalized = normalizeAdjustment(item);
      if (!normalized) return null;
      adjustments.push(normalized);
    }
  } else if (creditAmount > 0) {
    adjustments = [
      { id: 'legacy-credit', kind: 'discount', description: '', amount: creditAmount },
    ];
  }

  const adjustmentDiscounts = adjustments ? sumAdjustmentAmounts(adjustments).discounts : 0;

  return {
    lineItems,
    creditAmount: adjustments ? adjustmentDiscounts : creditAmount,
    adjustments,
  };
}

export interface InvoiceTotals {
  lineItems: InvoiceLineItem[];
  adjustments: InvoiceAdjustment[];
  hasLineItems: boolean;
  baseSubtotal: number;
  adjustmentCharges: number;
  adjustmentDiscounts: number;
  adjustmentNet: number;
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

  const rawAdjustments = input.adjustments;
  const adjustments = Array.isArray(rawAdjustments)
    ? rawAdjustments.flatMap((adjustment) => {
        if (adjustment.kind !== 'charge' && adjustment.kind !== 'discount') {
          return [];
        }

        return [
          {
            id: adjustment.id,
            kind: adjustment.kind,
            description: adjustment.description,
            amount: Math.max(0, toFiniteNumber(adjustment.amount, 0)),
          },
        ];
      })
    : [];

  if (!rawAdjustments && input.creditAmount) {
    adjustments.push({
      id: 'legacy-credit',
      kind: 'discount',
      description: '',
      amount: normalizeCreditAmount(input.creditAmount),
    });
  }

  const { charges: adjustmentCharges, discounts: rawDiscounts } = sumAdjustmentAmounts(adjustments);
  const maxDiscount = Math.max(0, baseSubtotal + adjustmentCharges);
  const adjustmentDiscounts = Math.min(maxDiscount, rawDiscounts);
  const credit = adjustmentDiscounts;
  const adjustmentNet = adjustmentCharges - adjustmentDiscounts;
  const subtotal = Math.max(0, baseSubtotal + adjustmentNet);
  const tip = Math.max(0, toFiniteNumber(input.tipAmount, 0));
  const total = Math.max(0, subtotal + tip);

  return {
    lineItems,
    adjustments,
    hasLineItems,
    baseSubtotal,
    adjustmentCharges,
    adjustmentDiscounts,
    adjustmentNet,
    credit,
    subtotal,
    tip,
    total,
  };
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
