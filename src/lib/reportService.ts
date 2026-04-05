import { compressImageWithAutoFormat, isImageTooLarge, isValidImageFile } from '@/lib/image-utils';
import { DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

export type PottyStatus = 'good' | 'accident' | 'none_out';
export type DailyReportRow = Tables<'daily_reports'>;

export interface SaveDailyReportInput {
  id?: string;
  bookingId: string;
  date: string;
  notes?: string | null;
  pottyStatus?: PottyStatus | null;
  mealsGiven?: string[] | null;
  behavior?: string | null;
  medicationsGiven?: string | null;
  existingPhotos?: string[] | null;
  newPhotos?: File[];
  sitterId?: string;
}

export function normalizeMeals(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeMeals(input: string[] | null | undefined): string {
  return (input ?? []).join(', ');
}

export function buildReportPhotoPath(
  sitterId: string,
  bookingId: string,
  reportDate: string,
  fileName: string,
) {
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${sitterId}/reports/${bookingId}/${reportDate}/${cleanName}`;
}

export async function getBookingReports(bookingId: string): Promise<DailyReportRow[]> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('booking_id', bookingId)
    .order('date', { ascending: false });

  if (error) {
    logger.error('Failed to fetch booking reports', error, { bookingId });
    throw new DatabaseError('Failed to load daily reports', { bookingId }, error);
  }

  return data ?? [];
}

export async function saveDailyReport(input: SaveDailyReportInput): Promise<DailyReportRow> {
  const uploadedPhotos =
    input.sitterId && input.newPhotos?.length
      ? await uploadReportPhotos(input.sitterId, input.bookingId, input.date, input.newPhotos)
      : [];

  const photoUrls = [...(input.existingPhotos ?? []), ...uploadedPhotos];

  const sharedPayload = {
    booking_id: input.bookingId,
    date: input.date,
    notes: input.notes?.trim() || null,
    potty_status: input.pottyStatus ?? null,
    meals_given: input.mealsGiven?.length ? input.mealsGiven : null,
    behavior: input.behavior?.trim() || null,
    medications_given: input.medicationsGiven?.trim() || null,
    photos: photoUrls.length ? photoUrls : null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const updatePayload: TablesUpdate<'daily_reports'> = sharedPayload;
    const { data, error } = await supabase
      .from('daily_reports')
      .update(updatePayload)
      .eq('id', input.id)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to update daily report', error, { reportId: input.id });
      throw new DatabaseError('Failed to update report', { reportId: input.id }, error);
    }

    return data;
  }

  const insertPayload: TablesInsert<'daily_reports'> = sharedPayload;
  const { data, error } = await supabase
    .from('daily_reports')
    .upsert(insertPayload, { onConflict: 'booking_id,date' })
    .select('*')
    .single();

  if (error) {
    logger.error('Failed to save daily report', error, { bookingId: input.bookingId, date: input.date });
    throw new DatabaseError('Failed to save report', { bookingId: input.bookingId, date: input.date }, error);
  }

  return data;
}

export async function deleteDailyReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('daily_reports').delete().eq('id', reportId);

  if (error) {
    logger.error('Failed to delete daily report', error, { reportId });
    throw new DatabaseError('Failed to delete report', { reportId }, error);
  }
}

export async function uploadReportPhotos(
  sitterId: string,
  bookingId: string,
  reportDate: string,
  files: File[],
): Promise<string[]> {
  const results: string[] = [];

  for (const file of files) {
    if (!isValidImageFile(file)) {
      throw new Error('Invalid image file. Please upload a JPEG, PNG, WebP, or GIF image.');
    }

    if (isImageTooLarge(file, 10)) {
      throw new Error('Image file is too large. Maximum size is 10MB.');
    }

    const { file: compressedFile } = await compressImageWithAutoFormat(file);
    const preferredPath = buildReportPhotoPath(sitterId, bookingId, reportDate, compressedFile.name);
    const fallbackPath = `${bookingId}/reports/${reportDate}/${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: preferredError } = await supabase.storage
      .from('dog-photos')
      .upload(preferredPath, compressedFile, { upsert: true });

    if (!preferredError) {
      const { data } = supabase.storage.from('dog-photos').getPublicUrl(preferredPath);
      results.push(data.publicUrl);
      continue;
    }

    const isRlsError =
      (typeof preferredError === 'object' &&
        preferredError !== null &&
        'statusCode' in preferredError &&
        String((preferredError as { statusCode?: string }).statusCode) === '403') ||
      (typeof preferredError.message === 'string' &&
        preferredError.message.toLowerCase().includes('row-level security'));

    if (!isRlsError) {
      throw preferredError;
    }

    const { error: fallbackError } = await supabase.storage
      .from('dog-photos')
      .upload(fallbackPath, compressedFile, { upsert: true });

    if (fallbackError) {
      throw fallbackError;
    }

    const { data } = supabase.storage.from('dog-photos').getPublicUrl(fallbackPath);
    results.push(data.publicUrl);
  }

  return results;
}
