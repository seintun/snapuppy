import { describe, expect, it } from 'vitest';
import { DogSchema } from '@/lib/schemas';

function makeFileList(file: File): FileList {
  return {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
  } as unknown as FileList;
}

describe('DogSchema photo upload', () => {
  it('accepts an image file input', () => {
    const image = new File(['woof'], 'pup.png', { type: 'image/png' });
    const result = DogSchema.safeParse({
      name: 'Buddy',
      breed: '',
      ownerName: '',
      ownerPhone: '',
      notes: '',
      photoFile: makeFileList(image),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { photoFile?: FileList }).photoFile?.item(0)?.name).toBe('pup.png');
    }
  });

  it('rejects non-image files', () => {
    const textFile = new File(['not an image'], 'notes.txt', { type: 'text/plain' });
    const result = DogSchema.safeParse({
      name: 'Buddy',
      breed: '',
      ownerName: '',
      ownerPhone: '',
      notes: '',
      photoFile: makeFileList(textFile),
    });

    expect(result.success).toBe(false);
  });
});
