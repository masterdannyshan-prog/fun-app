import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import { DoodleMark } from '../components/DoodleDrawing';
import { Empty, IconButton, Page, ui } from '../components/SketchUI';
import { dayDate, localDay, monthDays, STORAGE_PREFIX } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { colors, fonts, moods } from '../theme';

export default function YearScreen() {
  const book = useSketchbook();
  const [month, setMonth] = useState(localDay().slice(0, 7));
  const [picker, setPicker] = useState(false);
  const date = dayDate(`${month}-01`);
  const today = localDay();
  function move(step: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + step);
    if (next.getFullYear() >= 1900 && next.getFullYear() <= 9999)
      setMonth(localDay(next).slice(0, 7));
  }
  const saved = Object.values(book.records).filter((item) =>
    item.saved?.date.startsWith(`${month}-`),
  ).length;
  const letters = book.settings.sunday
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <Page
      title={String(date.getFullYear())}
      tabs
      error={book.error}
      right={<IconButton icon="search" label="Find a day" onPress={() => router.push('/search')} />}
    >
      <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
        <IconButton icon="back" label="Previous month" onPress={() => move(-1)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose month and year"
          onPress={() => setPicker((value) => !value)}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Text style={[ui.heading, { color: colors.cobalt }]}>
            {date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()}
          </Text>
        </Pressable>
        <IconButton icon="arrow" label="Next month" onPress={() => move(1)} />
      </View>
      {picker ? (
        <InkSurface radius={18} style={{ padding: 12, marginBottom: 20 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <IconButton icon="back" label="Previous year" onPress={() => move(-12)} />
            <Text style={ui.heading}>{date.getFullYear()}</Text>
            <IconButton icon="arrow" label="Next year" onPress={() => move(12)} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: 12 }, (_, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                onPress={() => {
                  setMonth(`${date.getFullYear()}-${String(index + 1).padStart(2, '0')}`);
                  setPicker(false);
                }}
                style={{
                  width: '33.33%',
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[ui.body, index === date.getMonth() && { color: colors.cobalt }]}>
                  {new Date(2026, index, 1)
                    .toLocaleDateString('en-US', { month: 'short' })
                    .toLowerCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </InkSurface>
      ) : null}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {letters.map((letter, index) => (
          <Text
            key={index}
            style={{
              width: '14.285%',
              textAlign: 'center',
              fontFamily: fonts.hand,
              fontSize: 19,
              color: colors.ink,
            }}
          >
            {letter}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {monthDays(month, book.settings.sunday).map((day, index) => {
          const entry = day ? book.records[day]?.saved : null;
          const mood = moods.find((item) => item.id === entry?.mood);
          const blocked = !day || day > today || book.corrupt.includes(`${STORAGE_PREFIX}${day}`);
          return (
            <View
              key={day ?? `blank-${index}`}
              style={{ width: '14.285%', padding: 2, marginBottom: 5 }}
            >
              {day ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${day}${entry ? `, ${entry.mood} memory` : book.records[day] ? ', draft' : ', no memory'}${day > today ? ', future day' : ''}`}
                  disabled={blocked}
                  accessibilityState={{ disabled: blocked }}
                  onPress={() => router.push(`/${entry ? 'memory' : 'edit'}/${day}` as Href)}
                  style={({ pressed }) => [pressed && ui.pressed, blocked && { opacity: 0.38 }]}
                >
                  <InkSurface
                    radius={9}
                    fill={mood?.color ?? 'none'}
                    grain={!!entry}
                    stroke={day === today ? colors.cobalt : entry ? 'none' : colors.muted}
                    style={{ height: 78, paddingTop: 5, paddingLeft: 5, alignItems: 'flex-start' }}
                  >
                    <Text style={{ fontFamily: fonts.mono, color: colors.ink, fontSize: 12 }}>
                      {Number(day.slice(8))}
                    </Text>
                    <View style={{ alignSelf: 'center', marginTop: 6 }}>
                      {entry && mood ? (
                        entry.customDoodle?.length ? (
                          <DoodleMark paths={entry.customDoodle} size={37} />
                        ) : (
                          <SketchIcon name={entry.doodle ?? mood.icon} size={32} />
                        )
                      ) : (
                        <Text style={ui.small}>{book.records[day] ? '·' : ''}</Text>
                      )}
                    </View>
                  </InkSurface>
                </Pressable>
              ) : (
                <View style={{ height: 78 }} />
              )}
            </View>
          );
        })}
      </View>
      <InkSurface
        fill="#FFFDF688"
        stroke="none"
        radius={16}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          padding: 10,
          marginTop: 18,
        }}
      >
        {moods.map((mood) => (
          <View key={mood.id} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            <InkSurface
              fill={mood.color}
              stroke="none"
              radius={5}
              style={{ width: 18, height: 22 }}
            />
            <Text style={ui.small}>{mood.label}</Text>
          </View>
        ))}
      </InkSurface>
      <Text style={[ui.small, ui.center, { marginTop: 17 }]}>
        {saved
          ? `${saved} day${saved === 1 ? '' : 's'} tucked away. tap a doodle to remember.`
          : 'a blank page is a beginning. tap a day to write.'}
      </Text>
      {!saved && month === today.slice(0, 7) ? (
        <Empty
          title="your year, one day at a time"
          body="a few words are enough. your first memory will become a little doodle here."
          action="write today"
          onPress={() => router.replace('/')}
          icon="calendar"
        />
      ) : null}
    </Page>
  );
}
