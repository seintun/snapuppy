import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { useToast } from '@/components/ui/useToast';
import { AddDogSheet } from './AddDogSheet';
import { deleteDog, getDog } from './dogService';
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

  async function handleDelete() {
    if (!dog) return;
    if (!confirm(`Delete ${dog.name}? This cannot be undone.`)) return;

    try {
      await deleteDog(dog.id);
      addToast(`${dog.name} deleted`, 'success');
      navigate('/dogs');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete dog', 'error');
    }
  }

  if (loading) {
    return <p className="text-bark-light">Loading dog profile...</p>;
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

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => navigate('/dogs')}>
        ← Back
      </button>

      <div className="text-center my-4 mb-5">
        <div className="inline-flex mb-3">
          <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
        </div>
        <h1 className="m-0 text-2xl font-extrabold">{dog.name}</h1>
        <p className="m-0 mt-1 text-bark-light">
          {dog.owner_name ?? 'Owner unknown'}
        </p>
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

      <div className="flex gap-2.5">
        <button type="button" className="btn-sage flex-1" onClick={() => setIsEditing(true)}>
          Edit
        </button>
        <button type="button" className="btn-danger flex-1" onClick={() => void handleDelete()}>
          Delete
        </button>
      </div>

      <AddDogSheet
        isOpen={isEditing}
        editingDog={dog}
        onClose={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          void getDog(dog.id).then(setDog);
        }}
      />
    </>
  );
}
