import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/useToast';
import { AddDogSheet } from './AddDogSheet';
import { cancelDogBookings, deleteDog, getDog } from './dogService';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];

export function DogDetailScreen() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(Boolean(dogId));
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!dogId) {
      return;
    }

    getDog(dogId)
      .then((result) => {
        setDog(result);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load dog');
      })
      .finally(() => setLoading(false));
  }, [dogId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!dog) return;
    setIsDeleting(true);
    try {
      await cancelDogBookings(dog.id);
      await deleteDog(dog.id);
      addToast(`${dog.name} removed`, 'success');
      navigate('/dogs');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove dog', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [dog, addToast, navigate]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <AppLoadingAnimation size="sm" label="Loading dog profile..." />
      </div>
    );
  }

  if (!dogId) {
    return (
      <>
        <p className="text-terracotta">Dog ID is missing</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/dogs')}>
          Back to Dogs
        </button>
      </>
    );
  }

  if (error || !dog) {
    return (
      <>
        <p className="text-terracotta">{error ?? 'Dog not found'}</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/dogs')}>
          Back to Dogs
        </button>
      </>
    );
  }

  const isArchived = !!dog.archived_at;

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => navigate('/dogs')}>
        ← Back
      </button>

      {isArchived && (
        <div className="my-3 rounded-xl bg-pebble/10 border border-pebble/20 px-4 py-3 flex items-center gap-2.5">
          <span className="text-base">🗂️</span>
          <div>
            <p className="text-xs font-black text-bark uppercase tracking-wider leading-none mb-0.5">
              Archived
            </p>
            <p className="text-[11px] text-bark-light leading-tight">
              This dog has been removed from your roster. Their booking history is preserved.
            </p>
          </div>
        </div>
      )}

      <div className="text-center my-4 mb-5">
        <div className="inline-flex mb-3">
          <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
        </div>
        <h1 className="m-0 text-2xl font-extrabold">{dog.name}</h1>
        <p className="m-0 mt-1 text-bark-light">{dog.owner_name ?? 'Owner unknown'}</p>
      </div>

      <div className="mb-3">
        <Card className="p-4">
          <p className="profile-section-title !mt-0">Contact</p>
          <p className="m-0 text-bark font-medium">{dog.owner_phone ?? 'No phone number'}</p>
        </Card>
      </div>

      <div className="mb-3">
        <Card className="p-4">
          <p className="profile-section-title !mt-0">Notes</p>
          <p className="m-0 whitespace-pre-wrap text-bark">{dog.notes ?? 'No notes yet.'}</p>
        </Card>
      </div>

      {!isArchived && (
        <div className="flex gap-2.5">
          <button type="button" className="btn-sage flex-1" onClick={() => setIsEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </button>
        </div>
      )}

      <AddDogSheet
        isOpen={isEditing}
        editingDog={dog}
        onClose={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          void getDog(dog.id).then(setDog);
        }}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Remove Dog"
        message={`Remove ${dog.name} from your roster? Upcoming, active, and awaiting bookings will be cancelled. Paid stays and earnings history are preserved.`}
        confirmLabel="Remove"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
