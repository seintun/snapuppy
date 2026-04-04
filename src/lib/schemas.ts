import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Accepts only https:// or http:// URLs — blocks javascript:/data: exploits */
const safeUrl = z
  .string()
  .url('Must be a valid URL')
  .refine((v) => /^https?:\/\//i.test(v), { message: 'URL must start with https://' });

/** yyyy-MM-dd with a real calendar date in [2020, 2100] */
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (yyyy-mm-dd)')
  .refine((v) => {
    const d = new Date(v + 'T00:00:00');
    return !isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getFullYear() <= 2100;
  }, 'Date out of range');

// ---------------------------------------------------------------------------
// Booking schema
// ---------------------------------------------------------------------------

/**
 * Validates a new booking.
 * Dates must be real calendar dates in [2020-2100] and end >= start.
 */
export const CreateBookingSchema = z
  .object({
    dogId: z.string().min(1, 'Please select a dog'),
    startDate: dateStr,
    endDate: dateStr,
    isHoliday: z.boolean().default(false),
    status: z.enum(['active', 'completed', 'cancelled']).default('active'),
    pickupDateTime: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'Check-out cannot be before check-in',
    path: ['endDate'],
  });

export type CreateBookingFormData = z.input<typeof CreateBookingSchema>;

// ---------------------------------------------------------------------------
// Dog schema
// ---------------------------------------------------------------------------

/**
 * Validates adding / editing a dog profile.
 */
export const DogSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or fewer'),
  breed: z
    .string()
    .trim()
    .max(50, 'Breed must be 50 characters or fewer')
    .optional()
    .or(z.literal('')),
  ownerName: z
    .string()
    .trim()
    .max(100, 'Owner name must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),
  ownerPhone: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Must be (XXX) XXX-XXXX')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),
  photoUrl: safeUrl.optional().or(z.literal('')),
});

export type DogFormData = z.infer<typeof DogSchema>;

// ---------------------------------------------------------------------------
// Profile schema
// ---------------------------------------------------------------------------

/** HH:MM with real hour (0–23) and minute (0–59) */
const cutoffTimeStr = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
  .refine((v) => {
    const [h, m] = v.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }, 'Hour must be 0–23 and minute 0–59');

/** Non-negative monetary rate capped at $9,999.99 */
const rateField = (label: string) =>
  z
    .number()
    .min(0, `${label} must be $0 or more`)
    .max(9999.99, `${label} cannot exceed $9,999.99`);

/**
 * Validates sitter profile settings.
 * businessName is optional to match the nullable DB column.
 */
export const ProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .max(100, 'Business name must be 100 characters or fewer')
    .optional()
    .or(z.literal('')),
  nightlyRate: rateField('Nightly rate'),
  daycareRate: rateField('Daycare rate'),
  holidaySurcharge: rateField('Holiday surcharge'),
  cutoffTime: cutoffTimeStr,
});

export type ProfileFormData = z.infer<typeof ProfileSchema>;

// ---------------------------------------------------------------------------
// Auth schema (client-side email guard before calling Supabase)
// ---------------------------------------------------------------------------

export const EmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .email('Please enter a valid email address'),
});

export type EmailFormData = z.infer<typeof EmailSchema>;
