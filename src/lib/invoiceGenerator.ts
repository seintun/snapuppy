import { format, parseISO } from 'date-fns';
import type { Database } from '@/types/database';

type Booking = Database['public']['Tables']['bookings']['Row'];
type Dog = Database['public']['Tables']['dogs']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type BookingDay = Database['public']['Tables']['booking_days']['Row'];

export interface InvoiceData {
  invoiceNumber: string;
  createdAt: string;
  businessName: string;
  businessLogoUrl: string | null;
  sitterEmail: string | null;
  paymentInstructions: string | null;
  clientName: string;
  clientPhone: string | null;
  dogName: string;
  dogBreed: string | null;
  dogPhotoUrl: string | null;
  startDate: string;
  endDate: string;
  bookingType: string;
  days: Array<{
    date: string;
    formattedDate: string;
    rateType: string;
    isHoliday: boolean;
    amount: number;
  }>;
  subtotal: number;
  tipAmount: number;
  total: number;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
}

export function generateInvoiceData(booking: Booking): InvoiceData {
  return {
    invoiceNumber: `INV-${booking.id.slice(0, 8).toUpperCase()}`,
    createdAt: format(new Date(booking.created_at), 'MMM d, yyyy'),
    businessName: '',
    businessLogoUrl: null,
    sitterEmail: null,
    paymentInstructions: null,
    clientName: '',
    clientPhone: null,
    dogName: '',
    dogBreed: null,
    dogPhotoUrl: null,
    startDate: booking.start_date,
    endDate: booking.end_date,
    bookingType: booking.type,
    days: [],
    subtotal: booking.total_amount,
    tipAmount: booking.tip_amount ?? 0,
    total: booking.total_amount + (booking.tip_amount ?? 0),
    isPaid: booking.is_paid ?? false,
    paidAt: booking.paid_at ?? null,
    notes: booking.payment_notes ?? null,
  };
}

export function populateInvoiceData(
  invoice: InvoiceData,
  profile: Profile,
  dog: Dog,
  days: BookingDay[],
): InvoiceData {
  return {
    ...invoice,
    businessName: profile.business_name ?? profile.display_name ?? 'Pet Sitting',
    businessLogoUrl: profile.business_logo_url ?? null,
    sitterEmail: profile.email ?? null,
    paymentInstructions: null,
    clientName: dog.owner_name ?? 'Client',
    clientPhone: dog.owner_phone ?? null,
    dogName: dog.name,
    dogBreed: dog.breed,
    dogPhotoUrl: dog.photo_url ?? null,
    days: days.map((d) => ({
      date: d.date,
      formattedDate: format(parseISO(d.date), 'EEE, MMM d'),
      rateType: d.rate_type,
      isHoliday: d.is_holiday,
      amount: d.amount,
    })),
  };
}

export function generateInvoiceHTML(invoice: InvoiceData): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const statusBadge = invoice.isPaid
    ? `<span style="background: #8FB886; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 13px;">PAID</span>`
    : `<span style="background: #D4845A; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 13px;">UNPAID</span>`;

  const logoHtml = invoice.businessLogoUrl
    ? `<img src="${invoice.businessLogoUrl}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px;" />`
    : `<div style="width: 80px; height: 80px; background: #8FB886; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 700;">🐾</div>`;

  const dogPhotoHtml = invoice.dogPhotoUrl
    ? `<img src="${invoice.dogPhotoUrl}" alt="${invoice.dogName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 3px solid #8FB886;" />`
    : `<div style="width: 60px; height: 60px; background: #F5F0EB; border-radius: 50%; border: 3px solid #8FB886; display: flex; align-items: center; justify-content: center; font-size: 24px;">🐕</div>`;

  const dayRows = invoice.days
    .map(
      (day) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E8E2DA; color: #4A3728; font-size: 14px;">
        ${day.formattedDate}
        ${day.isHoliday ? '<span style="background: #D4845A; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;">Holiday</span>' : ''}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E8E2DA; color: #4A3728; font-size: 14px; text-transform: capitalize;">${day.rateType}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E8E2DA; color: #4A3728; font-size: 14px; text-align: right;">${formatCurrency(day.amount)}</td>
    </tr>
  `,
    )
    .join('');

  const tipRow =
    invoice.tipAmount > 0
      ? `
    <tr>
      <td colspan="2" style="padding: 12px 16px; color: #4A3728; font-size: 14px; text-align: right;">Tip</td>
      <td style="padding: 12px 16px; color: #8FB886; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(invoice.tipAmount)}</td>
    </tr>
  `
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 24px; background: #F5F0EB; font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #FDFBF7; border-radius: 16px; box-shadow: 0 4px 20px rgba(74, 55, 40, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8FB886 0%, #7AB876 100%); padding: 32px; color: white;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0 0 4px 0; font-size: 28px; font-weight: 800;">${invoice.businessName}</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">Invoice ${invoice.invoiceNumber}</p>
          <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 13px;">Created: ${invoice.createdAt}</p>
        </div>
        <div style="text-align: right;">
          ${logoHtml}
        </div>
      </div>
    </div>

    <!-- Status & Client Info -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #E8E2DA;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <span style="color: #4A3728; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Status</span>
        ${statusBadge}
      </div>
      
      <div style="display: flex; gap: 24px; align-items: center;">
        ${dogPhotoHtml}
        <div>
          <p style="margin: 0 0 4px 0; color: #4A3728; font-size: 18px; font-weight: 700;">${invoice.dogName}</p>
          <p style="margin: 0; color: #7A6B5E; font-size: 14px;">${invoice.dogBreed ?? ''}</p>
          <p style="margin: 8px 0 0 0; color: #4A3728; font-size: 13px;">Owner: ${invoice.clientName}</p>
          ${invoice.clientPhone ? `<p style="margin: 2px 0 0 0; color: #7A6B5E; font-size: 13px;">📞 ${invoice.clientPhone}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Booking Dates -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #E8E2DA;">
      <p style="margin: 0 0 8px 0; color: #4A3728; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Booking Period</p>
      <p style="margin: 0; color: #4A3728; font-size: 18px; font-weight: 700;">
        ${format(parseISO(invoice.startDate), 'MMM d, yyyy')} → ${format(parseISO(invoice.endDate), 'MMM d, yyyy')}
      </p>
      <p style="margin: 4px 0 0 0; color: #7A6B5E; font-size: 14px; text-transform: capitalize;">${invoice.bookingType}</p>
    </div>

    <!-- Line Items -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #E8E2DA;">
      <p style="margin: 0 0 16px 0; color: #4A3728; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Day Breakdown</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 12px 16px; text-align: left; color: #7A6B5E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E8E2DA;">Date</th>
            <th style="padding: 12px 16px; text-align: left; color: #7A6B5E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E8E2DA;">Service</th>
            <th style="padding: 12px 16px; text-align: right; color: #7A6B5E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E8E2DA;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${dayRows}
          <tr>
            <td colspan="2" style="padding: 16px 16px 12px; color: #4A3728; font-size: 14px; text-align: right; font-weight: 600;">Subtotal</td>
            <td style="padding: 16px 16px 12px; color: #4A3728; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          ${tipRow}
        </tbody>
      </table>
    </div>

    <!-- Total -->
    <div style="padding: 24px 32px; background: #F5F0EB;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #4A3728; border-radius: 12px;">
        <span style="color: #F5F0EB; font-size: 16px; font-weight: 600;">Total Due</span>
        <span style="color: #8FB886; font-size: 28px; font-weight: 800;">${formatCurrency(invoice.total)}</span>
      </div>
    </div>

    <!-- Payment Instructions -->
    ${
      invoice.paymentInstructions
        ? `
    <div style="padding: 24px 32px; border-top: 1px solid #E8E2DA;">
      <p style="margin: 0 0 12px 0; color: #4A3728; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Instructions</p>
      <div style="background: #F5F0EB; padding: 16px; border-radius: 8px; border-left: 4px solid #8FB886;">
        <p style="margin: 0; color: #4A3728; font-size: 14px; white-space: pre-wrap;">${invoice.paymentInstructions}</p>
      </div>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <div style="padding: 24px 32px; background: #4A3728; color: #F5F0EB;">
      <p style="margin: 0; text-align: center; font-size: 12px; opacity: 0.8;">
        Thank you for your business! 🐾
      </p>
    </div>

  </div>
</body>
</html>`;
}

let invoiceShareUrls: Record<string, string> = {};

export async function getInvoiceShareUrl(bookingId: string): Promise<string> {
  if (invoiceShareUrls[bookingId]) {
    return invoiceShareUrls[bookingId];
  }

  const shareUrl = `inv-${bookingId.slice(0, 8)}-${Date.now().toString(36)}`;
  invoiceShareUrls[bookingId] = shareUrl;

  const { supabase } = await import('@/lib/supabase');

  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .single();

  if (existing) {
    return shareUrl;
  }

  return shareUrl;
}
