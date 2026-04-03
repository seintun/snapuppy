import { useEffect, useRef, useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { uploadDogPhoto } from './dogService';
import { useDogs } from './useDogs';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];

interface AddDogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDog?: Dog;
}

interface FormState {
  name: string;
  owner_name: string;
  owner_phone: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  owner_name: '',
  owner_phone: '',
  notes: '',
};

export function AddDogSheet({ isOpen, onClose, onSuccess, editingDog }: AddDogSheetProps) {
  const { user } = useAuthContext();
  const { createDog, updateDog } = useDogs();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingDog) {
        setForm({
          name: editingDog.name,
          owner_name: editingDog.owner_name ?? '',
          owner_phone: editingDog.owner_phone ?? '',
          notes: editingDog.notes ?? '',
        });
        setPhotoPreview(editingDog.photo_url ?? null);
      } else {
        setForm(EMPTY_FORM);
        setPhotoPreview(null);
      }
      setPhotoFile(null);
    }
  }, [isOpen, editingDog]);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast('Dog name is required', 'error');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      let photoUrl: string | null = editingDog?.photo_url ?? null;

      if (editingDog) {
        const updated = await updateDog(editingDog.id, {
          name: form.name.trim(),
          owner_name: form.owner_name.trim() || null,
          owner_phone: form.owner_phone.trim() || null,
          notes: form.notes.trim() || null,
        });

        if (photoFile) {
          photoUrl = await uploadDogPhoto(updated.id, photoFile);
          await updateDog(updated.id, { photo_url: photoUrl });
        }

        addToast('Dog updated! 🐾', 'success');
      } else {
        const created = await createDog({
          sitter_id: user.id,
          name: form.name.trim(),
          owner_name: form.owner_name.trim() || null,
          owner_phone: form.owner_phone.trim() || null,
          notes: form.notes.trim() || null,
        });

        if (photoFile) {
          photoUrl = await uploadDogPhoto(created.id, photoFile);
          await updateDog(created.id, { photo_url: photoUrl });
        }

        addToast('Woof! Dog added! 🐾', 'success');
      }

      onSuccess();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const title = editingDog ? 'Edit Dog' : 'Add Dog';

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-field">
          <label className="form-label" htmlFor="dog-name">Name *</label>
          <input
            id="dog-name"
            className="form-input"
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Buddy"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="dog-owner">Owner name</label>
          <input
            id="dog-owner"
            className="form-input"
            type="text"
            value={form.owner_name}
            onChange={(e) => handleChange('owner_name', e.target.value)}
            placeholder="Jane Smith"
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="dog-phone">Owner phone</label>
          <input
            id="dog-phone"
            className="form-input"
            type="tel"
            value={form.owner_phone}
            onChange={(e) => handleChange('owner_phone', e.target.value)}
            placeholder="+1 555 000 0000"
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="dog-notes">Notes</label>
          <textarea
            id="dog-notes"
            className="form-input"
            rows={3}
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Feeding, meds, vet info, behavior notes..."
          />
        </div>

        <div className="form-field">
          <label className="form-label">Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              minHeight: 44,
              border: '1.5px dashed var(--pebble)',
              borderRadius: 8,
              background: 'var(--cream)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--bark-light)',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: 40, height: 40, borderRadius: 999, objectFit: 'cover' }}
              />
            ) : null}
            {photoPreview ? 'Change photo' : 'Upload photo'}
          </button>
        </div>

        <button type="submit" className="btn-sage" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? 'Saving...' : editingDog ? 'Save changes' : 'Add dog'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
