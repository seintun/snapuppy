import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';

import { updateProfile } from '@/features/profile/profileService';

describe('updateProfile', () => {
  const fromMock = vi.spyOn(supabase, 'from');

  beforeEach(() => {
    fromMock.mockReset();
  });

  it('retries without business_name when schema cache is missing that column', async () => {
    const updated = {
      id: 'user-1',
      email: 'sitter@example.com',
      display_name: null,
      nightly_rate: 55,
      daycare_rate: 30,
      holiday_surcharge: 15,
      cutoff_time: '11:00',
      is_guest: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    };

    const singleMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find the 'business_name' column of 'profiles' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ data: updated, error: null });

    const selectMock = vi.fn(() => ({ single: singleMock }));
    const upsertMock = vi.fn(() => ({ select: selectMock }));

    fromMock.mockReturnValue({ upsert: upsertMock });

    await updateProfile('user-1', {
      business_name: 'Happy Paws',
      nightly_rate: 55,
      daycare_rate: 30,
      holiday_surcharge: 15,
      cutoff_time: '11:00',
    });

    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ business_name: 'Happy Paws' }),
    );

    const secondPayload = (
      upsertMock.mock.calls as unknown as Array<[Record<string, unknown>]>
    )[1][0];
    expect(secondPayload).not.toHaveProperty('business_name');
  });
});
