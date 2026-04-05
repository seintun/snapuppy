import { useCallback, useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { useCreateReport, useUpdateReport, useBookingReports } from '@/hooks/useReports';
import { uploadReportPhoto } from '@/lib/reportService';
import { format, parseISO, isToday, isBefore, startOfToday } from 'date-fns';
import { Camera, X } from '@phosphor-icons/react';

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingStartDate: string;
  bookingEndDate: string;
  editingReportId?: string;
}

export function ReportSheet({
  isOpen,
  onClose,
  bookingId,
  bookingStartDate,
  bookingEndDate,
  editingReportId,
}: ReportSheetProps) {
  const { addToast } = useToast();
  const { mutateAsync: createReport, isPending: creating } = useCreateReport();
  const { mutateAsync: updateReport, isPending: updating } = useUpdateReport();
  const { data: existingReports = [] } = useBookingReports(bookingId);

  const editingReport = editingReportId
    ? existingReports.find((r) => r.id === editingReportId)
    : undefined;

  const [selectedDate, setSelectedDate] = useState(
    editingReport?.date || format(new Date(), 'yyyy-MM-dd'),
  );
  const [notes, setNotes] = useState(editingReport?.notes || '');
  const [pottyStatus, setPottyStatus] = useState(editingReport?.potty_status || 'good');
  const [mealsGiven, setMealsGiven] = useState(editingReport?.meals_given?.join(', ') || '');
  const [behavior, setBehavior] = useState(editingReport?.behavior || '');
  const [medications, setMedications] = useState(editingReport?.medications_given || '');
  const [photos, setPhotos] = useState<string[]>(editingReport?.photos || []);
  const [uploading, setUploading] = useState(false);

  const isSubmitting = creating || updating || uploading;

  const validDates = useCallback(() => {
    const dates: string[] = [];
    let current = parseISO(bookingStartDate);
    const end = parseISO(bookingEndDate);
    const today = startOfToday();

    while (current <= end) {
      if (isBefore(current, today) || isToday(current)) {
        dates.push(format(current, 'yyyy-MM-dd'));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [bookingStartDate, bookingEndDate]);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        const uploadedUrls: string[] = [];
        for (const file of Array.from(files)) {
          const url = await uploadReportPhoto(bookingId, selectedDate, file);
          uploadedUrls.push(url);
        }
        setPhotos((prev) => [...prev, ...uploadedUrls]);
        addToast('Photos uploaded!', 'success');
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to upload photos', 'error');
      } finally {
        setUploading(false);
      }
    },
    [bookingId, selectedDate, addToast],
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const reportData = {
        bookingId,
        date: selectedDate,
        notes: notes || undefined,
        pottyStatus: pottyStatus || undefined,
        mealsGiven: mealsGiven
          ? mealsGiven
              .split(',')
              .map((m) => m.trim())
              .filter(Boolean)
          : undefined,
        behavior: behavior || undefined,
        medicationsGiven: medications || undefined,
        photos: photos.length > 0 ? photos : undefined,
      };

      if (editingReportId) {
        await updateReport({ id: editingReportId, input: reportData });
        addToast('Report updated!', 'success');
      } else {
        await createReport(reportData);
        addToast('Report saved!', 'success');
      }
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save report', 'error');
    }
  }, [
    editingReportId,
    bookingId,
    selectedDate,
    notes,
    pottyStatus,
    mealsGiven,
    behavior,
    medications,
    photos,
    createReport,
    updateReport,
    addToast,
    onClose,
  ]);

  return (
    <SlideUpSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingReportId ? 'Edit Report' : 'Daily Report'}
    >
      <div className="flex flex-col gap-4 pb-20">
        <div className="form-field">
          <label className="form-label text-xs uppercase tracking-wide">Date</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
          >
            {validDates().map((date) => (
              <option key={date} value={date}>
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label text-xs uppercase tracking-wide">Potty Status</label>
          <div className="flex gap-2">
            {['good', 'accident', 'none_out'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setPottyStatus(status)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  pottyStatus === status
                    ? status === 'good'
                      ? 'bg-sage text-white'
                      : status === 'accident'
                        ? 'bg-terracotta text-white'
                        : 'bg-sky text-white'
                    : 'bg-pebble/20 text-bark-light'
                }`}
              >
                {status === 'good' ? '✓ Good' : status === 'accident' ? '⚠ Accident' : '○ None'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label text-xs uppercase tracking-wide">Meals Given</label>
          <input
            type="text"
            value={mealsGiven}
            onChange={(e) => setMealsGiven(e.target.value)}
            placeholder="e.g., Breakfast, Dinner"
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label text-xs uppercase tracking-wide">Behavior Notes</label>
          <textarea
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            placeholder="How was they today? Playful, sleepy, anxious?"
            className="form-input min-h-[80px]"
          />
        </div>

        <div className="form-field">
          <label className="form-label text-xs uppercase tracking-wide">Medications</label>
          <textarea
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            placeholder="Any medications given?"
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label text-xs uppercase tracking-wide">Photos</label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="Report" className="w-20 h-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 bg-terracotta text-white rounded-full p-1"
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-pebble flex items-center justify-center cursor-pointer hover:border-sage">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {uploading ? (
                <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={20} className="text-bark-light" />
              )}
            </label>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label text-xs uppercase tracking-wide">Additional Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else to share?"
            className="form-input min-h-[80px]"
          />
        </div>

        <button
          type="button"
          className="btn-sage mt-2"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : editingReportId ? 'Update Report' : 'Save Report'}
        </button>
      </div>
    </SlideUpSheet>
  );
}
