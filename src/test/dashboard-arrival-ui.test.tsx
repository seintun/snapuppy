import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useBookings', () => ({
  useCalendarBookings: () => ({
    isLoading: false,
    data: [
      {
        id: 'booking-1',
        start_date: '2026-04-16',
        end_date: '2026-04-18',
        dogs: { name: 'Ice', photo_url: null },
      },
    ],
  }),
}));

vi.mock('@/features/dashboard/MetricsDashboard', () => ({
  MetricsDashboard: () => null,
}));

describe('DashboardScreen arriving dogs', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders inline arrive action per dog and no separate bottom action list', () => {
    render(<DashboardScreen />);
    expect(screen.getByRole('button', { name: /mark ice arrived/i })).toBeInTheDocument();
  });

  it('marks a dog arrived from inline chip and shows arrived state', async () => {
    render(<DashboardScreen />);
    await fireEvent.click(screen.getByRole('button', { name: /mark ice arrived/i }));
    expect(screen.getByRole('button', { name: /ice arrived/i })).toBeDisabled();
    expect(screen.getByText(/arrived/i)).toBeInTheDocument();
  });

  it('opens booking when avatar card is tapped', async () => {
    render(<DashboardScreen />);
    const avatarButton = screen.getByRole('button', { name: /view booking for ice/i });
    await fireEvent.click(avatarButton);
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/booking-1');
  });

  it('marks arrived without navigating when arrive chip is tapped', async () => {
    render(<DashboardScreen />);
    await fireEvent.click(screen.getByRole('button', { name: /mark ice arrived/i }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText(/arrived/i)).toBeInTheDocument();
  });
});
