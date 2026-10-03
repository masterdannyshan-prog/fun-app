import { useMemo, useState } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import { Empty, IconButton, MemoryCard, Notice, Page, ui } from '../components/SketchUI';
import { searchEntries, type JournalEntry } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { colors, moods } from '../theme';

export default function SearchScreen() {
  const book = useSketchbook();
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState('');
  const [media, setMedia] = useState('');
  const [tag, setTag] = useState('');
  const [filters, setFilters] = useState('');
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(30);
  const entries = useMemo(
    () =>
      Object.values(book.records)
        .map((item) => item.saved)
        .filter((entry): entry is JournalEntry => !!entry),
    [book.records],
  );
  const results = searchEntries(entries, query, mood, media, tag);
  const tags = [...new Set(entries.flatMap((entry) => entry.tags ?? []))].sort();
  async function remember(value = query) {
    if (!value.trim()) return;
    try {
      await book.configure({
        recents: [
          value.trim().slice(0, 120),
          ...book.settings.recents.filter((item) => item !== value.trim()),
        ].slice(0, 6),
      });
    } catch {
      setMessage('search works, but recent searches could not be kept.');
    }
  }
  return (
    <Page title="find a day" error={book.error}>
      <InkSurface radius={13} style={[ui.row, { paddingHorizontal: 13, paddingVertical: 4 }]}>
        <SketchIcon name="search" size={27} />
        <TextInput
          accessibilityLabel="Search memories"
          placeholder="a word, a feeling, a day..."
          placeholderTextColor={colors.muted}
          maxLength={120}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setLimit(30);
          }}
          onSubmitEditing={() => void remember()}
          returnKeyType="search"
          style={[ui.body, { flex: 1, minHeight: 48 }]}
        />
        {query ? (
          <IconButton icon="close" label="Clear search" onPress={() => setQuery('')} />
        ) : null}
      </InkSurface>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 21 }}>
        {(
          [
            { key: 'mood', icon: 'sun', color: colors.fun },
            { key: 'photos', icon: 'photo', color: colors.calm },
            { key: 'voice', icon: 'mic', color: colors.messy },
            { key: 'tags', icon: 'tag', color: colors.intense },
          ] as const
        ).map((filter) => (
          <Pressable
            key={filter.key}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${filter.key}`}
            accessibilityState={{ selected: filters === filter.key || media === filter.key }}
            onPress={() => {
              setLimit(30);
              if (filter.key === 'photos' || filter.key === 'voice') {
                setMedia(media === filter.key ? '' : filter.key);
                setFilters('');
              } else setFilters(filters === filter.key ? '' : filter.key);
            }}
            style={({ pressed }) => [
              { flex: 1, alignItems: 'center', gap: 5 },
              pressed && ui.pressed,
            ]}
          >
            <InkSurface
              fill={filter.color}
              stroke={filters === filter.key || media === filter.key ? colors.cobalt : 'none'}
              radius={14}
              style={{ width: '100%', height: 70, alignItems: 'center', justifyContent: 'center' }}
            >
              <SketchIcon name={filter.icon} size={45} />
            </InkSurface>
            <Text style={ui.small}>{filter.key}</Text>
          </Pressable>
        ))}
      </View>
      {filters === 'mood' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 }}>
          {moods.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.id} filter`}
              accessibilityState={{ selected: mood === item.id }}
              onPress={() => setMood(mood === item.id ? '' : item.id)}
              style={{ minHeight: 48, padding: 9 }}
            >
              <Text
                style={[
                  ui.body,
                  mood === item.id && { color: colors.cobalt, textDecorationLine: 'underline' },
                ]}
              >
                {item.id}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {filters === 'tags' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {tags.length ? (
            tags.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: tag === item }}
                onPress={() => setTag(tag === item ? '' : item)}
                style={{ minHeight: 48, padding: 9 }}
              >
                <Text style={[ui.body, tag === item && { color: colors.cobalt }]}>#{item}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={ui.small}>add tags while editing a memory.</Text>
          )}
        </View>
      ) : null}
      {mood || media || tag ? (
        <View style={[ui.row, { marginTop: 12 }]}>
          <Text style={[ui.small, { flex: 1 }]}>
            showing {mood} {media} {tag ? `#${tag}` : ''}
          </Text>
          <IconButton
            icon="close"
            label="Clear all filters"
            onPress={() => {
              setMood('');
              setMedia('');
              setTag('');
              setFilters('');
            }}
          />
        </View>
      ) : null}
      {!query && !mood && !media && !tag && book.settings.recents.length ? (
        <>
          <Text style={[ui.heading, ui.section]}>recent searches</Text>
          {book.settings.recents.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => setQuery(item)}
              style={[ui.row, { minHeight: 48 }]}
            >
              <SketchIcon name="rewind" size={23} />
              <Text style={[ui.body, { flex: 1 }]}>{item}</Text>
              <SketchIcon name="arrow" size={23} />
            </Pressable>
          ))}
        </>
      ) : null}
      <Notice message={message} />
      <Text style={[ui.heading, ui.section]}>
        {results.length} {results.length === 1 ? 'little day' : 'little days'}
      </Text>
      {results.slice(0, limit).map((entry) => (
        <MemoryCard
          key={entry.date}
          entry={entry}
          onPress={() => {
            void remember();
            router.push(`/memory/${entry.date}` as Href);
          }}
        />
      ))}
      {results.length > limit ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setLimit((value) => value + 30)}
          style={{ minHeight: 48 }}
        >
          <Text style={[ui.body, ui.center, { color: colors.cobalt }]}>show more days</Text>
        </Pressable>
      ) : null}
      {!results.length ? (
        <Empty
          title={entries.length ? 'no days found' : 'your story starts here'}
          body={
            entries.length
              ? 'try a different word or clear the filters.'
              : 'saved memories will appear here. you can find them by words, mood, photos, voice, or tags.'
          }
          icon="search"
        />
      ) : null}
    </Page>
  );
}
