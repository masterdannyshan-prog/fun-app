import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import { VoicePlayback } from '../components/JournalMedia';
import { Empty, Notice, Page, ui } from '../components/SketchUI';
import { localDay } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { moods } from '../theme';
export default function CapsuleMemoryScreen() {
  const { capsule: id, day } = useLocalSearchParams<{ capsule: string; day: string }>();
  const book = useSketchbook();
  const [message, setMessage] = useState('');
  const capsule = book.capsules.find((item) => item.id === id);
  const entry =
    capsule?.opens && capsule.opens <= localDay()
      ? capsule.memories.find((item) => item.date === day)
      : null;
  if (!entry)
    return (
      <Page title="tucked away">
        <Empty
          title="not ready to open"
          body="this memory stays inside its capsule until the chosen date."
          icon="lock"
        />
      </Page>
    );
  const mood = moods.find((item) => item.id === entry.mood)!;
  return (
    <Page title="a day from then" subtitle={entry.date}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <InkSurface
          fill={mood.color}
          radius={18}
          stroke="none"
          style={{ width: 110, height: 120, alignItems: 'center', justifyContent: 'center' }}
        >
          <SketchIcon name={entry.doodle ?? mood.icon} size={80} />
        </InkSurface>
      </View>
      <InkSurface radius={18} style={{ padding: 22 }}>
        <Text selectable style={ui.body}>
          {entry.text || `a ${entry.mood} little day`}
        </Text>
      </InkSurface>
      {entry.photos.map((photo) => (
        <Image
          key={photo.id}
          source={{ uri: photo.uri }}
          style={{ width: '100%', height: 280, marginTop: 24 }}
          accessibilityLabel="Photo preserved in this capsule"
        />
      ))}
      {entry.voice ? (
        <VoicePlayback note={entry.voice} disabled={false} onMessage={setMessage} />
      ) : null}
      <Notice message={message} />
      <Text style={[ui.small, { marginTop: 24 }]}>
        a copy from the day you sealed it. editing the original memory won’t change this one.
      </Text>
    </Page>
  );
}
