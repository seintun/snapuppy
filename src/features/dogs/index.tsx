import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/useToast';
import { useDogs } from './useDogs';
import { AddDogSheet } from './AddDogSheet';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];

export function DogsScreen() {
  const { dogs, loading, error, deleteDog, refresh } = useDogs();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isAddDogOpen, setIsAddDogOpen] = useState(false);
  const [editingDog, setEditingDog] = useState<Dog | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDogs = searchQuery
    ? dogs.filter((dog) => dog.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : dogs;

  function handleEditDog(e: React.MouseEvent, dog: Dog) {
    e.stopPropagation();
    setEditingDog(dog);
    setIsAddDogOpen(true);
  }

  function handleDeleteDog(e: React.MouseEvent, dog: Dog) {
    e.stopPropagation();
    if (!confirm(`Delete ${dog.name}? This cannot be undone.`)) return;
    deleteDog(dog.id)
      .then(() => {
        addToast(`${dog.name} deleted`, 'success');
      })
      .catch((err) => {
        addToast(err instanceof Error ? err.message : 'Failed to delete dog', 'error');
      });
  }

  function handleSheetClose() {
    setIsAddDogOpen(false);
    setEditingDog(undefined);
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Dogs</h1>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'var(--terracotta)' }}>{error}</p>
      ) : filteredDogs.length === 0 ? (
        <EmptyState
          title="No dogs yet"
          description="Add your first furry client to get started."
          actionLabel="Add Dog"
          onAction={() => setIsAddDogOpen(true)}
        />
      ) : (
        <>
          <input
            type="search"
            placeholder="Search dogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredDogs.map((dog) => (
              <Card
                key={dog.id}
                className="p-4"
                pressable
                onClick={() => navigate(`/dogs/${dog.id}`)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
                  <div style={{ flex: 1 }}>
                    <strong>{dog.name}</strong>
                    {dog.owner_name && (
                      <p
                        style={{
                          margin: 0,
                          color: 'var(--bark-light)',
                          fontSize: 14,
                        }}
                      >
                        {dog.owner_name}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={(e) => handleEditDog(e, dog)}
                    aria-label={`Edit ${dog.name}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={(e) => handleDeleteDog(e, dog)}
                    aria-label={`Delete ${dog.name}`}
                  >
                    ✕
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <AddDogSheet
        isOpen={isAddDogOpen}
        onClose={handleSheetClose}
        onSuccess={() => {
          handleSheetClose();
          refresh();
        }}
        editingDog={editingDog}
      />
    </>
  );
}
