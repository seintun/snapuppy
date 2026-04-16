import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useToast } from '@/components/ui/useToast';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useSaveInvoiceOverrides } from '@/hooks/useBookings';
import {
  calculateInvoiceTotals,
  type InvoiceAdjustment,
  type InvoiceInput,
  type InvoiceLineItem,
  type InvoiceOverrides,
} from '@/lib/invoiceGenerator';
import { InvoicePreview } from './InvoicePreview';

interface GenerateInvoiceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  initialLineItems: InvoiceLineItem[];
  savedOverrides: InvoiceOverrides | null;
  previewInvoice: InvoiceInput & {
    isPaid?: boolean;
  };
}

interface GenerateInvoiceValues {
  lineItems: InvoiceLineItem[];
  adjustments: InvoiceAdjustment[];
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
  previewInvoice,
}: GenerateInvoiceSheetProps) {
  const { addToast } = useToast();
  const { mutateAsync: saveInvoiceOverrides, isPending } = useSaveInvoiceOverrides();
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [previewOverrides, setPreviewOverrides] = useState<InvoiceOverrides | null>(null);

  const defaultValues = useMemo<GenerateInvoiceValues>(() => {
    const baseLineItems = savedOverrides?.lineItems ?? initialLineItems;
    const baseAdjustments = savedOverrides?.adjustments ?? [];

    return {
      lineItems: normalizeLineItems(baseLineItems),
      adjustments: baseAdjustments.map((adjustment, index) => ({
        id: adjustment.id || `saved-adjustment-${index + 1}`,
        kind: adjustment.kind,
        description: adjustment.description,
        amount: Math.max(0, Number.isFinite(adjustment.amount) ? adjustment.amount : 0),
      })),
    };
  }, [initialLineItems, savedOverrides]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState,
    setValue,
    getValues,
    setError,
    clearErrors,
  } = useForm<GenerateInvoiceValues>({
    defaultValues,
  });

  const { fields: lineItemFields } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const {
    fields: adjustmentFields,
    append: appendAdjustment,
    remove: removeAdjustment,
  } = useFieldArray({
    control,
    name: 'adjustments',
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(defaultValues);
    setMode('edit');
    setPreviewOverrides(null);
  }, [defaultValues, isOpen, reset]);

  const watchedLineItems = watch('lineItems');
  const watchedAdjustments = watch('adjustments');

  const normalizedAdjustments = (watchedAdjustments ?? []).map((adjustment, index) => ({
    id: adjustment.id || `adjustment-${index + 1}`,
    kind: adjustment.kind,
    description: adjustment.description,
    amount: Math.max(0, Number(adjustment.amount) || 0),
  }));

  const previewTotals = calculateInvoiceTotals({
    sitterName: '',
    clientName: '',
    dogName: '',
    startDate: '2000-01-01',
    endDate: '2000-01-01',
    subtotal: 0,
    lineItems: normalizeLineItems(watchedLineItems ?? []),
    adjustments: normalizedAdjustments,
    tipAmount: 0,
  });

  const adjustLineItemNumber = (index: number, key: 'count' | 'rate', delta: number) => {
    const currentValue = Number(getValues(`lineItems.${index}.${key}`)) || 0;
    const min = key === 'count' ? 1 : 0;
    const next = Math.max(min, currentValue + delta);
    setValue(`lineItems.${index}.${key}`, next, { shouldDirty: true, shouldTouch: true });
  };

  const adjustAdjustmentAmount = (index: number, delta: number) => {
    const currentValue = Number(getValues(`adjustments.${index}.amount`)) || 0;
    const next = Math.max(0, currentValue + delta);
    setValue(`adjustments.${index}.amount`, next, { shouldDirty: true, shouldTouch: true });
  };

  const addAdjustment = (kind: InvoiceAdjustment['kind']) => {
    appendAdjustment({
      id: `adjustment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      description: '',
      amount: 0,
    });
  };

  const submit = handleSubmit(async (values) => {
    const sanitizedLineItems = normalizeLineItems(values.lineItems);
    const sanitizedAdjustments = values.adjustments.map((adjustment, index) => ({
      id: adjustment.id || `adjustment-${index + 1}`,
      kind: adjustment.kind,
      description: adjustment.description.trim(),
      amount: Math.max(0, Number(adjustment.amount) || 0),
    }));

    clearErrors();

    const firstInvalidChargeIndex = sanitizedAdjustments.findIndex(
      (adjustment) => adjustment.kind === 'charge' && adjustment.description.length === 0,
    );

    if (firstInvalidChargeIndex >= 0) {
      setError(`adjustments.${firstInvalidChargeIndex}.description`, {
        type: 'required',
        message: 'Charge description is required',
      });
      return;
    }

    const totals = calculateInvoiceTotals({
      sitterName: '',
      clientName: '',
      dogName: '',
      startDate: '2000-01-01',
      endDate: '2000-01-01',
      subtotal: 0,
      lineItems: sanitizedLineItems,
      adjustments: sanitizedAdjustments,
      tipAmount: 0,
    });

    const overrides: InvoiceOverrides = {
      lineItems: sanitizedLineItems,
      creditAmount: totals.credit,
      adjustments: sanitizedAdjustments,
    };

    try {
      await saveInvoiceOverrides({ bookingId, overrides });
      setPreviewOverrides(overrides);
      setMode('preview');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save invoice settings', 'error');
    }
  });

  if (mode === 'preview' && previewOverrides) {
    return (
      <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Invoice Preview">
        <div className="space-y-4">
          <InvoicePreview
            invoice={{
              ...previewInvoice,
              lineItems: previewOverrides.lineItems,
              adjustments: previewOverrides.adjustments,
              creditAmount: previewOverrides.creditAmount,
              documentLabel: 'Invoice',
            }}
            downloadName={`invoice-${bookingId}.png`}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-secondary min-h-[44px]"
              onClick={() => setMode('edit')}
            >
              Back to Edit
            </button>
            <button type="button" className="btn-sage min-h-[44px]" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </SlideUpSheet>
    );
  }

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Generate Invoice">
      <form className="space-y-4" onSubmit={submit}>
        <div className="surface-card p-3 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">
            Line Items
          </p>
          <div className="mt-2 space-y-3">
            {lineItemFields.map((field, index) => {
              const row = watchedLineItems?.[index];
              const count = Number(row?.count) || 0;
              const rate = Number(row?.rate) || 0;
              const rowTotal = count * rate;
              const unit = field.type === 'boarding' ? '/night' : '/day';
              const itemLabel = field.type === 'daycare' ? 'Daycare' : 'Boarding';

              return (
                <div
                  key={field.id}
                  className="rounded-[14px] border border-pebble/50 bg-[linear-gradient(to_bottom,rgba(143,184,134,0.06),rgba(253,251,247,1))] p-3"
                >
                  <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-bark uppercase tracking-wide">
                    <span>{itemLabel}</span>
                    {field.isHoliday ? (
                      <span className="rounded-md border border-terracotta/25 bg-white px-1.5 py-[1px] text-[10px] font-black text-terracotta">
                        Holiday
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-bark-light">
                        Count
                      </p>
                      <div className="mt-1 grid grid-cols-[44px_1fr_44px] items-center gap-1">
                        <button
                          type="button"
                          className="min-h-[44px] rounded-lg border border-pebble/70 bg-white text-lg font-black text-bark"
                          onClick={() => adjustLineItemNumber(index, 'count', -1)}
                          aria-label={`Decrease ${itemLabel} count`}
                        >
                          −
                        </button>
                        <input
                          className="form-input h-[44px] text-center"
                          type="number"
                          min={1}
                          step="1"
                          {...register(`lineItems.${index}.count`, {
                            valueAsNumber: true,
                            min: 1,
                          })}
                        />
                        <button
                          type="button"
                          className="min-h-[44px] rounded-lg border border-pebble/70 bg-white text-lg font-black text-bark"
                          onClick={() => adjustLineItemNumber(index, 'count', 1)}
                          aria-label={`Increase ${itemLabel} count`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-bark-light">
                        Rate
                      </p>
                      <div className="mt-1 grid grid-cols-[44px_1fr_44px] items-center gap-1">
                        <button
                          type="button"
                          className="min-h-[44px] rounded-lg border border-pebble/70 bg-white text-lg font-black text-bark"
                          onClick={() => adjustLineItemNumber(index, 'rate', -1)}
                          aria-label={`Decrease ${itemLabel} rate`}
                        >
                          −
                        </button>
                        <label className="relative">
                          <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-black text-bark-light">
                            $
                          </span>
                          <input
                            className="form-input h-[44px] pl-5 pr-12 text-center"
                            type="number"
                            min={0}
                            step="0.01"
                            {...register(`lineItems.${index}.rate`, {
                              valueAsNumber: true,
                              min: 0,
                            })}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide text-bark-light">
                            {unit}
                          </span>
                        </label>
                        <button
                          type="button"
                          className="min-h-[44px] rounded-lg border border-pebble/70 bg-white text-lg font-black text-bark"
                          onClick={() => adjustLineItemNumber(index, 'rate', 1)}
                          aria-label={`Increase ${itemLabel} rate`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between border-t border-pebble/40 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-bark-light">
                      Row Total
                    </p>
                    <p className="text-base font-black tracking-tight text-terracotta">
                      ${rowTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card p-3 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">
            Adjustments
          </p>

          {adjustmentFields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-pebble/60 bg-white px-3 py-2 text-xs text-bark-light">
              No adjustments yet.
            </p>
          ) : null}

          <div className="space-y-2">
            {adjustmentFields.map((field, index) => {
              const watchedKind = watchedAdjustments?.[index]?.kind ?? 'discount';
              const isCharge = watchedKind === 'charge';
              const descriptionError = formState.errors.adjustments?.[index]?.description?.message;

              return (
                <div key={field.id} className="rounded-[14px] border border-pebble/60 bg-cream p-3">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      className={`min-h-[44px] rounded-lg border text-xs font-black uppercase tracking-wide ${
                        isCharge
                          ? 'border-pebble/70 bg-white text-bark'
                          : 'border-sage bg-sage/20 text-bark'
                      }`}
                      onClick={() => {
                        setValue(`adjustments.${index}.kind`, 'discount', {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                        clearErrors(`adjustments.${index}.description`);
                      }}
                    >
                      Discount
                    </button>
                    <button
                      type="button"
                      className={`min-h-[44px] rounded-lg border text-xs font-black uppercase tracking-wide ${
                        isCharge
                          ? 'border-terracotta bg-terracotta/15 text-terracotta'
                          : 'border-pebble/70 bg-white text-bark'
                      }`}
                      onClick={() => {
                        setValue(`adjustments.${index}.kind`, 'charge', {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      Charge
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-[1fr_120px] gap-2">
                    <label className="form-label">
                      {isCharge ? 'Charge Description' : 'Description (optional)'}
                      <input
                        className="form-input mt-1 h-[44px]"
                        type="text"
                        {...register(`adjustments.${index}.description`)}
                      />
                    </label>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-bark-light">
                        Amount
                      </p>
                      <div className="mt-1 grid grid-cols-[34px_1fr_34px] items-center gap-1">
                        <button
                          type="button"
                          className="min-h-[44px] rounded-lg border border-pebble/70 bg-white text-sm font-black text-bark"
                          onClick={() => adjustAdjustmentAmount(index, -1)}
                          aria-label={`Decrease adjustment ${index + 1} amount`}
                        >
                          −
                        </button>
                        <label className="relative">
                          <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-black text-bark-light">
                            $
                          </span>
                          <input
                            className="form-input h-[44px] pl-5 text-right"
                            type="number"
                            min={0}
                            step="0.01"
                            {...register(`adjustments.${index}.amount`, {
                              valueAsNumber: true,
                              min: 0,
                            })}
                          />
                        </label>
                        <button
                          type="button"
                          className="min-h-[44px] rounded-lg border border-pebble/70 bg-white text-sm font-black text-bark"
                          onClick={() => adjustAdjustmentAmount(index, 1)}
                          aria-label={`Increase adjustment ${index + 1} amount`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {descriptionError ? (
                    <p className="mt-1 text-xs font-bold text-terracotta">{descriptionError}</p>
                  ) : null}

                  <button
                    type="button"
                    className="mt-2 min-h-[44px] w-full rounded-lg border border-terracotta/50 bg-white text-xs font-black uppercase tracking-wide text-terracotta"
                    onClick={() => removeAdjustment(index)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-secondary min-h-[44px]"
              onClick={() => addAdjustment('discount')}
            >
              + Add Discount
            </button>
            <button
              type="button"
              className="btn-secondary min-h-[44px]"
              onClick={() => addAdjustment('charge')}
            >
              + Add Charge
            </button>
          </div>
        </div>

        <div className="rounded-[14px] border border-terracotta/35 bg-[linear-gradient(to_bottom,rgba(245,240,235,1),rgba(253,251,247,1))] p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">
            Live Summary
          </p>
          <div className="mt-2 space-y-1 text-sm text-bark">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-bold">${previewTotals.baseSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Charges</span>
              <span className="font-bold text-terracotta">
                +${previewTotals.adjustmentCharges.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discounts</span>
              <span className="font-bold text-sage-dark">
                -${previewTotals.adjustmentDiscounts.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-pebble/60 pt-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-bark-light">Total</p>
            <p className="text-[30px] leading-none font-black tracking-tight text-terracotta">
              ${previewTotals.total.toFixed(2)}
            </p>
          </div>
        </div>

        <button
          className="btn-sage w-full"
          type="submit"
          disabled={formState.isSubmitting || isPending}
        >
          {formState.isSubmitting || isPending ? 'Saving…' : 'Save & Preview'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
