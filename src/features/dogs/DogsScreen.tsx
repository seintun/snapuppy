import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/useToast';
import { useDogs, useDeleteDog } from '@/hooks/useDogs';
import { AddDogSheet } from './AddDogSheet';

export function DogsScreen() {
  const { data: dogs = [], isLoading, isError, error } = useDogs();
  const { mutateAsync: deleteDogMutation } = useDeleteDog();
  const { addToast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      await deleteDogMutation(id);
      addToast('Dog removed 🐾', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove dog', 'error');
    }
  };

  if (isLoading && !dogs.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-sm text-bark-light">
        Loading dogs…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-terracotta font-semibold">
        {error instanceof Error ? error.message : 'Failed to load dogs'}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title !m-0">Dogs</h1>
          <p className="m-0 mt-1 text-bark-light text-sm">
            Manage your regular clients and their details.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-sage text-white font-bold px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-transform"
        >
          <Plus size={20} weight="bold" />
          Add Dog
        </button>
      </div>

      {dogs.length === 0 ? (
        <EmptyState
          title="No dogs yet"
          description="Add your first furry friend to start tracking their stays."
          actionLabel="Add Dog"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="grid gap-3.5">
          {dogs.map((dog) => (
            <Link key={dog.id} to={`/dogs/${dog.id}`} className="block">
              <Card className="p-4" pressable>
                <div className="flex items-center gap-4">
                  <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-extrabold text-bark truncate text-base">{dog.name}</h3>
                      <button
                        onClick={(e) => void handleDelete(e, dog.id, dog.name)}
                        className="p-1.5 text-bark-light hover:text-terracotta bg-cream rounded-lg border border-pebble active:scale-90 transition-all"
                        title="Delete dog"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-xs text-bark-light font-bold uppercase tracking-wide">
                        {dog.breed || 'Unknown breed'}
                      </p>
                      {dog.owner_name && (
                        <p className="text-sm text-bark truncate">
                          Owner: <span className="font-semibold">{dog.owner_name}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddDogSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </>
  );
}
