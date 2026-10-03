import {
  doodles,
  parseRecord,
  validDay,
  type Doodle,
  type JournalEntry,
  type JournalRecord,
} from './journal.ts';
export const META_KEY = '@little-days/settings/v1';
export const CAPSULE_KEY = '@little-days/capsules/v1';
export type Settings = {
  version: 1;
  onboarded: boolean;
  sunday: boolean;
  writing: 'mono' | 'hand';
  reminder: string | null;
  lock: boolean;
  recents: string[];
  defaultDoodle?: Doodle;
};
export const defaultSettings = (): Settings => ({
  version: 1,
  onboarded: false,
  sunday: false,
  writing: 'mono',
  reminder: null,
  lock: false,
  recents: [],
});
export type Capsule = {
  id: string;
  title: string;
  note: string;
  opens: string;
  created: string;
  memories: JournalEntry[];
};
export function parseSettings(raw: string | null): Settings {
  if (!raw) return defaultSettings();
  const value = JSON.parse(raw) as Settings;
  if (
    value.version !== 1 ||
    typeof value.onboarded !== 'boolean' ||
    typeof value.sunday !== 'boolean' ||
    !['mono', 'hand'].includes(value.writing) ||
    typeof value.lock !== 'boolean' ||
    (value.defaultDoodle !== undefined && !doodles.includes(value.defaultDoodle)) ||
    !(
      value.reminder === null ||
      (typeof value.reminder === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.reminder))
    ) ||
    !Array.isArray(value.recents) ||
    value.recents.length > 8 ||
    !value.recents.every((item) => typeof item === 'string' && item.length <= 120)
  )
    throw new Error('Settings could not be read.');
  return value;
}
export function parseCapsules(raw: string | null): Capsule[] {
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (value.version !== 1 || !Array.isArray(value.capsules))
    throw new Error('Capsules could not be read.');
  const ids = new Set<string>();
  for (const capsule of value.capsules) {
    if (
      typeof capsule.id !== 'string' ||
      ids.has(capsule.id) ||
      typeof capsule.title !== 'string' ||
      !capsule.title.trim() ||
      capsule.title.length > 80 ||
      typeof capsule.note !== 'string' ||
      capsule.note.length > 5000 ||
      !validDay(capsule.opens) ||
      !validDay(capsule.created) ||
      !Array.isArray(capsule.memories)
    )
      throw new Error('Invalid capsule.');
    ids.add(capsule.id);
    for (const entry of capsule.memories) {
      if (!validDay(entry.date)) throw new Error('Invalid memory date.');
      parseRecord(JSON.stringify({ version: 1, draft: entry, saved: entry }), entry.date);
    }
  }
  return value.capsules;
}
export type Backup = {
  format: 'little-days';
  version: 1;
  exportedAt: string;
  records: Record<string, JournalRecord>;
  capsules: Capsule[];
};
export function portableData(uri: string): { mime: string; base64: string } {
  // MediaRecorder data URLs can include a codecs parameter before base64.
  const match =
    /^data:((?:image|audio)\/[^;,]+|video\/webm)(?:;[^;,]+)*;base64,([A-Za-z0-9+/\r\n]+={0,2})$/.exec(
      uri,
    );
  if (!match || match[2].replace(/\s/g, '').length % 4 !== 0)
    throw new Error('Invalid portable attachment data.');
  return { mime: match[1], base64: match[2].replace(/\s/g, '') };
}
export function parseBackup(raw: string): Backup {
  const value = JSON.parse(raw) as Backup;
  if (
    value.format !== 'little-days' ||
    value.version !== 1 ||
    typeof value.records !== 'object' ||
    !value.records ||
    Array.isArray(value.records) ||
    typeof value.exportedAt !== 'string'
  )
    throw new Error('Not a supported Little Days backup.');
  for (const [day, record] of Object.entries(value.records)) {
    if (!validDay(day)) throw new Error('Invalid memory date.');
    parseRecord(JSON.stringify(record), day);
    for (const draft of [record.draft, record.saved].filter(Boolean)) {
      for (const media of [...draft!.photos, ...(draft!.voice ? [draft!.voice] : [])]) {
        portableData(media.uri);
      }
    }
  }
  parseCapsules(JSON.stringify({ version: 1, capsules: value.capsules }));
  for (const capsule of value.capsules)
    for (const entry of capsule.memories) {
      for (const media of [...entry.photos, ...(entry.voice ? [entry.voice] : [])])
        portableData(media.uri);
    }
  return value;
}
