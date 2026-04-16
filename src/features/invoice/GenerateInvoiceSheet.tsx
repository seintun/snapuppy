import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/useToast';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useSaveInvoiceOverrides } from '@/hooks/useBookings';
import { calculateInvoiceTotals, type InvoiceLineItem, type InvoiceOverrides } from '@/lib/invoiceGenerator';

interface GenerateInvoiceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  initialLineItems: InvoiceLineItem[];
  savedOverrides: InvoiceOverrides | null;
}

interface GenerateInvoiceValues {
  lineItems: InvoiceLineItem[];
  creditAmount: number;
}

function normalizeLineItems(items: InvoiceLineItem[]): InvoiceLineItem[] {
  return items.map((item) => ({
    type: item.type,
    isHoliday: item.isHoliday,
    count: Math.max(1, Number.isFinite(item.count) ? item.count : 1),
    rate: Math.max(0, Number.isFinite(item.rate) ? item.rate : 0),
  }));
}

export function GenerateInvoiceSheet({
  isOpen,
  onClose,
  bookingId,
  initialLineItems,
  savedOverrides,
}: GenerateInvoiceSheetProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { mutateAsync: saveInvoiceOverrides, isPending } = useSaveInvoiceOverrides();

  const defaultValues = useMemo<GenerateInvoiceValues>(() => {
    const baseLineItems = savedOverrides?.lineItems ?? initialLineItems;
    return {
      lineItems: normalizeLineItems(baseLineItems),
      creditAmount: Math.max(0, savedOverrides?.creditAmount ?? 0),
    };
  }, [initialLineItems, savedOverrides]);

  const { control, register, handleSubmit, reset, watch, formState } = useForm<GenerateInvoiceValues>({
    defaultValues,
  });

  const { fields } = useFieldArray({
    control,
    name: 'lineItems',
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const watchedLineItems = watch('lineItems');
  const watchedCredit = watch('creditAmount') ?? 0;
  const previewTotals = calculateInvoiceTotals({
    sitterName: '',
    clientName: '',
    dogName: '',
    startDate: '2000-01-01',
    endDate: '2000-01-01',
    subtotal: 0,
    lineItems: normalizeLineItems(watchedLineItems ?? []),
    creditAmount: Number(watchedCredit) || 0,
    tipAmount: 0,
  });

  const submit = handleSubmit(async (values) => {
    const sanitizedLineItems = normalizeLineItems(values.lineItems);
    const totals = calculateInvoiceTotals({
      sitterName: '',
      clientName: '',
      dogName: '',
      startDate: '2000-01-01',
      endDate: '2000-01-01',
      subtotal: 0,
      lineItems: sanitizedLineItems,
      creditAmount: Number(values.creditAmount) || 0,
      tipAmount: 0,
    });

    const overrides: InvoiceOverrides = {
      lineItems: sanitizedLineItems,
      creditAmount: totals.credit,
    };

    try {
      await saveInvoiceOverrides({ bookingId, overrides });
      onClose();
      navigate(`/invoice/${bookingId}`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save invoice settings', 'error');
    }
  });

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Generate Invoice">
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">Line Items</p>
          <div className="mt-2 space-y-3">
            {fields.map((field, index) => {
              const row = watchedLineItems?.[index];
              const count = Number(row?.count) || 0;
              const rate = Number(row?.rate) || 0;
              const rowTotal = count * rate;
              return (
                <div key={field.id} className="rounded-[14px] border border-pebble/50 bg-cream p-3">
                  <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-bark uppercase tracking-wide">
                    <span>{field.type === 'daycare' ? 'Daycare' : 'Boarding'}</span>
                    {field.isHoliday ? (
                      <span className="rounded-md border border-terracotta/25 bg-white px-1.5 py-[1px] text-[10px] font-black text-terracotta">
                        Holiday
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="form-label">
                      Count
                      <input
                        className="form-input mt-1"
                        type="number"
                        min={1}
                        step="1"
                        {...register(`lineItems.${index}.count`, {
                          valueAsNumber: true,
                          min: 1,
                        })}
                      />
                    </label>
                    <label className="form-label">
                      Rate
                      <input
                        className="form-input mt-1"
                        type="number"
                        min={0}
                        step="0.01"
                        {...register(`lineItems.${index}.rate`, {
                          valueAsNumber: true,
                          min: 0,
                        })}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-right text-xs font-bold text-bark">Row total: ${rowTotal.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">Adjustments</p>
          <label className="form-label mt-2">
            $ Discount / Credit
            <input
              className="form-input mt-1"
              type="number"
              min={0}
              step="0.01"
              {...register('creditAmount', {
                valueAsNumber: true,
                min: 0,
              })}
            />
          </label>
        </div>

        <div className="rounded-[14px] border border-terracotta/30 bg-blush p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">Invoice Total</p>
          <p className="mt-1 text-[30px] leading-none font-black tracking-tight text-terracotta">
            ${previewTotals.subtotal.toFixed(2)}
          </p>
        </div>

        <button className="btn-sage w-full" type="submit" disabled={formState.isSubmitting || isPending}>
          {formState.isSubmitting || isPending ? 'Saving…' : 'Create Invoice'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
