import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { useToast } from '@/components/ui/useToast';
import { getDog, deleteDog } from './dogService';
import { AddDogSheet } from './AddDogSheet';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];

export function DogDetailScreen() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!dogId) {
      setError('Dog ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    getDog(dogId)
      .then((data) => {
        setDog(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load dog');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dogId]);

  function handleDelete() {
    if (!dog || !confirm(`Delete ${dog.name}? This cannot be undone.`)) return;

    deleteDog(dog.id)
      .then(() => {
        addToast(`${dog.name} deleted`, 'success');
        navigate('/dogs');
      })
      .catch((err) => {
        addToast(err instanceof Error ? err.message : 'Failed to delete dog', 'error');
      });
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error || !dog) {
    return (
      <div>
        <p style={{ color: 'var(--terracotta)' }}>{error || 'Dog not found'}</p>
        <button className="btn-secondary" onClick={() => navigate('/dogs')}>
          Back to Dogs
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/dogs')}
        style={{
          marginBottom: 16,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--sage)',
          fontWeight: 600,
        }}
      >
        ← Back to Dogs
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 120,
            height: 120,
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
        </div>
        <h1 style={{ margin: 0 }}>{dog.name}</h1>
        {dog.owner_name && (
          <p style={{ margin: '4px 0 0', color: 'var(--bark-light)' }}>Owner: {dog.owner_name}</p>
        )}
      </div>

      <Card className="p-4" pressable={false}>
        <p className="profile-section-title">Contact</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dog.owner_phone && (
            <div>
              <span className="form-label">Phone</span>
              <a href={`tel:${dog.owner_phone}`} style={{ color: 'var(--sage)' }}>
                {dog.owner_phone}
              </a>
            </div>
          )}
          {!dog.owner_phone && <span style={{ color: 'var(--bark-light)' }}>No phone number</span>}
        </div>
      </Card>

      {dog.notes && (
        <Card className="p-4" style={{ marginBottom: 16 }}>
          <p className="profile-section-title">Notes</p>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{dog.notes}</p>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-sage" onClick={() => setIsEditing(true)} style={{ flex: 1 }}>
          Edit Dog
        </button>
        <button className="btn-danger" onClick={handleDelete} style={{ flex: 1 }}>
          Delete
        </button>
      </div>

      <AddDogSheet
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          getDog(dog.id)
            .then(setDog)
            .catch(() => {});
        }}
        editingDog={dog}
      />
    </>
  );
}
