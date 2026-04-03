import { z } from 'zod';

/**
 * Zod schema for validating a new booking.
 * Enforces strict date formats and ensures the stay is at least one day.
 */
export const CreateBookingSchema = z
  .object({
    dogId: z.string().min(1, 'Please select a dog'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    isHoliday: z.boolean().default(false),
    status: z.enum(['active', 'completed', 'cancelled']).default('active'),
    pickupDateTime: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'Check-out date cannot be before check-in date',
    path: ['endDate'],
  });

export type CreateBookingFormData = z.input<typeof CreateBookingSchema>;

/**
 * Zod schema for updating a dog profile.
 */
export const DogSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  breed: z.string().optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

export type DogFormData = z.infer<typeof DogSchema>;

/**
 * Zod schema for sitter profile settings.
 */
export const ProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  nightlyRate: z.number().min(0, 'Rate must be positive'),
  daycareRate: z.number().min(0, 'Rate must be positive'),
  holidaySurcharge: z.number().min(0, 'Surcharge must be positive'),
  cutoffTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
});

export type ProfileFormData = z.infer<typeof ProfileSchema>;
