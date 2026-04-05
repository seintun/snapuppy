import { useState } from 'react';
import { useRecurringPreview } from '@/hooks/useRecurring';
import type { Weekday } from '@/lib/recurringService';

const WEEKDAYS: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function RecurringAvailability() {
  const [repeatDays, setRepeatDays] = useState<Weekday[]>(['monday', 'wednesday']);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const { occurrences } = useRecurringPreview({
    startDate,
    repeatDays,
    repeatPattern: 'weekly',
  });

  return (
    <section className="surface-card p-4 space-y-3">
      <h2 className="text-sm font-black text-bark uppercase tracking-wide">Recurring Availability</h2>
      <label className="form-label">
        Start date
        <input className="form-input mt-1" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {WEEKDAYS.map((day) => {
          const active = repeatDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              className={active ? 'btn-sage !text-xs !py-2' : 'surface-card !text-xs !py-2'}
              onClick={() =>
                setRepeatDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]))
              }
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-bark-light">Generated slots: {occurrences.length}</p>
    </section>
  );
}
