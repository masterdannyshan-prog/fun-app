import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { InkSurface } from '../components/InkSurface';
import { SketchIcon } from '../components/SketchIcon';
import { InkButton, LinkText, Notice, Page, ui } from '../components/SketchUI';
import { useSketchbook } from '../state/Sketchbook';
import { colors, fonts } from '../theme';

export default function OnboardingScreen() {
  const book = useSketchbook();
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const iconSize = narrow ? 56 : 65;
  const iconHeight = narrow ? 64 : 74;
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function begin() {
    setBusy(true);
    try {
      await book.configure({ onboarded: true });
      router.replace('/');
    } catch {
      setMessage('could not keep your setup. try again, or export a recovery copy in settings.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="little days">
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fonts.handLight,
          fontSize: narrow ? 38 : 42,
          lineHeight: narrow ? 49 : 54,
          color: colors.ink,
          textAlign: 'center',
        }}
      >
        a little place{'\n'}for your days
      </Text>
      <Text style={[ui.body, ui.center, { marginTop: 14, marginBottom: narrow ? 20 : 28 }]}>
        one memory. one tiny sketch. every day.
      </Text>
      <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center' }}>
        {(['mug', 'sun', 'headphones', 'shoe'] as const).map((icon, index) => (
          <InkSurface
            key={icon}
            fill={[colors.calm, colors.fun, colors.messy, colors.intense][index]}
            stroke="none"
            radius={14}
            grain
            style={{
              width: iconSize,
              height: iconHeight,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: `${index % 2 ? 5 : -4}deg` }],
            }}
          >
            <SketchIcon name={icon} size={48} />
          </InkSurface>
        ))}
      </View>
      <View style={{ alignItems: 'center', marginVertical: narrow ? 18 : 28 }}>
        <Svg width="100%" height={narrow ? 150 : 185} viewBox="0 0 360 200" aria-hidden>
          <Path
            d="M18 39 Q103 18 179 49 Q252 18 341 35 L338 172 Q249 150 179 184 Q105 156 20 179 Z"
            fill={colors.paper}
            stroke={colors.ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path
            d="M29 48 Q104 30 169 57 L169 169 Q94 144 31 165 Z"
            fill={colors.calm}
            opacity={0.55}
          />
          <Path
            d="M189 58 Q255 30 330 46 L326 163 Q256 144 189 168 Z"
            fill={colors.fun}
            opacity={0.55}
          />
          <Path
            d="M179 49 Q175 104 179 184 M175 181 L173 199 L187 192 L193 199 L194 179"
            fill={colors.cobalt}
            stroke={colors.ink}
            strokeWidth={1.6}
          />
          <Path
            d="M47 108 Q79 69 98 79 Q114 91 101 99 Q92 89 87 112 Q84 135 110 125 Q139 100 153 106 M46 136 Q93 123 143 135 M228 143 Q242 116 264 129 Q274 141 303 139 M225 105 L236 74 L248 102 Z M236 103 L235 122 M272 94 L285 61 L299 93 Z M286 94 L286 120"
            fill="none"
            stroke={colors.ink}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      {(
        [
          { icon: 'photo', text: 'remember the small things' },
          { icon: 'calendar', text: 'see your year in doodles' },
          { icon: 'lock', text: 'on your device. yours to keep.' },
        ] as const
      ).map((item) => (
        <View key={item.text} style={[ui.row, { marginBottom: 14 }]}>
          <SketchIcon name={item.icon} size={30} />
          <Text style={[ui.body, { flex: 1 }]}>{item.text}</Text>
        </View>
      ))}
      <Notice message={message} />
      <InkButton
        label={busy ? 'opening...' : 'start my sketchbook'}
        onPress={() => void begin()}
        disabled={busy}
      />
      <LinkText onPress={() => router.push({ pathname: '/settings', params: { restore: 'yes' } })}>
        i already have a sketchbook
      </LinkText>
      <Text style={[ui.small, ui.center]}>
        no account, ads, or uploads. back up your days in settings.
      </Text>
    </Page>
  );
}
