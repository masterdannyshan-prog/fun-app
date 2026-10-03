import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import { LinkText, Notice, Page, ui } from '../components/SketchUI';
import { doodles, type Doodle } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { colors, moods } from '../theme';
export default function PersonalizeScreen() {
  const book = useSketchbook();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function choose(doodle?: Doodle) {
    setBusy(true);
    try {
      await book.configure({ defaultDoodle: doodle });
      setMessage(
        'new days will start with this doodle. your existing memories stay just as they are.',
      );
    } catch {
      setMessage('could not keep your choice. try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="little marks" subtitle="a color for a feeling. a sketch for a memory.">
      <Text style={ui.heading}>your mood colors</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 20 }}>
        {moods.map((mood) => (
          <View key={mood.id} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <InkSurface
              fill={mood.color}
              stroke="none"
              grain
              radius={14}
              style={{ width: '100%', height: 84, alignItems: 'center', justifyContent: 'center' }}
            >
              <SketchIcon name={mood.icon} size={52} />
            </InkSurface>
            <Text style={ui.small}>{mood.id}</Text>
          </View>
        ))}
      </View>
      <Text style={ui.small}>
        these soft colors stay consistent across your calendar and rewind. the doodle and label mean
        you don’t have to rely on color alone.
      </Text>
      <Text style={[ui.heading, ui.section]}>a default doodle</Text>
      <Text style={[ui.body, { marginBottom: 18 }]}>
        choose the sketch new days start with. you can change any day’s doodle while editing it.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {doodles.map((doodle, index) => (
          <Pressable
            key={doodle}
            accessibilityRole="button"
            accessibilityLabel={`Default ${doodle} doodle`}
            accessibilityState={{ selected: book.settings.defaultDoodle === doodle }}
            disabled={busy}
            onPress={() => void choose(doodle)}
            style={({ pressed }) => [pressed && ui.pressed]}
          >
            <InkSurface
              fill={moods[index % 4].color}
              stroke={book.settings.defaultDoodle === doodle ? colors.cobalt : 'none'}
              radius={15}
              grain
              style={{
                width: 72,
                height: 87,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
              }}
            >
              <SketchIcon name={doodle} size={44} />
              <Text style={{ ...ui.small, fontSize: 9 }}>{doodle}</Text>
            </InkSurface>
          </Pressable>
        ))}
      </View>
      <LinkText onPress={() => void choose()}>let the mood choose my doodle</LinkText>
      <Notice message={message} />
    </Page>
  );
}
