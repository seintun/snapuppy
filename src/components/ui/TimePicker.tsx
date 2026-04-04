import { useState, useRef, useEffect } from 'react';
import { Clock } from '@phosphor-icons/react';

interface TimePickerProps {
  value: string; // 'HH:MM' in 24h format
  onChange: (value: string) => void;
  error?: boolean;
}

export function TimePicker({ value, onChange, error }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Parse current value
  const [hourStr, minStr] = (value || '11:00').split(':');
  const h = parseInt(hourStr, 10);
  const isPM = h >= 12;
  const displayHour = h % 12 || 12;

  const handleHourSelect = (newHour: number, pm: boolean) => {
    let militaryHour = newHour;
    if (pm && newHour < 12) militaryHour += 12;
    if (!pm && newHour === 12) militaryHour = 0;
    
    onChange(`${militaryHour.toString().padStart(2, '0')}:${minStr}`);
  };

  const handleMinSelect = (newMin: string) => {
    onChange(`${hourStr}:${newMin}`);
  };

  // Generate minutes in 15-min intervals for cleaner UI
  const MINUTES = ['00', '15', '30', '45'];
  const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-sm py-2.5 px-3 bg-white border-1.5 rounded-xl transition-all ${
          isOpen ? 'border-sage shadow-[0_0_0_3px_rgba(143,184,134,0.15)]' : error ? 'border-terracotta' : 'border-pebble hover:border-sage/50'
        }`}
      >
        <span className="font-semibold text-bark">
          {displayHour}:{minStr} {isPM ? 'PM' : 'AM'}
        </span>
        <Clock size={16} weight="bold" className={isOpen ? 'text-sage' : 'text-bark-light'} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div 
          className="absolute right-0 bottom-full mb-2 z-50 w-64 bg-cream border border-pebble rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(74,55,40,0.14)]"
          style={{ animation: 'cal-drop-in 0.18s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          {/* Header config */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-pebble/60 bg-sage-light/30">
            <span className="text-xs font-bold text-bark">Select Time</span>
            <div className="flex bg-white rounded-lg p-0.5 border border-pebble/50">
              <button
                type="button"
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${!isPM ? 'bg-sage text-white' : 'text-bark-light'}`}
                onClick={() => handleHourSelect(displayHour, false)}
              >
                AM
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${isPM ? 'bg-sage text-white' : 'text-bark-light'}`}
                onClick={() => handleHourSelect(displayHour, true)}
              >
                PM
              </button>
            </div>
          </div>

          <div className="flex select-none">
            {/* Hours Grid */}
            <div className="flex-1 p-2 border-r border-pebble/40">
              <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider text-center mb-2">Hour</div>
              <div className="grid grid-cols-3 gap-1">
                {HOURS.map(hr => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => handleHourSelect(hr, isPM)}
                    className={`h-8 text-xs font-semibold rounded-lg transition-colors ${
                      displayHour === hr 
                        ? 'bg-sage text-white' 
                        : 'text-bark hover:bg-sage-light/50'
                    }`}
                  >
                    {hr}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Grid */}
            <div className="w-20 p-2">
              <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider text-center mb-2">Min</div>
              <div className="flex flex-col gap-1">
                {MINUTES.map(min => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => handleMinSelect(min)}
                    className={`h-8 text-xs font-semibold rounded-lg transition-colors ${
                      minStr === min 
                        ? 'bg-sage text-white' 
                        : 'text-bark hover:bg-sage-light/50'
                    }`}
                  >
                    :{min}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Footer actions */}
          <div className="px-3 py-2 border-t border-pebble/60 bg-warm-beige/40 flex justify-end">
             <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-sage bg-sage-light/60 hover:bg-sage-light px-3 py-1.5 rounded-full transition-colors"
              >
                Done
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
