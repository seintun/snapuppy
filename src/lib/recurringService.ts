import { addDays, addMonths, endOfMonth, format, isAfter, parseISO } from 'date-fns';

export type RecurringPattern = 'weekly' | 'biweekly' | 'monthly';
export type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

const WEEKDAY_TO_INDEX: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export interface GenerateRecurringOccurrencesInput {
  startDate: string;
  endDate?: string;
  repeatDays: Weekday[];
  repeatPattern: RecurringPattern;
  horizonMonths?: number;
}

export interface RecurringOccurrence {
  date: string;
}

function getStepDays(pattern: RecurringPattern): number {
  if (pattern === 'biweekly') return 14;
  if (pattern === 'monthly') return 28;
  return 7;
}

export function generateRecurringOccurrences(
  input: GenerateRecurringOccurrencesInput,
): RecurringOccurrence[] {
  const start = parseISO(input.startDate);
  const horizon = Math.max(1, input.horizonMonths ?? 3);
  const maxByHorizon = endOfMonth(addMonths(start, horizon - 1));
  const maxByEndDate = input.endDate ? parseISO(input.endDate) : null;
  const max = maxByEndDate && isAfter(maxByHorizon, maxByEndDate) ? maxByEndDate : maxByHorizon;

  const daySet = new Set(input.repeatDays.map((day) => WEEKDAY_TO_INDEX[day]));
  if (daySet.size === 0) return [];

  const step = getStepDays(input.repeatPattern);
  const occurrences: RecurringOccurrence[] = [];

  let cursor = start;
  while (!isAfter(cursor, max)) {
    if (daySet.has(cursor.getDay())) {
      occurrences.push({ date: format(cursor, 'yyyy-MM-dd') });
    }
    cursor = addDays(cursor, 1);
  }

  if (input.repeatPattern === 'weekly') {
    return occurrences;
  }

  const anchored: RecurringOccurrence[] = [];
  let anchor = start;
  while (!isAfter(anchor, max)) {
    const weekStart = format(anchor, 'yyyy-MM-dd');
    const weekEnd = format(addDays(anchor, 6), 'yyyy-MM-dd');
    const inWindow = occurrences.filter((item) => item.date >= weekStart && item.date <= weekEnd);
    anchored.push(...inWindow);
    anchor = addDays(anchor, step);
  }

  return anchored;
}
