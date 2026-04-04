import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddButton } from '@/components/ui/AddButton';
import { useToast } from '@/components/ui/useToast';
import { useDogs, useDeleteDog } from '@/hooks/useDogs';
import { AddDogSheet } from './AddDogSheet';

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bark/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-cream rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-extrabold text-bark text-lg mb-2">{title}</h3>
        <p className="text-bark-light text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-bark bg-pebble/50 hover:bg-pebble transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-terracotta hover:bg-terracotta/90 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DogsScreen() {
  const { data: dogs = [], isLoading, isError, error } = useDogs();
  const { mutateAsync: deleteDogMutation } = useDeleteDog();
  const { addToast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDogMutation(deleteConfirm.id);
      addToast('Dog removed', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove dog', 'error');
      setDeleteConfirm(null);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title !mb-1">Dogs</h1>
          <p className="text-sm text-bark-light">
            {dogs.length} client{dogs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {dogs.length === 0 ? (
        <EmptyState title="No dogs yet" description="Add your first furry client to get started." />
      ) : (
        <div className="grid gap-3 -mx-4 px-4">
          {dogs.map((dog) => (
            <Link key={dog.id} to={`/dogs/${dog.id}`} className="block">
              <Card className="p-4" pressable>
                <div className="flex items-center gap-4">
                  <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-extrabold text-bark truncate text-base">{dog.name}</h3>
                      <button
                        onClick={(e) => handleDeleteClick(e, dog.id, dog.name)}
                        className="p-2 text-bark-light hover:text-terracotta rounded-lg hover:bg-blush transition-all"
                        title="Delete dog"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-xs text-bark-light font-bold uppercase tracking-wide">
                        {dog.breed || 'Unknown breed'}
                      </p>
                      {dog.owner_name && (
                        <p className="text-sm text-bark truncate">{dog.owner_name}</p>
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

      <AddButton onClick={() => setIsAddOpen(true)} variant="dog" isActive={isAddOpen} />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Remove Dog"
        message={`Are you sure you want to remove ${deleteConfirm?.name}? This action cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
