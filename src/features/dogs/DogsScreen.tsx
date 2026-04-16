import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddButton } from '@/components/ui/AddButton';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { useToast } from '@/components/ui/useToast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useDogs, useDeleteDog } from '@/hooks/useDogs';
import { AddDogSheet } from './AddDogSheet';

export function DogsScreen() {
  const { data: dogs = [], isLoading, isError, error } = useDogs();
  const { mutateAsync: deleteDogMutation, isPending: isDeleting } = useDeleteDog();
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
      <div className="flex h-[60vh] items-center justify-center">
        <AppLoadingAnimation size="md" label="Syncing pups..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-terracotta text-sm font-black">
        {error instanceof Error ? error.message : 'Sync failed'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex items-end justify-between px-1 pt-2 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-bark tracking-tight leading-none">Dogs</h1>
          <p className="text-[10px] font-black text-bark-light/40 uppercase tracking-[0.2em] mt-1">
            Total Client{dogs.length !== 1 ? 's' : ''} ({dogs.length})
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        {dogs.length === 0 ? (
          <div className="mt-12 opacity-40">
            <EmptyState
              title="No dogs yet"
              description="Add your first furry client to get started."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-1 pb-20">
            {dogs.map((dog) => (
              <Link key={dog.id} to={`/dogs/${dog.id}`} className="block">
                <Card className="p-2.5 px-3 border border-pebble/10" pressable>
                  <div className="flex items-center gap-3">
                    <DogAvatar name={dog.name} src={dog.photo_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <h3 className="font-black text-bark truncate text-sm leading-none">
                            {dog.name}
                          </h3>
                          <p className="text-[10px] font-bold text-bark-light opacity-50 uppercase tracking-tighter mt-1 truncate">
                            {dog.breed || 'Unknown breed'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => handleDeleteClick(e, dog.id, dog.name)}
                            className="p-1.5 text-bark-light/30 hover:text-terracotta rounded-lg transition-all cursor-pointer"
                            title="Remove dog"
                          >
                            <Trash size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-pebble/5">
                        <p className="text-[10px] font-black text-bark/40 truncate uppercase tracking-tighter">
                          OWNER:{' '}
                          <span
                            className={
                              dog.owner_name ? 'text-bark opacity-80' : 'text-bark opacity-20'
                            }
                          >
                            {dog.owner_name || 'NO OWNER'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <AddDogSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <AddButton onClick={() => setIsAddOpen(true)} variant="dog" isActive={isAddOpen} />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Remove Dog"
        message={`Remove ${deleteConfirm?.name} from your roster? Active and pending stays will be cancelled. Completed stays and earnings history are preserved.`}
        confirmLabel="Remove"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
