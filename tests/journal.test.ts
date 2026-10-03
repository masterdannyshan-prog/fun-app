import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dayDate,
  emptyDraft,
  localDay,
  parseRecord,
  sameDraft,
  weekDays,
} from '../src/lib/journal.ts';

test('uses local dates and a Monday-first week across month/year boundaries', () => {
  assert.equal(localDay(new Date(2026, 9, 3, 0, 1)), '2026-10-03');
  assert.equal(localDay(dayDate('2026-10-03')), '2026-10-03');
  assert.deepEqual(weekDays('2027-01-03'), [
    '2026-12-28',
    '2026-12-29',
    '2026-12-30',
    '2026-12-31',
    '2027-01-01',
    '2027-01-02',
    '2027-01-03',
  ]);
});
test('reads saved entries and drafts without silently accepting corrupt records', () => {
  const draft = { ...emptyDraft(), text: 'a little memory' };
  const saved = { ...draft, date: '2026-10-03', savedAt: '2026-10-03T12:00:00Z' };
  assert.deepEqual(
    parseRecord(JSON.stringify({ version: 1, draft, saved }), saved.date)?.saved,
    saved,
  );
  assert.equal(parseRecord(null, saved.date), null);
  assert.throws(() => parseRecord('{bad', saved.date));
  assert.throws(() => parseRecord(JSON.stringify({ version: 2, draft, saved }), saved.date));
  assert.throws(() => parseRecord(JSON.stringify({ version: 1, draft, saved }), '2026-10-04'));
  assert.throws(() =>
    parseRecord(
      JSON.stringify({ version: 1, draft: { ...draft, mood: 'unknown' }, saved: null }),
      saved.date,
    ),
  );
});
test('editing a saved mood, text, photo or voice makes the entry unsaved', () => {
  const draft = emptyDraft();
  assert.equal(sameDraft(draft, { ...draft }), true);
  assert.equal(sameDraft(draft, { ...draft, mood: 'calm' }), false);
  assert.equal(sameDraft(draft, { ...draft, text: 'changed' }), false);
  assert.equal(sameDraft(draft, { ...draft, photos: [{ id: '1', uri: 'local' }] }), false);
  assert.equal(
    sameDraft(draft, { ...draft, voice: { id: '1', uri: 'local', duration: 5 } }),
    false,
  );
});
