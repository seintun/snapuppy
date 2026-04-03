import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/useToast';
import { useDogs } from './useDogs';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { AddDogSheet } from './AddDogSheet';
import { DogDetailScreen } from './DogDetailScreen';
import type { Database } from '@/types/database';

export { DogDetailScreen };

type Dog = Database['public']['Tables']['dogs']['Row'];

export function DogsScreen() {
  const { user } = useAuthContext();
  const { dogs, loading, error, deleteDog } = useDogs();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isAddDogOpen, setIsAddDogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDogs = useMemo(() => {
    if (!searchQuery.trim()) return dogs;

    const needle = searchQuery.trim().toLowerCase();
    return dogs.filter((dog) => dog.name.toLowerCase().includes(needle));
  }, [dogs, searchQuery]);

  async function handleDeleteDog(dog: Dog) {
    if (!confirm(`Delete ${dog.name}? This cannot be undone.`)) return;

    try {
      await deleteDog(dog.id);
      addToast(`${dog.name} removed`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete dog', 'error');
    }
  }

  if (!user) return null;

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h1 className="page-title !m-0">Dogs</h1>
        {dogs.length > 0 && (
          <button className="btn-secondary" type="button" onClick={() => setIsAddDogOpen(true)}>
            + Add Dog
          </button>
        )}
      </div>

      {loading ? <p className="text-bark-light">Loading dogs...</p> : null}
      {!loading && error ? <p className="text-terracotta">{error}</p> : null}

      {!loading && !error ? (
        filteredDogs.length === 0 ? (
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
              className="form-input mb-3 w-full"
            />

            <div className="flex flex-col gap-2.5">
              {filteredDogs.map((dog) => (
                <Card
                  key={dog.id}
                  className="p-4"
                  pressable
                  onClick={() => navigate(`/dogs/${dog.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <DogAvatar name={dog.name} src={dog.photo_url} size="md" />
                    <div className="flex-1">
                      <strong>{dog.name}</strong>
                      <p className="m-0 text-sm text-bark-light">
                        {dog.owner_name ?? 'No owner name'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteDog(dog);
                      }}
                      aria-label={`Delete ${dog.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )
      ) : null}

      <AddDogSheet
        isOpen={isAddDogOpen}
        onClose={() => setIsAddDogOpen(false)}
        onSuccess={() => setIsAddDogOpen(false)}
      />
    </>
  );
}
