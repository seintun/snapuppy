import { useCallback, useEffect, useState, useRef, useDeferredValue, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { useCreateDog } from '@/hooks/useDogs';
import { useDogBreeds } from '@/hooks/useDogBreeds';
import { DogSchema, type DogFormData } from '@/lib/schemas';
import { updateDog } from './dogService';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];

interface AddDogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingDog?: Dog;
  onSuccess?: () => void;
}

export function AddDogSheet({ isOpen, onClose, editingDog, onSuccess }: AddDogSheetProps) {
  const { addToast } = useToast();
  const { mutateAsync: createDogMutation, isPending: submitting } = useCreateDog();
  
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
      photoUrl: '',
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
    return activeBreedsList.filter((b: string) => b.toLowerCase().includes((deferredBreedWatch || '').toLowerCase()));
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
          photoUrl: editingDog.photo_url ?? '',
        });
      } else {
        reset();
      }
      setShowBreeds(false);
    }
  }, [editingDog, isOpen, reset]);

  const onFormSubmit = useCallback(
    async (data: DogFormData) => {
      try {
        if (editingDog) {
          await updateDog(editingDog.id, {
            name: data.name,
            breed: data.breed || null,
            owner_name: data.ownerName || null,
            owner_phone: data.ownerPhone || null,
            notes: data.notes || null,
            photo_url: data.photoUrl || null,
          });
          addToast(`${data.name} updated successfully! 🐾`, 'success');
        } else {
          await createDogMutation({
            name: data.name,
            breed: data.breed || null,
            owner_name: data.ownerName || null,
            owner_phone: data.ownerPhone || null,
            notes: data.notes || null,
            photo_url: data.photoUrl || null,
          });
          addToast(`${data.name} added successfully! 🐾`, 'success');
        }

        onSuccess?.();
        onClose();
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to save dog', 'error');
      }
    },
    [createDogMutation, addToast, editingDog, onClose, onSuccess],
  );

  return (
    <SlideUpSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingDog ? 'Edit Dog 🐾' : 'Add New Dog 🐾'}
    >
      <form onSubmit={(e) => void handleSubmit(onFormSubmit)(e)} className="flex flex-col gap-3">
        {/* Name & Breed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="form-field">
            <label className="form-label" htmlFor="dog-name">
              Name *
            </label>
            <input
              id="dog-name"
              type="text"
              maxLength={50}
              className={`form-input w-full ${errors.name ? 'border-terracotta' : ''}`}
              placeholder="e.g. Buddy"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-terracotta mt-1">{errors.name.message}</p>}
          </div>
          <div className="form-field relative" ref={breedRef}>
            <label className="form-label" htmlFor="dog-breed">
              Breed
            </label>
            <input
              id="dog-breed"
              type="text"
              maxLength={50}
              autoComplete="off"
              className={`form-input w-full ${errors.breed ? 'border-terracotta' : ''}`}
              placeholder="e.g. Golden Retriever"
              {...register('breed')}
              onFocus={() => setShowBreeds(true)}
            />
            {errors.breed && <p className="text-xs text-terracotta mt-1">{errors.breed.message}</p>}
            {showBreeds && filteredBreeds.length > 0 && (
              <ul className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-sage/20 bg-cream py-1 shadow-lg">
                {filteredBreeds.map((breed: string) => (
                  <li
                    key={breed}
                    className="cursor-pointer px-3 py-2 text-sm text-bark hover:bg-sage/10 transition-colors"
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

        {/* Owner Info side by side to save space */}
        <div className="grid grid-cols-2 gap-3">
          <div className="form-field">
            <label className="form-label" htmlFor="owner-name">
              Owner Name
            </label>
            <input
              id="owner-name"
              type="text"
              maxLength={100}
              className={`form-input w-full ${errors.ownerName ? 'border-terracotta' : ''}`}
              placeholder="e.g. Jane Smith"
              {...register('ownerName')}
            />
            {errors.ownerName && <p className="text-xs text-terracotta mt-1">{errors.ownerName.message}</p>}
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="owner-phone">
              Owner Phone
            </label>
            <input
              id="owner-phone"
              type="tel"
              className={`form-input w-full ${errors.ownerPhone ? 'border-terracotta' : ''}`}
              placeholder="e.g. (555) 012-3456"
              {...register('ownerPhone', {
                onChange: (e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 10) val = val.slice(0, 10);
                  let formatted = val;
                  if (val.length >= 7) {
                    formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                  } else if (val.length >= 4) {
                    formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                  } else if (val.length > 0) {
                    formatted = `(${val}`;
                  }
                  e.target.value = formatted;
                  return e;
                }
              })}
            />
            {errors.ownerPhone && <p className="text-xs text-terracotta mt-1">{errors.ownerPhone.message}</p>}
          </div>
        </div>

        {/* Photo URL */}
        <div className="form-field">
          <label className="form-label" htmlFor="dog-photo">
            Photo URL
          </label>
          <input
            id="dog-photo"
            type="url"
            maxLength={500}
            className={`form-input w-full ${errors.photoUrl ? 'border-terracotta' : ''}`}
            placeholder="https://..."
            {...register('photoUrl')}
          />
          {errors.photoUrl && (
            <p className="text-xs text-terracotta mt-1">{errors.photoUrl.message}</p>
          )}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="dog-notes">
            Special Instructions / Notes
          </label>
          <textarea
            id="dog-notes"
            maxLength={500}
            className={`form-input w-full min-h-[60px] ${errors.notes ? 'border-terracotta' : ''}`}
            placeholder="e.g. Allergic to chicken, loves belly rubs..."
            {...register('notes')}
          />
          {errors.notes && <p className="text-xs text-terracotta mt-1">{errors.notes.message}</p>}
        </div>

        <button type="submit" className="btn-sage mt-1" disabled={submitting}>
          {submitting ? 'Saving…' : editingDog ? 'Save Dog Changes 🐾' : 'Add Dog to Pack 🐾'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
