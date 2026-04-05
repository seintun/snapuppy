import { useState, useEffect, useCallback } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { formatCurrency } from '@/features/bookings/bookingUi';
import {
  generateInvoiceData,
  populateInvoiceData,
  generateInvoiceHTML,
  getInvoiceShareUrl,
  type InvoiceData,
} from '@/lib/invoiceGenerator';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { Copy, Download } from '@phosphor-icons/react';

type Booking = Database['public']['Tables']['bookings']['Row'];
type Dog = Database['public']['Tables']['dogs']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type BookingDay = Database['public']['Tables']['booking_days']['Row'];

interface InvoicePreviewProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePreview({ booking, isOpen, onClose }: InvoicePreviewProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadInvoiceData() {
      setLoading(true);
      try {
        const { data: dog } = await supabase
          .from('dogs')
          .select('*')
          .eq('id', booking.dog_id)
          .single();

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', booking.sitter_id)
          .single();

        const { data: days } = await supabase
          .from('booking_days')
          .select('*')
          .eq('booking_id', booking.id)
          .order('date', { ascending: true });

        if (dog && profile) {
          const invoiceData = generateInvoiceData(booking);
          const fullInvoice = populateInvoiceData(
            invoiceData,
            profile as Profile,
            dog as Dog,
            (days as BookingDay[]) || [],
          );
          setInvoice(fullInvoice);
        }
      } catch (err) {
        console.error('Failed to load invoice data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInvoiceData();
  }, [isOpen, booking]);

  const handleCopyLink = useCallback(async () => {
    const url = await getInvoiceShareUrl(booking.id);
    const fullUrl = `${window.location.origin}/invoice/${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [booking.id]);

  const handleDownload = useCallback(() => {
    if (!invoice) return;
    const html = generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [invoice]);

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Invoice Preview">
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-bark-light">Loading invoice...</span>
          </div>
        ) : invoice ? (
          <>
            <div className="bg-cream rounded-xl p-4 border border-warm-beige">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-bark">{invoice.businessName}</h3>
                  <p className="text-xs text-bark-light">{invoice.invoiceNumber}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    invoice.isPaid ? 'bg-sage text-white' : 'bg-terracotta text-white'
                  }`}
                >
                  {invoice.isPaid ? 'PAID' : 'UNPAID'}
                </span>
              </div>

              <div className="flex gap-3 items-center py-3 border-t border-warm-beige">
                {invoice.dogPhotoUrl ? (
                  <img
                    src={invoice.dogPhotoUrl}
                    alt={invoice.dogName}
                    className="w-12 h-12 rounded-full border-2 border-sage object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-sage bg-warm-beige flex items-center justify-center text-xl">
                    🐕
                  </div>
                )}
                <div>
                  <p className="font-semibold text-bark">{invoice.dogName}</p>
                  <p className="text-xs text-bark-light">
                    {invoice.dogBreed} • Owner: {invoice.clientName}
                  </p>
                </div>
              </div>

              <div className="py-3 border-t border-warm-beige">
                <p className="text-xs text-bark-light uppercase tracking-wide mb-1">
                  Booking Period
                </p>
                <p className="font-semibold text-bark">
                  {format(parseISO(invoice.startDate), 'MMM d, yyyy')} →{' '}
                  {format(parseISO(invoice.endDate), 'MMM d, yyyy')}
                </p>
              </div>

              <div className="py-3 border-t border-warm-beige">
                <p className="text-xs text-bark-light uppercase tracking-wide mb-2">
                  Day Breakdown
                </p>
                {invoice.days.map((day) => (
                  <div key={day.date} className="flex justify-between py-1 text-sm">
                    <span className="text-bark">
                      {day.formattedDate}
                      {day.isHoliday && (
                        <span className="ml-2 px-2 py-0.5 bg-terracotta text-white text-xs rounded-full">
                          Holiday
                        </span>
                      )}
                    </span>
                    <span className="text-bark font-medium">{formatCurrency(day.amount)}</span>
                  </div>
                ))}
              </div>

              {invoice.tipAmount > 0 && (
                <div className="py-2 border-t border-warm-beige flex justify-between text-sm">
                  <span className="text-bark">Tip</span>
                  <span className="text-sage font-semibold">
                    {formatCurrency(invoice.tipAmount)}
                  </span>
                </div>
              )}

              <div className="py-3 border-t border-warm-beige mt-3">
                <div className="flex justify-between items-center bg-bark px-4 py-3 rounded-lg">
                  <span className="text-warm-beige font-semibold">Total Due</span>
                  <span className="text-sage text-xl font-bold">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>

              {invoice.paymentInstructions && (
                <div className="mt-3 pt-3 border-t border-warm-beige">
                  <p className="text-xs text-bark-light uppercase tracking-wide mb-2">
                    Payment Instructions
                  </p>
                  <div className="bg-warm-beige p-3 rounded-lg border-l-4 border-sage">
                    <p className="text-sm text-bark whitespace-pre-wrap">
                      {invoice.paymentInstructions}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-sage text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                {copied ? (
                  <>
                    <span className="text-lg">✓</span>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-terracotta text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <Download size={20} />
                <span>Download</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-bark-light">Failed to load invoice</span>
          </div>
        )}
      </div>
    </SlideUpSheet>
  );
}
