import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform, View, Text, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '../lib/storage';
import {
  emptyDraft,
  localDay,
  parseRecord,
  STORAGE_PREFIX,
  validDay,
  type JournalDraft,
  type JournalRecord,
} from '../lib/journal';
import {
  CAPSULE_KEY,
  META_KEY,
  defaultSettings,
  parseCapsules,
  parseSettings,
  type Capsule,
  type Settings,
} from '../lib/sketchbook';
import { colors, fonts } from '../theme';
import { InkButton } from '../components/SketchUI';

let writes = Promise.resolve();
function queued<T>(work: () => Promise<T>): Promise<T> {
  const next = writes.catch(() => {}).then(work);
  writes = next.then(() => {});
  void writes.catch(() => {});
  return next;
}
type Book = {
  records: Record<string, JournalRecord>;
  settings: Settings;
  capsules: Capsule[];
  ready: boolean;
  error: string;
  corrupt: string[];
  pending: number;
  reload: () => Promise<void>;
  updateDraft: (day: string, update: (previous: JournalDraft) => JournalDraft) => void;
  save: (day: string) => Promise<boolean>;
  remove: (day: string) => Promise<void>;
  configure: (change: Partial<Settings>) => Promise<void>;
  putCapsules: (capsules: Capsule[]) => Promise<void>;
  importRecords: (records: Record<string, JournalRecord>, capsules: Capsule[]) => Promise<number>;
  flush: () => Promise<void>;
};
const Context = createContext<Book | null>(null);
export function useSketchbook() {
  const value = useContext(Context);
  if (!value) throw new Error('Sketchbook provider is missing.');
  return value;
}
export function SketchbookProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, JournalRecord>>({});
  const current = useRef<Record<string, JournalRecord>>({});
  const [settings, setSettings] = useState(defaultSettings);
  const config = useRef(defaultSettings());
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [corrupt, setCorrupt] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [lockError, setLockError] = useState('');
  const reload = useCallback(async () => {
    try {
      await writes.catch(() => {});
      setError('');
      const keys = (await storage.getAllKeys()).filter((key) => key.startsWith(STORAGE_PREFIX));
      const rows = await Promise.all(
        keys.map(async (key) => [key, await storage.getItem(key)] as const),
      );
      const next: Record<string, JournalRecord> = {};
      const broken: string[] = [];
      for (const [key, raw] of rows) {
        const date = key.slice(STORAGE_PREFIX.length);
        try {
          if (!validDay(date)) throw new Error();
          const record = parseRecord(raw, date);
          if (record) next[date] = record;
        } catch {
          broken.push(key);
        }
      }
      let nextConfig = defaultSettings();
      try {
        nextConfig = parseSettings(await storage.getItem(META_KEY));
      } catch {
        broken.push(META_KEY);
      }
      let nextCapsules: Capsule[] = [];
      try {
        nextCapsules = parseCapsules(await storage.getItem(CAPSULE_KEY));
      } catch {
        broken.push(CAPSULE_KEY);
      }
      current.current = next;
      config.current = nextConfig;
      setRecords(next);
      setSettings(nextConfig);
      setCapsules(nextCapsules);
      setCorrupt(broken);
      setReady(true);
      if (broken.length)
        setError(
          'some stored data could not be read. it has not been overwritten. export a recovery copy in settings.',
        );
      if (Platform.OS !== 'web' && nextConfig.lock) setLocked(true);
    } catch {
      setError(
        'could not open device storage. close other tabs and try again. your memories have not been changed.',
      );
    }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return reload();
    });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'background' && config.current.lock && Platform.OS !== 'web') setLocked(true);
    });
    return () => listener.remove();
  }, []);
  function assertWritable(day: string) {
    if (!ready || !validDay(day) || day > localDay() || corrupt.includes(`${STORAGE_PREFIX}${day}`))
      throw new Error('This day cannot be edited.');
  }
  function updateDraft(day: string, update: (previous: JournalDraft) => JournalDraft) {
    try {
      assertWritable(day);
      const record = current.current[day] ?? {
        version: 1 as const,
        draft: { ...emptyDraft(), doodle: config.current.defaultDoodle },
        saved: null,
      };
      const next = { ...record, draft: update(record.draft) };
      current.current = { ...current.current, [day]: next };
      setRecords(current.current);
      setPending((count) => count + 1);
      void queued(() => storage.setItem(`${STORAGE_PREFIX}${day}`, JSON.stringify(next)))
        .then(() =>
          setError(
            corrupt.length
              ? 'some stored data could not be read. it has not been overwritten. export a recovery copy in settings.'
              : '',
          ),
        )
        .catch(() =>
          setError(
            'your latest draft could not be stored. your words are still here; try saving again.',
          ),
        )
        .finally(() => setPending((count) => count - 1));
    } catch {
      setError('this memory is read-only until the storage problem is resolved.');
    }
  }
  async function save(day: string) {
    try {
      assertWritable(day);
      const draft = current.current[day]?.draft ?? {
        ...emptyDraft(),
        doodle: config.current.defaultDoodle,
      };
      const saved = { ...draft, date: day, savedAt: new Date().toISOString() };
      const next: JournalRecord = { version: 1, draft, saved };
      await queued(() => storage.setItem(`${STORAGE_PREFIX}${day}`, JSON.stringify(next)));
      current.current = {
        ...current.current,
        [day]: { ...next, draft: current.current[day]?.draft ?? draft },
      };
      setRecords(current.current);
      setError(
        corrupt.length
          ? 'some stored data could not be read. it has not been overwritten. export a recovery copy in settings.'
          : '',
      );
      return true;
    } catch {
      setError('could not save this day. your words are still here — please try again.');
      return false;
    }
  }
  async function remove(day: string) {
    assertWritable(day);
    await queued(() => storage.removeItem(`${STORAGE_PREFIX}${day}`));
    const next = { ...current.current };
    delete next[day];
    current.current = next;
    setRecords(next);
  }
  async function configure(change: Partial<Settings>) {
    if (corrupt.includes(META_KEY))
      throw new Error('Stored settings are unreadable; export a recovery copy first.');
    await queued(async () => {
      const next = parseSettings(JSON.stringify({ ...config.current, ...change, version: 1 }));
      await storage.setItem(META_KEY, JSON.stringify(next));
      config.current = next;
      setSettings(next);
    });
  }
  async function putCapsules(next: Capsule[]) {
    if (corrupt.includes(CAPSULE_KEY))
      throw new Error('Stored capsules are unreadable; export a recovery copy first.');
    parseCapsules(JSON.stringify({ version: 1, capsules: next }));
    await queued(() =>
      storage.setItem(CAPSULE_KEY, JSON.stringify({ version: 1, capsules: next })),
    );
    setCapsules(next);
  }
  async function importRecords(
    incoming: Record<string, JournalRecord>,
    incomingCapsules: Capsule[],
  ) {
    let count = 0;
    for (const [day, record] of Object.entries(incoming)) {
      if (current.current[day] || corrupt.includes(`${STORAGE_PREFIX}${day}`)) continue;
      await queued(() => storage.setItem(`${STORAGE_PREFIX}${day}`, JSON.stringify(record)));
      current.current = { ...current.current, [day]: record };
      setRecords(current.current);
      count++;
    }
    const ids = new Set(capsules.map((item) => item.id));
    await putCapsules([...capsules, ...incomingCapsules.filter((item) => !ids.has(item.id))]);
    return count;
  }
  async function unlock() {
    setUnlocking(true);
    setLockError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Open your sketchbook',
        cancelLabel: 'Keep closed',
      });
      if (result.success) setLocked(false);
      else setLockError('not unlocked. try again when you’re ready.');
    } catch {
      setLockError('device authentication is unavailable. check your device lock settings.');
    } finally {
      setUnlocking(false);
    }
  }
  const value: Book = {
    records,
    settings,
    capsules,
    ready,
    error,
    corrupt,
    pending,
    reload,
    updateDraft,
    save,
    remove,
    configure,
    putCapsules,
    importRecords,
    flush: () => writes,
  };
  return (
    <Context.Provider value={value}>
      {!ready || locked ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 30,
            gap: 22,
            backgroundColor: colors.paper,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.handLight,
              fontSize: 40,
              color: colors.ink,
              textAlign: 'center',
            }}
          >
            {locked ? 'your little sketchbook' : 'opening your days...'}
          </Text>
          {locked ? (
            <InkButton
              label={unlocking ? 'opening...' : 'unlock sketchbook'}
              disabled={unlocking}
              onPress={() => void unlock()}
            />
          ) : error ? (
            <InkButton label="try again" onPress={() => void reload()} />
          ) : (
            <ActivityIndicator color={colors.cobalt} />
          )}
          <Text
            accessibilityLiveRegion="polite"
            style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 22, color: colors.error }}
          >
            {locked ? lockError : error}
          </Text>
        </View>
      ) : (
        children
      )}
    </Context.Provider>
  );
}
