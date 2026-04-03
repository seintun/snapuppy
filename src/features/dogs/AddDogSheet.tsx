import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { useCreateDog } from '@/hooks/useDogs';
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

  const {
    register,
    handleSubmit,
    reset,
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
      <form onSubmit={(e) => void handleSubmit(onFormSubmit)(e)} className="flex flex-col gap-4">
        {/* Name & Breed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="form-field">
            <label className="form-label" htmlFor="dog-name">
              Name *
            </label>
            <input
              id="dog-name"
              type="text"
              className={`form-input w-full ${errors.name ? 'border-terracotta' : ''}`}
              placeholder="e.g. Buddy"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-terracotta mt-1">{errors.name.message}</p>}
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="dog-breed">
              Breed
            </label>
            <input
              id="dog-breed"
              type="text"
              className="form-input w-full"
              placeholder="e.g. Golden Retriever"
              {...register('breed')}
            />
          </div>
        </div>

        {/* Owner Info */}
        <div className="grid grid-cols-1 gap-4">
          <div className="form-field">
            <label className="form-label" htmlFor="owner-name">
              Owner Name
            </label>
            <input
              id="owner-name"
              type="text"
              className="form-input w-full"
              placeholder="e.g. Jane Smith"
              {...register('ownerName')}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="owner-phone">
              Owner Phone
            </label>
            <input
              id="owner-phone"
              type="tel"
              className="form-input w-full"
              placeholder="e.g. 555-0123"
              {...register('ownerPhone')}
            />
          </div>
        </div>

        {/* Photo & Notes */}
        <div className="form-field">
          <label className="form-label" htmlFor="dog-photo">
            Photo URL
          </label>
          <input
            id="dog-photo"
            type="url"
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
            className="form-input w-full min-h-[80px]"
            placeholder="e.g. Allergic to chicken, loves belly rubs..."
            {...register('notes')}
          />
        </div>

        <button type="submit" className="btn-sage mt-2" disabled={submitting}>
          {submitting ? 'Saving…' : editingDog ? 'Save Dog Changes 🐾' : 'Add Dog to Pack 🐾'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
