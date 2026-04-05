export function buildInvoiceShareLink(bookingId: string): string {
  return `${window.location.origin}/invoice/${bookingId}`;
}
