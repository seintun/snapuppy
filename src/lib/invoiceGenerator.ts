import { format } from 'date-fns';

export interface InvoiceInput {
  sitterName: string;
  clientName: string;
  dogName: string;
  startDate: string;
  endDate: string;
  subtotal: number;
  tipAmount?: number;
  paymentNotes?: string | null;
}

export function generateInvoiceMarkdown(input: InvoiceInput): string {
  const tip = input.tipAmount ?? 0;
  const total = input.subtotal + tip;

  return [
    `# Invoice`,
    ``,
    `Sitter: ${input.sitterName}`,
    `Client: ${input.clientName}`,
    `Dog: ${input.dogName}`,
    `Dates: ${format(new Date(input.startDate), 'MMM d, yyyy')} - ${format(new Date(input.endDate), 'MMM d, yyyy')}`,
    ``,
    `Subtotal: $${input.subtotal.toFixed(2)}`,
    `Tip: $${tip.toFixed(2)}`,
    `Total: $${total.toFixed(2)}`,
    input.paymentNotes ? `Notes: ${input.paymentNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
