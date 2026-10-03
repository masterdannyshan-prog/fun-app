import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { storage } from './storage';
import { type JournalDraft, type JournalEntry, type JournalRecord } from './journal';
import { parseBackup, portableData, type Backup, type Capsule } from './sketchbook';

async function portable(draft: JournalDraft): Promise<JournalDraft> {
  async function read(uri: string, audio = false) {
    if (uri.startsWith('data:')) return uri;
    if (Platform.OS === 'web') throw new Error('An attachment is missing. Nothing was exported.');
    const extension = uri.split('.').pop()?.toLowerCase();
    const mime = audio
      ? extension === 'webm'
        ? 'audio/webm'
        : extension === 'wav'
          ? 'audio/wav'
          : 'audio/mp4'
      : extension === 'png'
        ? 'image/png'
        : 'image/jpeg';
    return `data:${mime};base64,${await new File(uri).base64()}`;
  }
  return {
    ...draft,
    photos: await Promise.all(
      draft.photos.map(async (item) => ({ ...item, uri: await read(item.uri) })),
    ),
    voice: draft.voice ? { ...draft.voice, uri: await read(draft.voice.uri, true) } : null,
  };
}
export async function exportBook(records: Record<string, JournalRecord>, capsules: Capsule[]) {
  const portableRecords: Record<string, JournalRecord> = {};
  for (const [day, record] of Object.entries(records))
    portableRecords[day] = {
      version: 1,
      draft: await portable(record.draft),
      saved: record.saved
        ? { ...(await portable(record.saved)), date: day, savedAt: record.saved.savedAt }
        : null,
    };
  const portableCapsules: Capsule[] = [];
  for (const capsule of capsules)
    portableCapsules.push({
      ...capsule,
      memories: await Promise.all(
        capsule.memories.map(async (entry) => ({
          ...(await portable(entry)),
          date: entry.date,
          savedAt: entry.savedAt,
        })),
      ),
    });
  const backup: Backup = {
    format: 'little-days',
    version: 1,
    exportedAt: new Date().toISOString(),
    records: portableRecords,
    capsules: portableCapsules,
  };
  parseBackup(JSON.stringify(backup));
  await shareText(
    JSON.stringify(backup),
    `little-days-${new Date().toISOString().slice(0, 10)}.backup.json`,
    'application/json',
  );
}
export async function shareText(text: string, name: string, mime = 'text/plain') {
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing is not available on this device.');
  const file = new File(Paths.cache, name);
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: mime,
    dialogTitle: 'Keep a copy of your Little Days',
  });
}
export async function pickBackup(): Promise<Backup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if ((asset.size ?? 0) > 80_000_000) throw new Error('Choose a backup under 80 MB.');
  const raw =
    Platform.OS === 'web'
      ? await (await fetch(asset.uri)).text()
      : await new File(asset.uri).text();
  const backup = parseBackup(raw);
  if (Platform.OS === 'web') return backup;
  const restored = new Map<string, string>();
  async function restore(draft: JournalDraft): Promise<JournalDraft> {
    async function media(uri: string) {
      if (restored.has(uri)) return restored.get(uri)!;
      const data = portableData(uri);
      const extension = data.mime.includes('png')
        ? 'png'
        : data.mime.includes('image')
          ? 'jpg'
          : data.mime.includes('webm')
            ? 'webm'
            : data.mime.includes('wav')
              ? 'wav'
              : 'm4a';
      const file = new File(
        Paths.document,
        `little-days-import-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
      );
      const binary = atob(data.base64);
      file.write(Uint8Array.from(binary, (letter) => letter.charCodeAt(0)));
      restored.set(uri, file.uri);
      return file.uri;
    }
    return {
      ...draft,
      photos: await Promise.all(
        draft.photos.map(async (item) => ({ ...item, uri: await media(item.uri) })),
      ),
      voice: draft.voice ? { ...draft.voice, uri: await media(draft.voice.uri) } : null,
    };
  }
  for (const [day, record] of Object.entries(backup.records))
    backup.records[day] = {
      ...record,
      draft: await restore(record.draft),
      saved: record.saved
        ? ({
            ...(await restore(record.saved)),
            date: day,
            savedAt: record.saved.savedAt,
          } as JournalEntry)
        : null,
    };
  for (const capsule of backup.capsules)
    capsule.memories = await Promise.all(
      capsule.memories.map(async (entry) => ({
        ...(await restore(entry)),
        date: entry.date,
        savedAt: entry.savedAt,
      })),
    );
  return backup;
}
export async function exportRecovery() {
  const keys = (await storage.getAllKeys()).filter((key) => key.startsWith('@little-days/'));
  const raw: Record<string, string | null> = {};
  for (const key of keys) raw[key] = await storage.getItem(key);
  await shareText(
    JSON.stringify({ format: 'little-days-recovery', version: 1, raw }),
    'little-days-recovery.json',
    'application/json',
  );
}
