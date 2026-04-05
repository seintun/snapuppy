import { useNavigate } from 'react-router';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
  getStatusVariant,
} from '@/features/bookings/bookingUi';
import type { ClientBooking } from './clientService';

interface ClientBookingCardProps {
  booking: ClientBooking;
}

export function ClientBookingCard({ booking }: ClientBookingCardProps) {
  const navigate = useNavigate();

  const handlePress = () => {
    navigate(`/client/bookings/${booking.id}`);
  };

  const statusVariant = getStatusVariant(booking.status);
  const statusLabel = getStatusLabel(booking.status);

  return (
    <Card pressable onClick={handlePress} className="flex items-center gap-3">
      <DogAvatar name={booking.dogName} src={booking.dogPhotoUrl} size="md" />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-bark truncate">{booking.dogName}</h3>
        <p className="text-sm text-bark-light truncate">
          {formatBookingRange({
            start_date: booking.startDate,
            end_date: booking.endDate,
            type: booking.type,
          })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        <span className="text-sm font-bold text-bark">{formatCurrency(booking.totalAmount)}</span>
      </div>
    </Card>
  );
}
