import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import {
  Empty,
  IconButton,
  InkButton,
  LinkText,
  MemoryCard,
  Page,
  ui,
} from '../components/SketchUI';
import { dayDate, localDay, monthStats, type JournalEntry } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { colors, fonts, moods } from '../theme';

export default function RewindScreen() {
  const book = useSketchbook();
  const [month, setMonth] = useState(localDay().slice(0, 7));
  const entries = useMemo(
    () =>
      Object.values(book.records)
        .map((record) => record.saved)
        .filter((entry): entry is JournalEntry => !!entry),
    [book.records],
  );
  const stats = monthStats(entries, month);
  const date = dayDate(`${month}-01`);
  const name = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  function move(step: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + step);
    if (next.getFullYear() >= 1900 && next.getFullYear() <= 9999)
      setMonth(localDay(next).slice(0, 7));
  }
  const topMood = moods.find((item) => item.id === stats.topMood);
  return (
    <Page
      title="rewind"
      tabs
      subtitle={`your ${name} ${date.getFullYear()}, in little moments`}
      error={book.error}
    >
      <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
        <IconButton icon="back" label="Previous rewind month" onPress={() => move(-1)} />
        <Text style={ui.body}>
          {name} {date.getFullYear()}
        </Text>
        <IconButton icon="arrow" label="Next rewind month" onPress={() => move(1)} />
      </View>
      <InkSurface
        radius={19}
        style={{ flexDirection: 'row', paddingVertical: 22, paddingHorizontal: 4 }}
      >
        {[
          { icon: 'calendar', value: String(stats.days.length), label: 'days captured' },
          { icon: topMood?.icon ?? 'scribble', value: stats.topMood, label: 'top mood' },
          { icon: 'camera', value: String(stats.photos), label: 'photos kept' },
        ].map((item) => (
          <View key={item.label} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            <SketchIcon name={item.icon as 'calendar'} size={42} />
            <Text
              style={{
                fontFamily: fonts.hand,
                fontSize: 29,
                color: colors.ink,
                textAlign: 'center',
              }}
            >
              {item.value}
            </Text>
            <Text style={[ui.small, ui.center]}>{item.label}</Text>
          </View>
        ))}
      </InkSurface>
      <Text accessibilityRole="header" style={[ui.heading, ui.section]}>
        your moods
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 10 }}>
        {moods.map((mood) => (
          <View
            key={mood.id}
            accessible
            accessibilityLabel={`${mood.id}: ${stats.counts[mood.id]} days`}
            style={{ flex: 1, alignItems: 'center', gap: 6 }}
          >
            <Text style={ui.small}>{stats.counts[mood.id]}</Text>
            <InkSurface
              fill={mood.color}
              stroke={colors.ink}
              strokeWidth={1}
              grain
              radius={8}
              style={{
                width: '100%',
                height: stats.days.length
                  ? Math.max(
                      12,
                      (stats.counts[mood.id] / Math.max(...Object.values(stats.counts))) * 140,
                    )
                  : 12,
              }}
            />
            <SketchIcon name={mood.icon} size={25} />
            <Text style={ui.small}>{mood.label}</Text>
          </View>
        ))}
      </View>
      {!stats.days.length ? (
        <Empty
          title="no rush to fill the page"
          body="your saved days will become a small picture of this month. every kind of day belongs here."
          action="write today"
          onPress={() => router.replace('/')}
          icon="moon"
        />
      ) : (
        <>
          <Text accessibilityRole="header" style={[ui.heading, ui.section]}>
            little things worth keeping
          </Text>
          {stats.tags.length
            ? stats.tags.slice(0, 4).map(([tag, count], index) => (
                <View key={tag} style={[ui.row, { marginBottom: 12 }]}>
                  <SketchIcon
                    name={['mug', 'shoe', 'headphones', 'book'][index] as 'mug'}
                    size={33}
                  />
                  <Text style={[ui.body, { flex: 1 }]}>#{tag}</Text>
                  <Text style={ui.small}>
                    {count} {count === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              ))
            : stats.days
                .slice(-2)
                .reverse()
                .map((entry) => <MemoryCard key={entry.date} entry={entry} />)}
          <InkButton
            label={`make a ${name} recap`}
            secondary
            icon="book"
            onPress={() => router.push({ pathname: '/recap', params: { month } })}
          />
        </>
      )}
      <LinkText onPress={() => router.push('/capsules')}>my time capsules</LinkText>
    </Page>
  );
}
