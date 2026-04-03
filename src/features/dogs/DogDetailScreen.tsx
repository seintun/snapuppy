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
    return <p>Loading dog profile...</p>;
  }

  if (!dogId) {
    return (
      <>
        <p style={{ color: 'var(--terracotta)' }}>Dog ID is missing</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/dogs')}>
          Back to Dogs
        </button>
      </>
    );
  }

  if (error || !dog) {
    return (
      <>
        <p style={{ color: 'var(--terracotta)' }}>{error ?? 'Dog not found'}</p>
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

      <div style={{ textAlign: 'center', margin: '16px 0 20px' }}>
        <div style={{ display: 'inline-flex', marginBottom: 12 }}>
          <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
        </div>
        <h1 style={{ margin: 0 }}>{dog.name}</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--bark-light)' }}>
          {dog.owner_name ?? 'Owner unknown'}
        </p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Card className="p-4">
          <p className="profile-section-title">Contact</p>
          <p style={{ margin: 0 }}>{dog.owner_phone ?? 'No phone number'}</p>
        </Card>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Card className="p-4">
          <p className="profile-section-title">Notes</p>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{dog.notes ?? 'No notes yet.'}</p>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn-sage" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>
          Edit
        </button>
        <button type="button" className="btn-danger" style={{ flex: 1 }} onClick={() => void handleDelete()}>
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
