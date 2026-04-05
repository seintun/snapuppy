import { useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useGenerateClientLink } from '@/hooks/useProfile';
import { useToast } from '@/components/ui/useToast';

interface ClientLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClientLinkModal({ isOpen, onClose }: ClientLinkModalProps) {
  const { addToast } = useToast();
  const { mutateAsync: generateLink, isPending } = useGenerateClientLink();
  const [link, setLink] = useState('');

  async function handleGenerate() {
    const next = await generateLink();
    setLink(next);
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    addToast('Client link copied', 'success');
  }

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Share Client Portal">
      <div className="space-y-3">
        <button type="button" className="btn-sage w-full" onClick={() => void handleGenerate()} disabled={isPending}>
          {isPending ? 'Generating…' : link ? 'Regenerate Token' : 'Generate Link'}
        </button>
        {link ? <input className="form-input" value={link} readOnly /> : null}
        <button type="button" className="btn-sage w-full" onClick={() => void handleCopy()} disabled={!link}>
          Copy Link
        </button>
      </div>
    </SlideUpSheet>
  );
}
