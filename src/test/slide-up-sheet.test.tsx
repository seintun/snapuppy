import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';

describe('SlideUpSheet', () => {
  it('keeps sheet visible after parent rerenders', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <SlideUpSheet isOpen onClose={onClose} title="New Booking">
        <p>Sheet content</p>
      </SlideUpSheet>,
    );

    const dialog = screen.getByRole('dialog', { name: 'New Booking', hidden: true });

    await waitFor(() => {
      expect(dialog).toHaveClass('sheet--open');
    });

    rerender(
      <SlideUpSheet isOpen onClose={onClose} title="New Booking">
        <p>Sheet content</p>
      </SlideUpSheet>,
    );

    expect(dialog).toHaveClass('sheet--open');
  });
});
