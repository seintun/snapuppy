import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';

import { getProfile, updateProfile } from '@/features/profile/profileService';

describe('updateProfile', () => {
  const fromMock = vi.spyOn(supabase, 'from');

  beforeEach(() => {
    fromMock.mockReset();
  });

  it('never writes business_name even when provided in updates', async () => {
    const updated = {
      id: 'user-1',
      email: 'sitter@example.com',
      display_name: null,
      nightly_rate: 55,
      daycare_rate: 30,
      holiday_boarding_rate: 70,
      holiday_daycare_rate: 45,
      cutoff_time: '11:00',
      is_guest: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    };

    const singleMock = vi.fn().mockResolvedValueOnce({ data: updated, error: null });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const upsertMock = vi.fn(() => ({ select: selectMock }));

    fromMock.mockReturnValue({ upsert: upsertMock });

    await updateProfile('user-1', {
      business_name: 'Happy Paws',
      nightly_rate: 55,
      daycare_rate: 30,
      holiday_boarding_rate: 70,
      holiday_daycare_rate: 45,
      cutoff_time: '11:00',
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const payload = (upsertMock.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0];
    expect(payload).not.toHaveProperty('business_name');
  });
});

describe('getProfile', () => {
  const fromMock = vi.spyOn(supabase, 'from');

  beforeEach(() => {
    fromMock.mockReset();
  });

  it('falls back to legacy holiday_surcharge columns when holiday rate columns are missing', async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST204',
          message:
            "Could not find the 'holiday_boarding_rate' column of 'profiles' in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'user-1',
          email: 'sitter@example.com',
          display_name: null,
          business_name: null,
          business_logo_url: null,
          payment_instructions: null,
          nightly_rate: 60,
          daycare_rate: 30,
          holiday_surcharge: 15,
          cutoff_time: '11:00',
          is_guest: false,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      });

    const selectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: maybeSingleMock,
      })),
    }));

    fromMock.mockReturnValue({ select: selectMock });

    const result = await getProfile('user-1');

    expect(result?.holiday_boarding_rate).toBe(75);
    expect(result?.holiday_daycare_rate).toBe(45);
  });
});
