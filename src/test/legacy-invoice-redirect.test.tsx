import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LegacyInvoiceRedirect } from '@/App';

describe('LegacyInvoiceRedirect', () => {
  it('redirects legacy invoice links to booking detail', () => {
    render(
      <MemoryRouter initialEntries={['/invoice/booking-1']}>
        <Routes>
          <Route path="/invoice/:bookingId" element={<LegacyInvoiceRedirect />} />
          <Route path="/bookings/:id" element={<div>Booking Detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Booking Detail')).toBeInTheDocument();
  });
});
