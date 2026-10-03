import { useCallback, useState, type SetStateAction } from 'react';
import {
  emptyDraft,
  sameDraft,
  STORAGE_PREFIX,
  type JournalDraft,
  type JournalEntry,
} from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';

export function useJournal(day: string) {
  const book = useSketchbook();
  const [saving, setSaving] = useState(false);
  const record = book.records[day];
  const draft = record?.draft ?? { ...emptyDraft(), doodle: book.settings.defaultDoodle };
  const entries: Record<string, JournalEntry> = {};
  for (const [date, value] of Object.entries(book.records))
    if (value.saved) entries[date] = value.saved;
  const update = book.updateDraft;
  const setDraft = useCallback(
    (action: SetStateAction<JournalDraft>) =>
      update(day, (previous) => (typeof action === 'function' ? action(previous) : action)),
    [day, update],
  );
  async function save() {
    if (saving) return false;
    setSaving(true);
    try {
      return await book.save(day);
    } finally {
      setSaving(false);
    }
  }
  return {
    draft,
    setDraft,
    entries,
    ready: book.ready && !book.corrupt.includes(`${STORAGE_PREFIX}${day}`),
    saving,
    error: book.error,
    save,
    isSaved: !!record?.saved && sameDraft(draft, record.saved),
    retry: () => void book.reload(),
  };
}
