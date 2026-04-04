import { logger } from './logger';

export interface CompressionOptions {
  maxDimension: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxDimension: 1024,
  quality: 0.85,
  format: 'webp',
};

function getMimeType(format: CompressionOptions['format']): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
  }
}

function getFileExtension(format: CompressionOptions['format']): string {
  switch (format) {
    case 'webp':
      return '.webp';
    case 'jpeg':
      return '.jpg';
    case 'png':
      return '.png';
  }
}

export function calculateScaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width === 1);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRiQAAABXAAAAJQAAAC8A8gA';
  });
}

export async function compressImage(
  file: File,
  options: Partial<CompressionOptions> = {},
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const opts: CompressionOptions = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
  const originalSize = file.size;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = calculateScaledDimensions(
      bitmap.width,
      bitmap.height,
      opts.maxDimension,
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const mimeType = getMimeType(opts.format);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to compress image'))),
        mimeType,
        opts.quality,
      );
    });

    const compressedSize = blob.size;
    const extension = getFileExtension(opts.format);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const compressedFileName = `${baseName}-compressed${extension}`;

    const compressedFile = new File([blob], compressedFileName, {
      type: mimeType,
    });

    logger.debug('Image compressed', {
      originalSize,
      compressedSize,
      reduction: `${Math.round((1 - compressedSize / originalSize) * 100)}%`,
      dimensions: `${width}x${height}`,
      format: opts.format,
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
    };
  } catch (error) {
    logger.error('Image compression failed, using original', error);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
    };
  }
}

export async function compressImageWithAutoFormat(
  file: File,
  options: Partial<Omit<CompressionOptions, 'format'>> = {},
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  format: CompressionOptions['format'];
}> {
  const format = (await supportsWebP()) ? 'webp' : 'jpeg';
  const result = await compressImage(file, { ...options, format });
  return { ...result, format };
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
}

export function isImageTooLarge(file: File, maxSizeMB: number = 10): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}
