import { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import { DoodleMark } from '../components/DoodleDrawing';
import { VoicePlayback } from '../components/JournalMedia';
import {
  Confirm,
  Empty,
  IconButton,
  InkButton,
  LinkText,
  Notice,
  Page,
  ui,
} from '../components/SketchUI';
import { dayDate, localDay, validDay } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { colors, fonts, moods } from '../theme';

export default function MemoryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const book = useSketchbook();
  const entry = book.records[date]?.saved;
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  if (!validDay(date ?? ''))
    return (
      <Page title="a little day">
        <Empty title="that date doesn’t exist" body="return to your calendar to choose a day." />
      </Page>
    );
  if (!entry)
    return (
      <Page title="a little day" error={book.error}>
        <Empty
          title="nothing tucked away yet"
          body="your draft is still yours. finish it when you’re ready."
          action={date <= localDay() ? 'write this day' : undefined}
          onPress={() => router.replace(`/edit/${date}` as Href)}
        />
      </Page>
    );
  const mood = moods.find((item) => item.id === entry.mood)!;
  async function remove() {
    setBusy(true);
    try {
      await book.remove(date);
      setDeleting(false);
      router.replace('/year');
    } catch {
      setMessage('could not delete this memory. nothing was removed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title={dayDate(date)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        .toLowerCase()}
      subtitle={String(dayDate(date).getFullYear())}
      right={<IconButton icon="trash" label="Delete memory" onPress={() => setDeleting(true)} />}
      error={book.error}
    >
      <View style={{ alignItems: 'center', marginBottom: 22 }}>
        <InkSurface
          fill={mood.color}
          stroke="none"
          radius={19}
          grain
          style={{
            width: 115,
            height: 122,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-3deg' }],
          }}
        >
          {entry.customDoodle?.length ? (
            <DoodleMark paths={entry.customDoodle} size={102} />
          ) : (
            <SketchIcon name={entry.doodle ?? mood.icon} size={89} />
          )}
        </InkSurface>
        <Text style={[ui.body, { marginTop: 8 }]}>{entry.mood}</Text>
      </View>
      {entry.text ? (
        <InkSurface radius={22} style={{ padding: 24 }}>
          <Text
            selectable
            style={[
              ui.body,
              book.settings.writing === 'hand' && {
                fontFamily: fonts.hand,
                fontSize: 21,
                lineHeight: 31,
              },
            ]}
          >
            {entry.text}
          </Text>
        </InkSurface>
      ) : (
        <Text style={[ui.small, ui.center]}>a day remembered without words.</Text>
      )}
      {entry.photos.map((attachment, index) => (
        <Pressable
          key={attachment.id}
          accessibilityRole="button"
          accessibilityLabel={`View photo ${index + 1} full size`}
          onPress={() => setPhoto(attachment.uri)}
          style={{
            marginTop: 28,
            marginHorizontal: 16,
            transform: [{ rotate: index % 2 ? '2deg' : '-2deg' }],
          }}
        >
          <InkSurface radius={5} fill="#FFFDF8" style={{ padding: 10, paddingBottom: 23 }}>
            <Image
              source={{ uri: attachment.uri }}
              style={{ width: '100%', height: 260 }}
              accessibilityLabel={`Memory photo ${index + 1}`}
            />
            <View
              style={{
                width: 72,
                height: 23,
                backgroundColor: colors.messy,
                opacity: 0.8,
                position: 'absolute',
                top: -10,
                alignSelf: 'center',
                transform: [{ rotate: '-5deg' }],
              }}
            />
          </InkSurface>
        </Pressable>
      ))}
      {entry.tags?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 23 }}>
          {entry.tags.map((tag, index) => (
            <InkSurface
              key={tag}
              fill={index % 2 ? colors.messy : colors.calm}
              stroke="none"
              radius={12}
              style={{ paddingHorizontal: 13, paddingVertical: 6 }}
            >
              <Text style={ui.small}>#{tag}</Text>
            </InkSurface>
          ))}
        </View>
      ) : null}
      {entry.voice ? (
        <VoicePlayback note={entry.voice} disabled={false} onMessage={setMessage} />
      ) : null}
      <Notice message={message} />
      <InkButton
        label="edit this memory"
        secondary
        onPress={() => router.push(`/edit/${date}` as Href)}
      />
      <InkButton
        label="add to a time capsule"
        icon="envelope"
        onPress={() =>
          router.push({ pathname: '/capsules', params: { memory: date, create: 'yes' } })
        }
      />
      <LinkText onPress={() => router.replace('/year')}>back to my year</LinkText>
      <Confirm
        visible={deleting}
        title="let this day go?"
        body="this deletes the memory and draft from this device. a copy already tucked in a time capsule or exported backup will stay there."
        onCancel={() => setDeleting(false)}
        onConfirm={() => void remove()}
        busy={busy}
      />
      <Modal
        visible={!!photo}
        transparent
        animationType="none"
        onRequestClose={() => setPhoto(null)}
      >
        <View
          style={{ flex: 1, backgroundColor: colors.paper, padding: 24, justifyContent: 'center' }}
        >
          <View style={{ alignSelf: 'flex-end' }}>
            <IconButton icon="close" label="Close full-size photo" onPress={() => setPhoto(null)} />
          </View>
          {photo ? (
            <Image
              source={{ uri: photo }}
              resizeMode="contain"
              style={{ width: '100%', flex: 1 }}
              accessibilityLabel="Full size memory photo"
            />
          ) : null}
        </View>
      </Modal>
    </Page>
  );
}
