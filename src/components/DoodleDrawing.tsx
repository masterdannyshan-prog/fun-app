import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme';

type Point = { x: number; y: number };
const pathFrom = (points: Point[]) =>
  points
    .map((point, index) => `${index ? 'L' : 'M'}${Math.round(point.x)} ${Math.round(point.y)}`)
    .join(' ');

export function DoodleMark({ paths, size = 64, color = colors.ink }: { paths?: string[]; size?: number; color?: string }) {
  if (!paths?.length) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 240 160" aria-hidden>
      {paths.map((path, index) => <Path key={`${index}-${path.slice(0, 12)}`} d={path} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
  );
}

export function DoodleDrawing({ value, onChange, disabled = false }: { value?: string[]; onChange: (paths: string[]) => void; disabled?: boolean }) {
  const committed = value ?? [];
  const points: Point[] = [];
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event) => { points.push({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }); },
    onPanResponderMove: (event) => { points.push({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }); },
    onPanResponderRelease: () => { if (points.length > 1) onChange([...committed, pathFrom(points)]); points.length = 0; },
    onPanResponderTerminate: () => { points.length = 0; },
  });
  return (
    <View style={[styles.wrap, disabled && styles.disabled]}>
      <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Draw a doodle" accessibilityHint="Drag your finger to draw. Use clear doodle to start over." style={styles.canvas}>
        <DoodleMark paths={committed} size={240} />
        {!committed.length ? <Text style={styles.hint}>draw here with your finger</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear doodle" disabled={disabled || !committed.length} onPress={() => onChange([])} style={({ pressed }) => [styles.clear, pressed && { opacity: 0.62 }, (!committed.length || disabled) && styles.disabled]}>
        <Text style={styles.clearText}>clear doodle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  canvas: { height: 160, borderWidth: 1.5, borderColor: colors.cobalt, borderRadius: 18, backgroundColor: '#FFFDF6', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  hint: { position: 'absolute', fontFamily: fonts.mono, fontSize: 12, color: colors.muted },
  clear: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontFamily: fonts.mono, fontSize: 13, color: colors.cobalt, textDecorationLine: 'underline' },
  disabled: { opacity: 0.45 },
});
