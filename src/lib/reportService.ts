import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import { logger } from './logger';
import { DatabaseError } from './errors';

type DailyReport = Tables<'daily_reports'>;
type DailyReportInsert = TablesInsert<'daily_reports'>;
type DailyReportUpdate = TablesUpdate<'daily_reports'>;

export interface CreateReportInput {
  bookingId: string;
  date: string;
  notes?: string;
  pottyStatus?: string;
  mealsGiven?: string[];
  behavior?: string;
  medicationsGiven?: string;
  photos?: string[];
}

export interface UpdateReportInput {
  notes?: string;
  pottyStatus?: string;
  mealsGiven?: string[];
  behavior?: string;
  medicationsGiven?: string;
  photos?: string[];
}

interface DateValidationParams {
  date: string;
  bookingStartDate: string;
  bookingEndDate: string;
}

function validateDateWithinBooking({
  date,
  bookingStartDate,
  bookingEndDate,
}: DateValidationParams): void {
  if (date < bookingStartDate || date > bookingEndDate) {
    throw new Error(
      `Date ${date} is outside booking range ${bookingStartDate} - ${bookingEndDate}`,
    );
  }
}

export async function getReportsByBooking(bookingId: string): Promise<DailyReport[]> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('booking_id', bookingId)
    .order('date', { ascending: true });

  if (error) {
    logger.error('Failed to fetch reports by booking', { bookingId, error });
    throw new DatabaseError('Failed to fetch reports', error);
  }

  return data as DailyReport[];
}

export async function getReportById(id: string): Promise<DailyReport | null> {
  const { data, error } = await supabase.from('daily_reports').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('Failed to fetch report by id', { id, error });
    throw new DatabaseError('Failed to fetch report', error);
  }

  return data as DailyReport;
}

export async function createReport(input: CreateReportInput): Promise<DailyReport> {
  const { bookingId, date, notes, pottyStatus, mealsGiven, behavior, medicationsGiven, photos } =
    input;

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('start_date, end_date')
    .eq('id', bookingId)
    .single();

  if (bookingError) {
    logger.error('Failed to fetch booking for date validation', { bookingId, error: bookingError });
    throw new DatabaseError('Booking not found', bookingError);
  }

  validateDateWithinBooking({
    date,
    bookingStartDate: booking.start_date,
    bookingEndDate: booking.end_date,
  });

  const reportData: DailyReportInsert = {
    booking_id: bookingId,
    date,
    notes: notes ?? null,
    potty_status: pottyStatus ?? null,
    meals_given: mealsGiven ?? null,
    behavior: behavior ?? null,
    medications_given: medicationsGiven ?? null,
    photos: photos ?? null,
  };

  const { data, error } = await supabase.from('daily_reports').insert(reportData).select().single();

  if (error) {
    logger.error('Failed to create report', { bookingId, date, error });
    throw new DatabaseError('Failed to create report', error);
  }

  logger.info('Report created successfully', { reportId: data.id, bookingId, date });
  return data as DailyReport;
}

export async function updateReport(id: string, input: UpdateReportInput): Promise<DailyReport> {
  const { notes, pottyStatus, mealsGiven, behavior, medicationsGiven, photos } = input;

  const updateData: DailyReportUpdate = {
    ...(notes !== undefined && { notes }),
    ...(pottyStatus !== undefined && { potty_status: pottyStatus }),
    ...(mealsGiven !== undefined && { meals_given: mealsGiven }),
    ...(behavior !== undefined && { behavior }),
    ...(medicationsGiven !== undefined && { medications_given: medicationsGiven }),
    ...(photos !== undefined && { photos }),
  };

  const { data, error } = await supabase
    .from('daily_reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update report', { id, error });
    throw new DatabaseError('Failed to update report', error);
  }

  logger.info('Report updated successfully', { reportId: id });
  return data as DailyReport;
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('daily_reports').delete().eq('id', id);

  if (error) {
    logger.error('Failed to delete report', { id, error });
    throw new DatabaseError('Failed to delete report', error);
  }

  logger.info('Report deleted successfully', { reportId: id });
}

export async function uploadReportPhoto(
  bookingId: string,
  date: string,
  file: File,
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const dateStr = date.replace(/-/g, '');
  const filePath = `reports/${bookingId}/${dateStr}/${fileName}`;

  const { error } = await supabase.storage.from('dog-photos').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    logger.error('Failed to upload report photo', { bookingId, date, error });
    throw new DatabaseError('Failed to upload photo', error);
  }

  const { data: urlData } = supabase.storage.from('dog-photos').getPublicUrl(filePath);

  logger.info('Report photo uploaded successfully', { path: filePath });
  return urlData.publicUrl;
}
