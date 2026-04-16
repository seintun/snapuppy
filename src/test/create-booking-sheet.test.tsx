import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateBookingSheet } from '@/features/bookings/CreateBookingSheet';
import type { ReactNode } from 'react';
import type { Tables } from '@/types';

const { createBookingMutationMock } = vi.hoisted(() => ({
  createBookingMutationMock: vi.fn(),
}));

vi.mock('@/features/auth/useAuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('@/components/ui/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookingOptions: () => ({
    data: {
      dogs: [{ id: 'dog-1', name: 'Rex', owner_name: 'John', photo_url: null }],
      profile: {
        id: 'test-user',
        nightly_rate: 50,
        daycare_rate: 30,
        holiday_surcharge: 10,
        cutoff_time: '11:00',
      },
    },
  }),
  useCreateBooking: () => ({
    mutateAsync: createBookingMutationMock,
    isPending: false,
  }),
}));

vi.mock('@/lib/bookingService', () => ({
  buildBookingPricing: vi.fn().mockReturnValue({
    type: 'boarding',
    days: [{ date: '2024-01-01', amount: 50 }],
    totalAmount: 50,
    isHoliday: false,
  }),
}));

vi.mock('@/features/dogs/AddDogSheet', () => ({
  AddDogSheet: ({
    isOpen,
    onSuccess,
    onClose,
  }: {
    isOpen: boolean;
    onSuccess?: (dog?: Tables<'dogs'>) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="add-dog-sheet">
        <span>Add Dog Sheet</span>
        <button
          type="button"
          onClick={() => {
            onSuccess?.({
              id: 'dog-2',
              name: 'Milo',
              breed: null,
              owner_name: 'Jane',
              owner_phone: null,
              notes: null,
              photo_url: null,
              archived_at: null,
              sitter_id: 'test-user',
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
            });
            onClose();
          }}
        >
          Mock Add Dog Success
        </button>
      </div>
    ) : null,
}));

function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('CreateBookingSheet - Quick Add removed', () => {
  beforeEach(() => {
    createBookingMutationMock.mockReset();
    createBookingMutationMock.mockResolvedValue({ id: 'booking-1' });
  });

  it('does not include Quick Add checkbox', () => {
    render(
      <TestWrapper>
        <CreateBookingSheet isOpen onClose={() => {}} />
      </TestWrapper>,
    );

    expect(screen.queryByText('Quick Add')).not.toBeInTheDocument();
  });

  it('renders DogDropdown unconditionally', () => {
    render(
      <TestWrapper>
        <CreateBookingSheet isOpen onClose={() => {}} />
      </TestWrapper>,
    );

    expect(screen.getByText('Dog *')).toBeInTheDocument();
  });

  it('shows Add New Dog as the first dropdown option', () => {
    render(
      <TestWrapper>
        <CreateBookingSheet isOpen onClose={() => {}} />
      </TestWrapper>,
    );

    const dogTrigger = screen.getByText('Select a dog…').closest('button');
    expect(dogTrigger).not.toBeNull();
    fireEvent.click(dogTrigger!);

    const addNewOption = screen.getByText('Add New Dog').closest('button');
    expect(addNewOption).toBeInTheDocument();

    const dropdown = addNewOption!.parentElement;
    expect(dropdown).not.toBeNull();

    const directButtons = Array.from(dropdown!.querySelectorAll(':scope > button'));
    expect(directButtons[0]).toBe(addNewOption!);
  });

  it('opens AddDogSheet when Add New Dog is selected', () => {
    render(
      <TestWrapper>
        <CreateBookingSheet isOpen onClose={() => {}} />
      </TestWrapper>,
    );

    const dogTrigger = screen.getByText('Select a dog…').closest('button');
    expect(dogTrigger).not.toBeNull();
    fireEvent.click(dogTrigger!);
    const addNewOption = screen.getByText('Add New Dog').closest('button');
    expect(addNewOption).not.toBeNull();
    fireEvent.click(addNewOption!);

    expect(screen.getByTestId('add-dog-sheet')).toBeInTheDocument();
  });

  it('resets AddDogSheet state when booking sheet closes', () => {
    const { rerender } = render(
      <TestWrapper>
        <CreateBookingSheet isOpen onClose={() => {}} />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Select a dog…').closest('button')!);
    fireEvent.click(screen.getByText('Add New Dog').closest('button')!);
    expect(screen.getByTestId('add-dog-sheet')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <CreateBookingSheet isOpen={false} onClose={() => {}} />
      </TestWrapper>,
    );

    expect(screen.queryByTestId('add-dog-sheet')).not.toBeInTheDocument();
  });

  it('submits booking with newly added dog id after AddDogSheet success', async () => {
    render(
      <TestWrapper>
        <CreateBookingSheet isOpen onClose={() => {}} />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Select a dog…').closest('button')!);
    fireEvent.click(screen.getByText('Add New Dog').closest('button')!);
    fireEvent.click(screen.getByText('Mock Add Dog Success'));

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking 🐾', hidden: true }));

    await waitFor(() => {
      expect(createBookingMutationMock).toHaveBeenCalledWith(
        expect.objectContaining({ dogId: 'dog-2' }),
      );
    });
  });

  it('requires dog selection before form submit', () => {
    const { container } = render(
      <TestWrapper>
        <CreateBookingSheet isOpen onClose={() => {}} />
      </TestWrapper>,
    );

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    expect(screen.queryByText('Quick Add')).not.toBeInTheDocument();
  });
});
