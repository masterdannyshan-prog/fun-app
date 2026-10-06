import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const narrow = width < 360;
  const short = height < 760;
  const veryShort = height < 680;
  const largeText = fontScale > 1.3;
  const compact = (short || narrow) && !largeText;
  const horizontalPadding = narrow ? 16 : width < 420 ? 20 : 22;
  const vertical = (normal: number, compactValue: number, veryCompactValue = compactValue) =>
    veryShort ? veryCompactValue : compact ? compactValue : normal;

  return {
    width,
    height,
    fontScale,
    narrow,
    short,
    veryShort,
    largeText,
    compact,
    horizontalPadding,
    vertical,
  };
}
