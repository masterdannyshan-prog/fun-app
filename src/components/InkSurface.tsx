import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { colors } from '../theme';

export function PaperGrain() {
  const id = `grain-${useId().replace(/:/g, '')}`;
  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" aria-hidden>
        <Defs>
          <Pattern id={id} width={76} height={79} patternUnits="userSpaceOnUse">
            <Circle cx={7} cy={11} r={0.55} fill={colors.grain} opacity={0.28} />
            <Circle cx={40} cy={43} r={0.45} fill={colors.ink} opacity={0.12} />
            <Circle cx={63} cy={26} r={0.7} fill={colors.grain} opacity={0.18} />
            <Path
              d="M21 62 l2 -1 M56 73 l1 -2 M31 20 l2 1"
              stroke={colors.grain}
              strokeWidth={0.45}
              opacity={0.22}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function InkSurface({
  children,
  style,
  fill = 'none',
  stroke = colors.ink,
  strokeWidth = 1.4,
  radius = 18,
  grain = false,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  grain?: boolean;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width: w, height: h } = size;
  const r = Math.max(0, Math.min(radius, w / 2 - 3, h / 2 - 3));
  const path = `M ${r} 3 Q ${w * 0.28} 1 ${w * 0.5} 3 Q ${w * 0.76} 4 ${w - r} 2 Q ${w - 2} 1 ${w - 3} ${r}
    Q ${w - 1} ${h * 0.5} ${w - 3} ${h - r} Q ${w - 1} ${h - 2} ${w - r} ${h - 3}
    Q ${w * 0.6} ${h - 1} ${r} ${h - 3} Q 2 ${h - 1} 3 ${h - r} Q 1 ${h * 0.45} 3 ${r} Q 4 2 ${r} 3 Z`;
  return (
    <View
      style={style}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width !== w || layout.height !== h)
          setSize({ width: layout.width, height: layout.height });
      }}
    >
      <View
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {w > 0 && h > 0 ? (
          <Svg width={w} height={h} aria-hidden>
            <Path
              d={path}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
        {grain ? <PaperGrain /> : null}
      </View>
      {children}
    </View>
  );
}

export function InkRule({ color = colors.ink }: { color?: string }) {
  return (
    <Svg width="100%" height={8} viewBox="0 0 400 8" preserveAspectRatio="none" aria-hidden>
      <Path
        d="M2 5 Q45 2 88 4 T200 4 Q260 6 309 3 T398 4"
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
