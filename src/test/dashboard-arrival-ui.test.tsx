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

  it('renders inline toggle button per dog', () => {
    render(<DashboardScreen />);
    expect(screen.getByRole('button', { name: /mark ice arrived/i })).toBeInTheDocument();
  });

  it('toggles arrival state when button is clicked', async () => {
    render(<DashboardScreen />);
    const arriveBtn = screen.getByRole('button', { name: /mark ice arrived/i });
    await fireEvent.click(arriveBtn);
    expect(screen.getByRole('button', { name: /undo ice arrival/i })).toBeInTheDocument();
  });

  it('opens booking when avatar card is tapped', async () => {
    render(<DashboardScreen />);
    const avatarButton = screen.getByRole('button', { name: /view booking for ice/i });
    await fireEvent.click(avatarButton);
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/booking-1');
  });

  it('toggles arrival without navigating when toggle button is clicked', async () => {
    render(<DashboardScreen />);
    await fireEvent.click(screen.getByRole('button', { name: /mark ice arrived/i }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /undo ice arrival/i })).toBeInTheDocument();
  });
});
