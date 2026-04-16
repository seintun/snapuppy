import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, TagSimple, X } from '@phosphor-icons/react';
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

function restrictDecimals(e: React.FormEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  const val = input.value;
  const dotIdx = val.indexOf('.');
  if (dotIdx !== -1 && val.length - dotIdx > 3) {
    input.value = val.substring(0, dotIdx + 3);
  }
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

  const hasChargeWithoutDescription = (watchedAdjustments ?? []).some(
    (adj) => adj.kind === 'charge' && !adj.description?.trim(),
  );

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
      <form className="space-y-3" onSubmit={submit} noValidate>
        {/* Line Items — no section heading, reduced outer padding */}
        <div className="rounded-[14px] border border-sage/30 bg-[linear-gradient(135deg,rgba(143,184,134,0.18)_0%,rgba(212,228,208,0.10)_60%,rgba(253,251,247,1)_100%)] p-2.5 space-y-2">
          {lineItemFields.map((field, index) => {
            const row = watchedLineItems?.[index];
            const count = Number(row?.count) || 0;
            const rate = Number(row?.rate) || 0;
            const rowTotal = count * rate;
            const itemLabel = field.type === 'daycare' ? 'Daycare' : 'Boarding';

            return (
              <div
                key={field.id}
                className="rounded-[12px] border border-pebble/50 bg-[linear-gradient(to_bottom,rgba(143,184,134,0.12),rgba(253,251,247,1))] p-2.5"
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-bark uppercase tracking-wide">
                  <span>{itemLabel}</span>
                  {field.isHoliday ? (
                    <span className="rounded-md border border-terracotta/25 bg-white px-1.5 py-[1px] text-[10px] font-black text-terracotta">
                      Holiday
                    </span>
                  ) : null}
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-bark-light">
                      Count
                    </p>
                    <input
                      className="form-input h-[42px] text-center"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step="1"
                      onFocus={(e) => e.target.select()}
                      {...register(`lineItems.${index}.count`, {
                        valueAsNumber: true,
                        min: 1,
                      })}
                    />
                  </div>

                  <span className="mb-[10px] text-base font-black text-bark-light select-none">
                    ×
                  </span>

                  <div className="flex-1">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-bark-light">
                      Rate
                    </p>
                    <label className="relative block">
                      <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-black text-bark-light">
                        $
                      </span>
                      <input
                        className="form-input h-[42px] pl-5 text-center"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        onFocus={(e) => e.target.select()}
                        onInput={restrictDecimals}
                        {...register(`lineItems.${index}.rate`, {
                          valueAsNumber: true,
                          min: 0,
                        })}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-pebble/40 pt-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-bark-light">
                    Subtotal
                  </p>
                  <p className="text-[15px] font-black tracking-tight text-terracotta">
                    ${rowTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Adjustments */}
        <div className="surface-card p-2.5 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">
            Adjustments
          </p>

          {adjustmentFields.length > 0 && (
            <div className="space-y-2">
              {adjustmentFields.map((field, index) => {
                const watchedKind = watchedAdjustments?.[index]?.kind ?? 'discount';
                const isCharge = watchedKind === 'charge';
                const descriptionValue = watchedAdjustments?.[index]?.description ?? '';
                const showDescriptionError = isCharge && !descriptionValue.trim();

                return (
                  <div
                    key={field.id}
                    className="relative rounded-[12px] border border-pebble/60 bg-cream p-2.5"
                  >
                    {/* Remove × */}
                    <button
                      type="button"
                      className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-pebble/60 bg-white text-bark-light"
                      onClick={() => removeAdjustment(index)}
                      aria-label={`Remove adjustment ${index + 1}`}
                    >
                      <X size={10} weight="bold" />
                    </button>

                    {/* Kind toggle pills */}
                    <div className="mb-2 flex gap-1 pr-7">
                      <button
                        type="button"
                        className={`flex h-[30px] flex-1 items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wide transition-colors ${
                          !isCharge
                            ? 'border-sage/60 bg-sage/20 text-sage-dark'
                            : 'border-pebble/50 bg-white text-bark-light'
                        }`}
                        onClick={() => {
                          setValue(`adjustments.${index}.kind`, 'discount', {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                          clearErrors(`adjustments.${index}.description`);
                        }}
                      >
                        <TagSimple size={10} />
                        Discount
                      </button>
                      <button
                        type="button"
                        className={`flex h-[30px] flex-1 items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wide transition-colors ${
                          isCharge
                            ? 'border-terracotta/50 bg-terracotta/12 text-terracotta'
                            : 'border-pebble/50 bg-white text-bark-light'
                        }`}
                        onClick={() => {
                          setValue(`adjustments.${index}.kind`, 'charge', {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }}
                      >
                        <Plus size={10} />
                        Charge
                      </button>
                    </div>

                    {/* Description + Amount — aligned by items-end on the grid */}
                    <div className="grid grid-cols-[1fr_96px] items-end gap-2">
                      <div>
                        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-bark-light">
                          {isCharge ? 'Description *' : 'Description'}
                        </p>
                        <input
                          className={`form-input h-[42px] ${showDescriptionError ? 'border-terracotta ring-1 ring-terracotta/30' : ''}`}
                          type="text"
                          placeholder={isCharge ? 'Required' : 'Optional'}
                          {...register(`adjustments.${index}.description`)}
                        />
                      </div>

                      <div>
                        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-bark-light">
                          Amount
                        </p>
                        <label className="relative block">
                          <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-black text-bark-light">
                            $
                          </span>
                          <input
                            className="form-input h-[42px] pl-5 text-right"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            onFocus={(e) => e.target.select()}
                            onInput={restrictDecimals}
                            {...register(`adjustments.${index}.amount`, {
                              valueAsNumber: true,
                              min: 0,
                            })}
                          />
                        </label>
                      </div>
                    </div>

                    {showDescriptionError && (
                      <p className="mt-1 text-[11px] font-bold text-terracotta">
                        Charge description is required
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-[36px] flex-1 items-center justify-center gap-1 rounded-xl border border-sage/50 bg-sage/10 text-[11px] font-black uppercase tracking-wide text-sage-dark"
              onClick={() => addAdjustment('discount')}
            >
              <TagSimple size={11} />
              Add Discount
            </button>
            <button
              type="button"
              className="flex h-[36px] flex-1 items-center justify-center gap-1 rounded-xl border border-terracotta/40 bg-terracotta/8 text-[11px] font-black uppercase tracking-wide text-terracotta"
              onClick={() => addAdjustment('charge')}
            >
              <Plus size={11} />
              Add Charge
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-[14px] border border-sage/40 bg-[linear-gradient(135deg,rgba(143,184,134,0.18)_0%,rgba(212,228,208,0.10)_60%,rgba(253,251,247,1)_100%)] p-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-bark-light">
            Summary
          </p>
          <div className="mt-2 space-y-1 text-sm text-bark">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-bold">${previewTotals.baseSubtotal.toFixed(2)}</span>
            </div>
            {previewTotals.adjustmentCharges > 0 && (
              <div className="flex items-center justify-between">
                <span>Charges</span>
                <span className="font-bold text-terracotta">
                  +${previewTotals.adjustmentCharges.toFixed(2)}
                </span>
              </div>
            )}
            {previewTotals.adjustmentDiscounts > 0 && (
              <div className="flex items-center justify-between">
                <span>Discounts</span>
                <span className="font-bold text-sage-dark">
                  -${previewTotals.adjustmentDiscounts.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-end justify-between border-t border-pebble/60 pt-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-bark-light">Total</p>
            <p className="text-[30px] leading-none font-black tracking-tight text-terracotta">
              ${previewTotals.total.toFixed(2)}
            </p>
          </div>
        </div>

        <button
          className="btn-sage w-full"
          type="submit"
          disabled={formState.isSubmitting || isPending || hasChargeWithoutDescription}
        >
          {formState.isSubmitting || isPending ? 'Saving…' : 'Save & Preview'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
