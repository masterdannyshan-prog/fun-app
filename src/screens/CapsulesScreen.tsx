import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import {
  Confirm,
  Empty,
  Field,
  IconButton,
  InkButton,
  LinkText,
  MemoryCard,
  Notice,
  Page,
  ui,
} from '../components/SketchUI';
import { dayDate, localDay, validDay, type JournalEntry } from '../lib/journal';
import { attachmentId } from '../lib/media';
import { type Capsule } from '../lib/sketchbook';
import { useSketchbook } from '../state/Sketchbook';
import { colors, fonts } from '../theme';

export default function CapsulesScreen() {
  const book = useSketchbook();
  const { memory, create } = useLocalSearchParams<{ memory?: string; create?: string }>();
  const [making, setMaking] = useState(create === 'yes');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  const [opens, setOpens] = useState(localDay(future));
  const [selected, setSelected] = useState<string[]>(
    memory && book.records[memory]?.saved ? [memory] : [],
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<Capsule | null>(null);
  const [deleting, setDeleting] = useState<Capsule | null>(null);
  const [today, setToday] = useState(localDay);
  const [limit, setLimit] = useState(15);
  useEffect(() => {
    const timer = setInterval(() => setToday(localDay()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const entries = Object.values(book.records)
    .map((record) => record.saved)
    .filter((entry): entry is JournalEntry => !!entry)
    .sort((a, b) => b.date.localeCompare(a.date));
  async function seal() {
    if (!title.trim()) {
      setMessage('give your capsule a little name.');
      return;
    }
    if (!validDay(opens) || opens <= localDay()) {
      setMessage('choose a future date in YYYY-MM-DD format.');
      return;
    }
    if (!note.trim() && !selected.length) {
      setMessage('add a note or choose at least one memory.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const capsule: Capsule = {
        id: attachmentId(),
        title: title.trim(),
        note: note.trim(),
        opens,
        created: localDay(),
        memories: entries
          .filter((entry) => selected.includes(entry.date))
          .map((entry) => JSON.parse(JSON.stringify(entry))),
      };
      await book.putCapsules([...book.capsules, capsule]);
      setMaking(false);
      setTitle('');
      setNote('');
      setSelected([]);
      setMessage('sealed for a future you. keep a backup so it travels with you.');
    } catch {
      setMessage('could not seal this capsule. your note is still here. try again.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await book.putCapsules(book.capsules.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      setOpened(null);
      setMessage('capsule deleted. your original journal memories are still here.');
    } catch {
      setMessage('could not delete the capsule. try again.');
    } finally {
      setBusy(false);
    }
  }
  if (opened)
    return (
      <Page
        title="a note from you"
        subtitle={`sealed ${dayDate(opened.created).toLocaleDateString('en-US')}`}
        right={
          <IconButton
            icon="trash"
            label="Delete this capsule"
            onPress={() => setDeleting(opened)}
          />
        }
      >
        <Text style={[ui.heading, ui.center]}>{opened.title}</Text>
        <InkSurface
          fill={colors.calm}
          stroke="none"
          grain
          radius={20}
          style={{ padding: 24, marginTop: 24 }}
        >
          <Text selectable style={ui.body}>
            {opened.note || 'some days you wanted to remember.'}
          </Text>
        </InkSurface>
        <Text style={[ui.heading, ui.section]}>tucked inside</Text>
        {opened.memories.map((entry) => (
          <MemoryCard
            key={entry.date}
            entry={entry}
            onPress={() =>
              router.push({
                pathname: '/capsule-memory',
                params: { capsule: opened.id, day: entry.date },
              })
            }
          />
        ))}
        <LinkText onPress={() => setOpened(null)}>back to my capsules</LinkText>
        <Notice message={message} />
        <Confirm
          visible={!!deleting}
          title="let this capsule go?"
          body="this deletes the capsule’s note and memory copies. original journal entries stay untouched."
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
          busy={busy}
        />
      </Page>
    );
  return (
    <Page title="open later" error={book.error}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 12,
        }}
      >
        <View style={{ transform: [{ rotate: '-11deg' }] }}>
          <InkSurface
            fill={colors.calm}
            stroke="none"
            grain
            radius={5}
            style={{ width: 136, height: 118, alignItems: 'center', justifyContent: 'center' }}
          >
            <SketchIcon name="envelope" size={108} />
            <Text style={{ fontFamily: fonts.hand, fontSize: 18, color: colors.ink }}>
              a future you
            </Text>
          </InkSurface>
        </View>
        <View style={{ transform: [{ rotate: '9deg' }], marginTop: 26 }}>
          <InkSurface
            fill={colors.messy}
            stroke="none"
            grain
            radius={5}
            style={{ width: 128, height: 116, alignItems: 'center', justifyContent: 'center' }}
          >
            <SketchIcon name="envelope" size={103} />
            <Text style={{ fontFamily: fonts.hand, fontSize: 18, color: colors.ink }}>
              something to keep
            </Text>
          </InkSurface>
        </View>
      </View>
      <Text style={[ui.body, ui.center, { marginVertical: 25 }]}>
        leave a memory for your future self.
      </Text>
      <Notice message={message} />
      {making ? (
        <InkSurface radius={22} style={{ padding: 18 }}>
          <Text style={[ui.heading, { marginBottom: 16 }]}>a little letter to later</Text>
          <Field
            label="capsule name"
            placeholder="when i need a little sunshine"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            editable={!busy}
          />
          <Field
            label="opens on (YYYY-MM-DD)"
            value={opens}
            onChangeText={setOpens}
            maxLength={10}
            editable={!busy}
          />
          <Field
            label="a note for future you"
            value={note}
            onChangeText={setNote}
            placeholder="dear future me..."
            multiline
            maxLength={5000}
            editable={!busy}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <Text style={[ui.body, { marginBottom: 12 }]}>
            choose days to tuck inside ({selected.length})
          </Text>
          {entries.slice(0, limit).map((entry) => (
            <Pressable
              key={entry.date}
              accessibilityRole="checkbox"
              accessibilityLabel={`Include memory ${entry.date}`}
              accessibilityState={{ checked: selected.includes(entry.date) }}
              disabled={busy}
              onPress={() =>
                setSelected((previous) =>
                  previous.includes(entry.date)
                    ? previous.filter((day) => day !== entry.date)
                    : [...previous, entry.date],
                )
              }
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 56,
                  marginBottom: 8,
                },
                pressed && ui.pressed,
              ]}
            >
              <SketchIcon
                name={selected.includes(entry.date) ? 'check' : 'calendar'}
                size={28}
                color={selected.includes(entry.date) ? colors.cobalt : colors.ink}
              />
              <View style={{ flex: 1 }}>
                <Text style={ui.small}>{entry.date}</Text>
                <Text numberOfLines={1} style={ui.body}>
                  {entry.text || `a ${entry.mood} day`}
                </Text>
              </View>
            </Pressable>
          ))}
          {entries.length > limit ? (
            <LinkText onPress={() => setLimit((value) => value + 15)}>show more days</LinkText>
          ) : null}
          {!entries.length ? (
            <Text style={ui.small}>no saved memories yet. a letter on its own is lovely too.</Text>
          ) : null}
          <InkButton
            label={busy ? 'sealing...' : 'seal for later'}
            icon="lock"
            disabled={busy}
            onPress={() => void seal()}
          />
          <LinkText
            onPress={() => {
              if (!busy) setMaking(false);
            }}
          >
            cancel, keep my note here
          </LinkText>
        </InkSurface>
      ) : (
        <InkButton
          label="make a time capsule"
          icon="envelope"
          onPress={() => {
            setMaking(true);
            setMessage('');
          }}
        />
      )}
      <Text style={[ui.heading, ui.section]}>sealed for later</Text>
      {book.capsules.length ? (
        [...book.capsules]
          .sort((a, b) => a.opens.localeCompare(b.opens))
          .map((capsule) => (
            <InkSurface key={capsule.id} radius={18} style={{ padding: 12, marginBottom: 14 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  capsule.opens <= today
                    ? `Open ${capsule.title}`
                    : `${capsule.title}, sealed until ${capsule.opens}`
                }
                onPress={() => {
                  if (capsule.opens <= localDay()) setOpened(capsule);
                  else setMessage(`this little letter opens ${capsule.opens}.`);
                }}
                style={({ pressed }) => [ui.row, { minHeight: 60 }, pressed && ui.pressed]}
              >
                <SketchIcon name={capsule.opens <= today ? 'envelope' : 'lock'} size={33} />
                <View style={{ flex: 1 }}>
                  <Text style={ui.body}>{capsule.title}</Text>
                  <Text style={ui.small}>
                    {capsule.opens <= today ? 'ready to open' : `opens ${capsule.opens}`}
                  </Text>
                </View>
                <SketchIcon name="arrow" size={23} />
              </Pressable>
              <View style={{ alignSelf: 'flex-end' }}>
                <IconButton
                  icon="trash"
                  label={`Delete capsule ${capsule.title}`}
                  onPress={() => setDeleting(capsule)}
                />
              </View>
            </InkSurface>
          ))
      ) : !making ? (
        <Empty
          title="a little surprise for later"
          body="keep a letter, a few memories, or both. choose when you’ll open them."
          icon="envelope"
        />
      ) : null}
      <Text style={[ui.small, ui.center, { marginTop: 16 }]}>
        kept on this device. date locks are a gentle ritual, not encryption: changing the device
        date can open them early. export a backup to keep them safe.
      </Text>
      <Confirm
        visible={!!deleting}
        title="let this capsule go?"
        body="this removes its note and memory copies from this device. your original journal entries stay."
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
        busy={busy}
      />
      <LinkText onPress={() => router.replace('/rewind' as Href)}>back to rewind</LinkText>
    </Page>
  );
}
