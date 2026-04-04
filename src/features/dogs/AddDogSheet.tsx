import { useCallback, useEffect, useState, useRef, useDeferredValue, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { useCreateDog, useUpdateDog } from '@/hooks/useDogs';
import { useDogBreeds } from '@/hooks/useDogBreeds';
import { DogSchema, type DogFormData } from '@/lib/schemas';
import { uploadDogPhoto } from './dogService';
import { useAuthContext } from '@/features/auth/useAuthContext';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];

interface AddDogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingDog?: Dog;
  onSuccess?: () => void;
}

export function AddDogSheet({ isOpen, onClose, editingDog, onSuccess }: AddDogSheetProps) {
  const { user } = useAuthContext();
  const { addToast } = useToast();
  const { mutateAsync: createDogMutation, isPending: creating } = useCreateDog();
  const { mutateAsync: updateDogMutation, isPending: updating } = useUpdateDog();
  const submitting = creating || updating;
  const [isSaving, setIsSaving] = useState(false);

  const { data: fetchableBreeds } = useDogBreeds();
  const activeBreedsList = fetchableBreeds || [];

  const [showBreeds, setShowBreeds] = useState(false);
  const breedRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DogFormData>({
    resolver: zodResolver(DogSchema),
    defaultValues: {
      name: '',
      breed: '',
      ownerName: '',
      ownerPhone: '',
      notes: '',
      photoFile: undefined,
    },
  });

  // Setup click outside for breed dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (breedRef.current && !breedRef.current.contains(event.target as Node)) {
        setShowBreeds(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const breedWatch = watch('breed');
  const deferredBreedWatch = useDeferredValue(breedWatch);
  const filteredBreeds = useMemo(() => {
    return activeBreedsList.filter((b: string) =>
      b.toLowerCase().includes((deferredBreedWatch || '').toLowerCase()),
    );
  }, [activeBreedsList, deferredBreedWatch]);

  // Reset form when opening/closing
  useEffect(() => {
    if (isOpen) {
      if (editingDog) {
        reset({
          name: editingDog.name,
          breed: editingDog.breed ?? '',
          ownerName: editingDog.owner_name ?? '',
          ownerPhone: editingDog.owner_phone ?? '',
          notes: editingDog.notes ?? '',
          photoFile: undefined,
        });
      } else {
        reset();
      }
      setShowBreeds(false);
    }
  }, [editingDog, isOpen, reset]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Update preview when file changes or editingDog changes
  const photoFile = watch('photoFile');
  useEffect(() => {
    if (photoFile && photoFile.length > 0) {
      const file = photoFile[0];
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (editingDog?.photo_url) {
      setPhotoPreview(editingDog.photo_url);
    } else {
      setPhotoPreview(null);
    }
  }, [photoFile, editingDog]);

  const onFormSubmit = useCallback(
    async (data: DogFormData) => {
      setIsSaving(true);
      try {
        const selectedPhoto = data.photoFile?.item(0) ?? null;

        if (editingDog) {
          let photoUrl = editingDog.photo_url ?? null;
          if (selectedPhoto && user?.id) {
            photoUrl = await uploadDogPhoto(user.id, editingDog.id, selectedPhoto);
          }

          await updateDogMutation({
            id: editingDog.id,
            updates: {
              name: data.name,
              breed: data.breed || null,
              owner_name: data.ownerName || null,
              owner_phone: data.ownerPhone || null,
              notes: data.notes || null,
              photo_url: photoUrl,
            },
          });
          addToast(`${data.name} updated successfully! 🐾`, 'success');
        } else {
          const createdDog = await createDogMutation({
            name: data.name,
            breed: data.breed || null,
            owner_name: data.ownerName || null,
            owner_phone: data.ownerPhone || null,
            notes: data.notes || null,
            photo_url: null,
          });

          if (selectedPhoto && user?.id) {
            const photoUrl = await uploadDogPhoto(user.id, createdDog.id, selectedPhoto);
            await updateDogMutation({
              id: createdDog.id,
              updates: { photo_url: photoUrl },
            });
          }

          addToast(`${data.name} added successfully! 🐾`, 'success');
        }

        onSuccess?.();
        onClose();
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to save dog', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [createDogMutation, updateDogMutation, addToast, editingDog, onClose, onSuccess, user?.id],
  );

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title={editingDog ? 'Edit Dog' : 'Add New Dog'}>
      <form
        onSubmit={(e) => void handleSubmit(onFormSubmit)(e)}
        className="flex flex-col gap-5 pt-2"
      >
        {/* Profile Photo Upload Zone */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <label className="relative group cursor-pointer">
            <div
              className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${photoPreview ? 'border-sage/40' : 'border-pebble/30 bg-pebble/5 hover:bg-pebble/10'}`}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-bark-light/40 group-hover:text-sage/60 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-pebble/10 flex items-center justify-center mb-1 group-hover:bg-sage/10">
                    <span className="text-xl">📸</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest">Add Photo</span>
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              {...register('photoFile')}
            />

            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center border-2 border-cream shadow-md scale-95 group-hover:scale-110 transition-transform">
              <span className="text-xs font-bold">{photoPreview ? '✎' : '+'}</span>
            </div>
          </label>
        </div>

        {/* Name & Breed */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <label
              className="text-[10px] font-black text-bark/40 uppercase tracking-[0.1em] mb-1.5 block"
              htmlFor="dog-name"
            >
              Name *
            </label>
            <input
              id="dog-name"
              type="text"
              maxLength={50}
              className={`form-input w-full ${errors.name ? 'border-terracotta' : ''}`}
              placeholder="Pup's name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-[9px] font-bold text-terracotta mt-1 leading-none">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="form-field relative" ref={breedRef}>
            <label
              className="text-[10px] font-black text-bark/40 uppercase tracking-[0.1em] mb-1.5 block"
              htmlFor="dog-breed"
            >
              Breed
            </label>
            <input
              id="dog-breed"
              type="text"
              maxLength={50}
              autoComplete="off"
              className={`form-input w-full ${errors.breed ? 'border-terracotta' : ''}`}
              placeholder="e.g. Frenchie"
              {...register('breed')}
              onFocus={() => setShowBreeds(true)}
            />
            {errors.breed && (
              <p className="text-[9px] font-bold text-terracotta mt-1 leading-none">
                {errors.breed.message}
              </p>
            )}
            {showBreeds && filteredBreeds.length > 0 && (
              <ul className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-pebble/10 bg-cream py-1 shadow-lg backdrop-blur-sm bg-cream/95">
                {filteredBreeds.map((breed: string) => (
                  <li
                    key={breed}
                    className="cursor-pointer px-3 py-2 text-xs font-black text-bark hover:bg-sage/10 transition-colors uppercase tracking-tight"
                    onClick={() => {
                      setValue('breed', breed);
                      setShowBreeds(false);
                    }}
                  >
                    {breed}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Owner Info side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <label
              className="text-[10px] font-black text-bark/40 uppercase tracking-[0.1em] mb-1.5 block"
              htmlFor="owner-name"
            >
              Owner Name
            </label>
            <input
              id="owner-name"
              type="text"
              maxLength={100}
              className={`form-input w-full ${errors.ownerName ? 'border-terracotta' : ''}`}
              placeholder="Human's name"
              {...register('ownerName')}
            />
            {errors.ownerName && (
              <p className="text-[9px] font-bold text-terracotta mt-1 leading-none">
                {errors.ownerName.message}
              </p>
            )}
          </div>
          <div className="form-field">
            <label
              className="text-[10px] font-black text-bark/40 uppercase tracking-[0.1em] mb-1.5 block"
              htmlFor="owner-phone"
            >
              Owner Phone
            </label>
            <input
              id="owner-phone"
              type="tel"
              className={`form-input w-full ${errors.ownerPhone ? 'border-terracotta' : ''}`}
              placeholder="Mobile number"
              {...register('ownerPhone', {
                onChange: (e) => {
                  const input = e.target as HTMLInputElement;
                  let val = input.value.replace(/\D/g, '');
                  if (val.length > 10) val = val.slice(0, 10);

                  let formatted = '';
                  if (val.length > 0) {
                    if (val.length <= 3) {
                      formatted = `(${val}`;
                    } else if (val.length <= 6) {
                      formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                    } else {
                      formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                    }
                  }

                  input.value = formatted;
                },
              })}
            />
            {errors.ownerPhone && (
              <p className="text-[9px] font-bold text-terracotta mt-1 leading-none">
                {errors.ownerPhone.message}
              </p>
            )}
          </div>
        </div>

        <div className="form-field">
          <label
            className="text-[10px] font-black text-bark/40 uppercase tracking-[0.1em] mb-1.5 block"
            htmlFor="dog-notes"
          >
            Special Instructions / Notes
          </label>
          <textarea
            id="dog-notes"
            maxLength={500}
            className={`form-input w-full min-h-[70px] !rounded-2xl ${errors.notes ? 'border-terracotta' : ''}`}
            placeholder="Any allergies, quirks, or routine treats we should know about?"
            {...register('notes')}
          />
          {errors.notes && (
            <p className="text-[10px] font-bold text-terracotta mt-1 leading-none">
              {errors.notes.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-sage w-full py-3.5 mt-2 shadow-lg active:shadow-sm transition-all"
          disabled={submitting || isSaving}
        >
          {submitting || isSaving
            ? 'Saving…'
            : editingDog
              ? 'Save Dog Changes 🐾'
              : 'Add Dog to Pack 🐾'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
