import type { Mood } from '../theme';

export type Attachment = { id: string; uri: string };
export type VoiceNote = Attachment & { duration: number };
export const doodles = [
  'wave',
  'sun',
  'scribble',
  'mountain',
  'mug',
  'headphones',
  'book',
  'shoe',
  'cloud',
  'camera',
  'moon',
] as const;
export type Doodle = (typeof doodles)[number];
export type JournalDraft = {
  mood: Mood;
  text: string;
  photos: Attachment[];
  voice: VoiceNote | null;
  tags?: string[];
  doodle?: Doodle;
  customDoodle?: string[];
};
export type JournalEntry = JournalDraft & { date: string; savedAt: string };
export type JournalRecord = { version: 1; draft: JournalDraft; saved: JournalEntry | null };
export const STORAGE_PREFIX = '@little-days/v1/';
export const emptyDraft = (): JournalDraft => ({ mood: 'fun', text: '', photos: [], voice: null });

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}
export function weekDays(day: string, sunday = false): string[] {
  const start = dayDate(day);
  start.setDate(start.getDate() - (sunday ? start.getDay() : (start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDay(date);
  });
}
function isAttachment(value: unknown): value is Attachment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'uri' in value &&
    typeof value.uri === 'string'
  );
}
function isDraft(value: unknown): value is JournalDraft {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as JournalDraft;
  return (
    ['calm', 'fun', 'messy', 'intense'].includes(draft.mood) &&
    typeof draft.text === 'string' &&
    Array.isArray(draft.photos) &&
    draft.photos.length <= 3 &&
    draft.photos.every(isAttachment) &&
    (draft.tags === undefined ||
      (Array.isArray(draft.tags) &&
        draft.tags.length <= 8 &&
        draft.tags.every((tag) => typeof tag === 'string' && tag.length <= 30))) &&
    (draft.doodle === undefined || doodles.includes(draft.doodle)) &&
    (draft.customDoodle === undefined ||
      (Array.isArray(draft.customDoodle) &&
        draft.customDoodle.length <= 40 &&
        draft.customDoodle.every(
          (path) => typeof path === 'string' && path.length > 0 && path.length <= 4000,
        ))) &&
    (draft.voice === null ||
      (isAttachment(draft.voice) &&
        typeof draft.voice.duration === 'number' &&
        Number.isFinite(draft.voice.duration) &&
        draft.voice.duration >= 0))
  );
}
// Never silently overwrite unreadable or future-version journal data.
export function parseRecord(raw: string | null, day: string): JournalRecord | null {
  if (raw === null) return null;
  const record = JSON.parse(raw) as JournalRecord;
  if (
    record?.version !== 1 ||
    !isDraft(record.draft) ||
    (record.saved !== null &&
      (!isDraft(record.saved) ||
        record.saved.date !== day ||
        typeof record.saved.savedAt !== 'string'))
  ) {
    throw new Error('This journal record cannot be read.');
  }
  return record;
}
export function sameDraft(a: JournalDraft, b: JournalDraft): boolean {
  return (
    a.mood === b.mood &&
    a.text === b.text &&
    JSON.stringify(a.photos) === JSON.stringify(b.photos) &&
    JSON.stringify(a.voice) === JSON.stringify(b.voice) &&
    JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? []) &&
    a.doodle === b.doodle &&
    JSON.stringify(a.customDoodle ?? []) === JSON.stringify(b.customDoodle ?? [])
  );
}

export function validDay(day: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    localDay(dayDate(day)) === day &&
    day >= '1900-01-01' &&
    day <= '9999-12-31'
  );
}
export function monthDays(month: string, sunday = false): (string | null)[] {
  const first = dayDate(`${month}-01`);
  const offset = sunday ? first.getDay() : (first.getDay() + 6) % 7;
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const days: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= count; day++) days.push(`${month}-${String(day).padStart(2, '0')}`);
  while (days.length % 7) days.push(null);
  return days;
}
export function searchEntries(
  entries: JournalEntry[],
  query: string,
  mood = '',
  media = '',
  tag = '',
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter(
      (entry) =>
        (!mood || entry.mood === mood) &&
        (!media || (media === 'photos' ? entry.photos.length > 0 : entry.voice !== null)) &&
        (!tag || entry.tags?.includes(tag)) &&
        terms.every((term) =>
          `${entry.text} ${(entry.tags ?? []).join(' ')} ${entry.date} ${dayDate(entry.date).toLocaleDateString('en-US', { month: 'long', weekday: 'long' })}`
            .toLowerCase()
            .includes(term),
        ),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function monthStats(entries: JournalEntry[], month: string) {
  const days = entries
    .filter((entry) => entry.date.startsWith(`${month}-`))
    .sort((a, b) => a.date.localeCompare(b.date));
  const counts = { calm: 0, fun: 0, messy: 0, intense: 0 };
  const tags: Record<string, number> = {};
  for (const entry of days) {
    counts[entry.mood]++;
    for (const tag of entry.tags ?? []) tags[tag] = (tags[tag] ?? 0) + 1;
  }
  const max = Math.max(...Object.values(counts));
  const top = Object.keys(counts).filter((key) => counts[key as Mood] === max);
  return {
    days,
    counts,
    photos: days.reduce((total, entry) => total + entry.photos.length, 0),
    topMood: max === 0 ? 'none yet' : top.length > 1 ? 'a mix' : top[0],
    tags: Object.entries(tags).sort((a, b) => b[1] - a[1]),
  };
}
