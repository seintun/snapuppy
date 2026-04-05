import { useMemo } from 'react';
import {
  generateRecurringOccurrences,
  type GenerateRecurringOccurrencesInput,
} from '@/lib/recurringService';

export function useRecurringPreview(input: GenerateRecurringOccurrencesInput | null) {
  const occurrences = useMemo(() => {
    if (!input) return [];
    return generateRecurringOccurrences(input);
  }, [input]);

  return { occurrences };
}
