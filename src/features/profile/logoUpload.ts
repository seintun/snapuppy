import { supabase } from '@/lib/supabase';
import { compressImageWithAutoFormat, isValidImageFile, isImageTooLarge } from '@/lib/image-utils';

const BUCKET = 'business-logos';

export async function uploadBusinessLogo(sitterId: string, file: File): Promise<string> {
  if (!isValidImageFile(file)) {
    throw new Error('Invalid image file. Please upload a JPEG, PNG, or WebP image.');
  }
  if (isImageTooLarge(file, 10)) {
    throw new Error('Image file is too large. Maximum size is 10MB.');
  }

  const { file: compressed } = await compressImageWithAutoFormat(file, { maxDimension: 512 });
  const ext = compressed.name.split('.').pop() ?? 'webp';
  const path = `${sitterId}/logo.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
