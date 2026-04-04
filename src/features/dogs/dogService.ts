import { supabase } from '@/lib/supabase';
import { compressImageWithAutoFormat, isValidImageFile, isImageTooLarge } from '@/lib/image-utils';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];
type DogInsert = Database['public']['Tables']['dogs']['Insert'];
type DogUpdate = Database['public']['Tables']['dogs']['Update'];

const DOG_SELECT_WITH_BREED = '*';
const DOG_SELECT_FALLBACK = `
  id,
  name,
  owner_name,
  owner_phone,
  photo_url,
  notes,
  sitter_id,
  created_at,
  updated_at
`;

/**
 * Checks if a Supabase error is specifically about the breed column being missing.
 */
function isMissingBreedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === 'PGRST204' ||
    (typeof maybeError.message === 'string' && maybeError.message.toLowerCase().includes('breed'))
  );
}

export async function getDogs(sitterId: string): Promise<Dog[]> {
  const { data, error } = await supabase
    .from('dogs')
    .select(DOG_SELECT_WITH_BREED)
    .eq('sitter_id', sitterId)
    .order('name');

  if (!error) {
    return data as Dog[];
  }

  // Fallback for missing breed column
  if (isMissingBreedError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('dogs')
      .select(DOG_SELECT_FALLBACK)
      .eq('sitter_id', sitterId)
      .order('name');

    if (fallbackError) throw fallbackError;
    return (fallbackData ?? []).map((dog) => ({ ...dog, breed: null }) as Dog);
  }

  throw error;
}

export async function getDog(id: string, sitterId?: string): Promise<Dog> {
  let query = supabase.from('dogs').select(DOG_SELECT_WITH_BREED).eq('id', id);
  if (sitterId) query = query.eq('sitter_id', sitterId);

  const { data, error } = await query.single();
  if (!error) {
    return data as Dog;
  }

  // Fallback for missing breed column
  if (isMissingBreedError(error)) {
    let fallbackQuery = supabase.from('dogs').select(DOG_SELECT_FALLBACK).eq('id', id);
    if (sitterId) fallbackQuery = fallbackQuery.eq('sitter_id', sitterId);

    const { data: fallbackData, error: fallbackError } = await fallbackQuery.single();
    if (fallbackError) throw fallbackError;
    return { ...fallbackData, breed: null } as Dog;
  }

  throw error;
}

export async function createDog(dog: DogInsert): Promise<Dog> {
  const { data, error } = await supabase
    .from('dogs')
    .insert(dog)
    .select(DOG_SELECT_WITH_BREED)
    .single();

  if (!error) {
    return data as Dog;
  }

  // Fallback for missing breed column
  if (isMissingBreedError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { breed: _breed, ...cleanDog } = dog;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('dogs')
      .insert(cleanDog)
      .select(DOG_SELECT_FALLBACK)
      .single();

    if (fallbackError) throw fallbackError;
    return { ...fallbackData, breed: null } as Dog;
  }

  throw error;
}

export async function updateDog(id: string, updates: DogUpdate): Promise<Dog> {
  const { data, error } = await supabase
    .from('dogs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(DOG_SELECT_WITH_BREED)
    .single();

  if (!error) {
    return data as Dog;
  }

  // Fallback for missing breed column
  if (isMissingBreedError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { breed: _breed, ...cleanUpdates } = updates;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('dogs')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(DOG_SELECT_FALLBACK)
      .single();

    if (fallbackError) throw fallbackError;
    return { ...fallbackData, breed: null } as Dog;
  }

  throw error;
}

export async function deleteDog(id: string, sitterId?: string): Promise<void> {
  let query = supabase.from('dogs').delete().eq('id', id);
  if (sitterId) query = query.eq('sitter_id', sitterId);

  const { error } = await query;
  if (error) throw error;
}

export async function uploadDogPhoto(sitterId: string, dogId: string, file: File): Promise<string> {
  if (!isValidImageFile(file)) {
    throw new Error('Invalid image file. Please upload a JPEG, PNG, or WebP image.');
  }

  if (isImageTooLarge(file, 10)) {
    throw new Error('Image file is too large. Maximum size is 10MB.');
  }

  const { file: compressedFile } = await compressImageWithAutoFormat(file);

  const cleanName = compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const preferredPath = `${sitterId}/${dogId}/${cleanName}`;
  const legacyPath = `${dogId}/${cleanName}`;

  const { error: preferredError } = await supabase.storage
    .from('dog-photos')
    .upload(preferredPath, compressedFile, { upsert: true });

  if (!preferredError) {
    const { data } = supabase.storage.from('dog-photos').getPublicUrl(preferredPath);
    return data.publicUrl;
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

  const { error: legacyError } = await supabase.storage
    .from('dog-photos')
    .upload(legacyPath, compressedFile, { upsert: true });

  if (legacyError) throw legacyError;

  const { data } = supabase.storage.from('dog-photos').getPublicUrl(legacyPath);
  return data.publicUrl;
}
