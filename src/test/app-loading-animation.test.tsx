import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';

describe('AppLoadingAnimation', () => {
  it('renders accessible status label', () => {
    render(<AppLoadingAnimation label="Syncing bookings..." />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Syncing bookings...');
    expect(screen.getByText('Syncing bookings...')).toBeInTheDocument();
  });

  it('pauses motion when page becomes hidden', () => {
    let hidden = false;
    const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'visibilityState',
    );

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (hidden ? 'hidden' : 'visible'),
    });

    render(<AppLoadingAnimation />);
    const status = screen.getByRole('status');

    expect(status).toHaveAttribute('data-paused', 'false');

    hidden = true;
    fireEvent(document, new Event('visibilitychange'));

    expect(status).toHaveAttribute('data-paused', 'true');

    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor);
    }
  });
});
