import { Calendar, PawPrint } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { format } from 'date-fns';
import type { BookingRecord } from '@/lib/bookingService';

interface PendingRequestCardProps {
  booking: BookingRecord;
  onAccept: (booking: BookingRecord) => void;
  onDecline: (booking: BookingRecord) => void;
}

export function PendingRequestCard({ booking, onAccept, onDecline }: PendingRequestCardProps) {
  const startDate = new Date(`${booking.start_date}T00:00:00`);
  const endDate = new Date(`${booking.end_date}T00:00:00`);

  const dateRange =
    booking.type === 'daycare'
      ? format(startDate, 'MMM d, yyyy')
      : `${format(startDate, 'MMM d')} → ${format(endDate, 'MMM d, yyyy')}`;

  return (
    <Card className="bg-gradient-to-br from-amber/10 to-terracotta/5 border-amber/30 overflow-hidden">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <DogAvatar name={booking.dog?.name ?? 'Dog'} src={booking.dog?.photo_url} size="lg" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber flex items-center justify-center border-2 border-white shadow-sm">
            <PawPrint size={12} weight="fill" className="text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-black text-bark truncate text-base leading-tight">
              {booking.dog?.name ?? 'Unknown Dog'}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber text-[10px] font-black text-white uppercase tracking-tight shrink-0">
              Pending
            </span>
          </div>

          <p className="text-xs font-black text-bark-light/50 uppercase tracking-widest mb-2">
            {booking.dog?.owner_name || 'Owner'}
          </p>

          <div className="flex items-center gap-1.5 text-[10px] text-bark-light/60 mb-3">
            <Calendar size={10} weight="bold" />
            <span className="font-black">{dateRange}</span>
          </div>

          {booking.dog?.notes && (
            <div className="bg-white/50 rounded-lg p-2 mb-3">
              <p className="text-[10px] text-bark-light/70 line-clamp-2 italic">
                "{booking.dog.notes}"
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 py-2 px-3 rounded-lg bg-sage text-white text-xs font-black uppercase tracking-wide hover:bg-sage/90 active:scale-[0.98] transition-all"
              onClick={() => onAccept(booking)}
            >
              Accept
            </button>
            <button
              type="button"
              className="flex-1 py-2 px-3 rounded-lg bg-pebble/30 text-bark-light text-xs font-black uppercase tracking-wide hover:bg-pebble/50 active:scale-[0.98] transition-all"
              onClick={() => onDecline(booking)}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
