import { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Empty, InkButton, MemoryCard, Notice, Page, ui } from '../components/SketchUI';
import { dayDate, localDay, monthStats, validDay, type JournalEntry } from '../lib/journal';
import { shareText } from '../lib/backup';
import { useSketchbook } from '../state/Sketchbook';

export default function RecapScreen() {
  const { month: requested } = useLocalSearchParams<{ month?: string }>();
  const month = validDay(`${requested}-01`) ? requested! : localDay().slice(0, 7);
  const book = useSketchbook();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(15);
  const stats = monthStats(
    Object.values(book.records)
      .map((record) => record.saved)
      .filter((entry): entry is JournalEntry => !!entry),
    month,
  );
  const title = dayDate(`${month}-01`)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toLowerCase();
  async function share() {
    setBusy(true);
    setMessage('');
    try {
      const text = `Little Days — ${title}\n\n${stats.days.length} days captured · ${stats.photos} photos · top mood: ${stats.topMood}\n${Object.entries(
        stats.counts,
      )
        .map(([mood, count]) => `${mood}: ${count}`)
        .join(
          ' · ',
        )}\n\n${stats.days.map((entry) => `${entry.date} — ${entry.mood}\n${entry.text}\n${(entry.tags ?? []).map((tag) => `#${tag}`).join(' ')}\n${entry.photos.length} photos${entry.voice ? ', voice note' : ''}`).join('\n\n')}\n\nMade from your own words. Photos and audio are included in the full backup, not this text recap.`;
      await shareText(text, `little-days-${month}-recap.txt`);
      setMessage('recap ready to keep or share.');
    } catch {
      setMessage('could not share the recap. try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="a month to keep" subtitle={title} error={book.error}>
      <Text style={[ui.body, ui.center]}>
        {stats.days.length} little days. {stats.photos} photos.{' '}
        {stats.topMood === 'none yet'
          ? 'room for a beginning.'
          : `a ${stats.topMood === 'a mix' ? 'mix of feelings' : `${stats.topMood} kind of month`}.`}
      </Text>
      <Notice message={message} />
      {stats.days.length ? (
        <>
          <InkButton
            label={busy ? 'preparing...' : 'export text recap'}
            icon="share"
            disabled={busy}
            onPress={() => void share()}
          />
          <Text style={[ui.small, { marginTop: 12, marginBottom: 24 }]}>
            your words, as you wrote them. no invented summaries.
          </Text>
          {stats.days.slice(0, limit).map((entry) => (
            <MemoryCard key={entry.date} entry={entry} />
          ))}
          {stats.days.length > limit ? (
            <InkButton label="show the rest" secondary onPress={() => setLimit(31)} />
          ) : null}
        </>
      ) : (
        <Empty title="a fresh page" body="save a memory to make a recap of this month." />
      )}
    </Page>
  );
}
