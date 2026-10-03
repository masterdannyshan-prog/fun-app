import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emptyDraft,
  monthDays,
  monthStats,
  searchEntries,
  validDay,
  weekDays,
  type JournalEntry,
} from '../src/lib/journal.ts';
import {
  defaultSettings,
  parseBackup,
  parseCapsules,
  parseSettings,
  portableData,
} from '../src/lib/sketchbook.ts';

test('portable audio accepts codec parameters and rejects malformed base64 and file paths', () => {
  assert.deepEqual(portableData('data:audio/webm;codecs=opus;base64,AA=='), {
    mime: 'audio/webm',
    base64: 'AA==',
  });
  assert.throws(() => portableData('data:audio/webm;base64,undefined'));
  assert.throws(() => portableData('file:///private/memory.m4a'));
  assert.throws(() => portableData('data:text/html;base64,AA=='));
});
const entry = (
  date: string,
  mood: JournalEntry['mood'],
  text = 'a quiet walk',
  tags = ['outside'],
): JournalEntry => ({ ...emptyDraft(), date, mood, text, tags, savedAt: new Date().toISOString() });
test('rejects impossible dates and makes leap-year grids with the selected week start', () => {
  assert.equal(validDay('2026-02-30'), false);
  assert.equal(validDay('2024-02-29'), true);
  assert.equal(validDay('2026-2-01'), false);
  assert.equal(validDay('0099-01-01'), false);
  const feb = monthDays('2024-02');
  assert.equal(feb.filter(Boolean).length, 29);
  assert.equal(feb.length % 7, 0);
  assert.equal(feb[3], '2024-02-01');
  assert.equal(monthDays('2026-10', true)[4], '2026-10-01');
  assert.equal(weekDays('2027-01-03', true)[0], '2027-01-03');
});
test('search is case-insensitive and combines words, mood, tags and media filters', () => {
  const first = {
    ...entry('2026-10-01', 'calm'),
    photos: [{ id: '1', uri: 'data:image/png;base64,AA==' }],
  };
  const second = {
    ...entry('2026-10-02', 'fun', 'dancing with friends', ['friends']),
    voice: { id: '2', uri: 'data:audio/mp4;base64,AA==', duration: 4 },
  };
  assert.deepEqual(
    searchEntries([first, second], 'QUIET outside', 'calm', 'photos').map((item) => item.date),
    ['2026-10-01'],
  );
  assert.equal(searchEntries([first, second], '', '', 'voice', 'friends').length, 1);
  assert.equal(searchEntries([first, second], 'quiet', 'fun').length, 0);
  assert.equal(searchEntries([first, second], 'october').length, 2);
  assert.equal(searchEntries([first, second], '2026-10-02')[0].date, second.date);
});
test('rewind only counts saved days from the chosen month and handles ties and emptiness', () => {
  const stats = monthStats(
    [entry('2026-10-01', 'calm'), entry('2026-10-02', 'fun'), entry('2026-09-01', 'calm')],
    '2026-10',
  );
  assert.equal(stats.days.length, 2);
  assert.equal(stats.topMood, 'a mix');
  assert.deepEqual(stats.tags, [['outside', 2]]);
  assert.equal(monthStats([], '2026-10').topMood, 'none yet');
});
test('settings and capsule schemas reject corrupt data and future versions', () => {
  assert.deepEqual(parseSettings(null), defaultSettings());
  assert.throws(() => parseSettings(JSON.stringify({ ...defaultSettings(), reminder: '25:00' })));
  assert.throws(() =>
    parseSettings(JSON.stringify({ ...defaultSettings(), defaultDoodle: 'invalid' })),
  );
  assert.throws(() => parseCapsules('{invalid'));
  const capsule = {
    id: 'test',
    title: 'sunshine',
    note: 'hello',
    opens: '2027-01-01',
    created: '2026-10-03',
    memories: [entry('2026-10-01', 'calm')],
  };
  assert.equal(
    parseCapsules(JSON.stringify({ version: 1, capsules: [capsule] }))[0].memories.length,
    1,
  );
  assert.throws(() => parseCapsules(JSON.stringify({ version: 1, capsules: [capsule, capsule] })));
  assert.throws(() =>
    parseCapsules(JSON.stringify({ version: 1, capsules: [{ ...capsule, opens: '2027-02-30' }] })),
  );
});
test('portable backups validate every day, capsule and attachment before importing', () => {
  const saved = entry('2026-10-01', 'calm');
  const records = { [saved.date]: { version: 1, draft: saved, saved } };
  const backup = {
    format: 'little-days',
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
    capsules: [],
  };
  assert.equal(Object.keys(parseBackup(JSON.stringify(backup)).records).length, 1);
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 2 })));
  assert.throws(() =>
    parseBackup(JSON.stringify({ ...backup, records: { invalid: records[saved.date] } })),
  );
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        ...backup,
        records: {
          [saved.date]: {
            ...records[saved.date],
            draft: { ...saved, photos: [{ id: '1', uri: 'file://private/photo.png' }] },
          },
        },
      }),
    ),
  );
});
