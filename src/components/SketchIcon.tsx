import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

// Original, slightly irregular fineliner drawings on a shared 64-unit grid.
const drawings = {
  back: 'M55 32 Q31 31 9 33 M21 20 L8 33 L22 45',
  search: 'M27 9 C5 7 7 42 27 42 C48 42 48 9 27 9 Z M42 40 L58 58',
  book: 'M7 15 Q21 8 32 16 Q47 8 58 15 L57 51 Q43 44 32 53 Q18 45 7 51 Z M32 16 L32 53 M13 23 Q22 19 26 23 M38 23 Q46 19 51 23 M13 31 L26 30 M38 31 L51 30',
  shoe: 'M12 14 L25 13 L29 32 Q42 41 54 42 L59 51 L6 53 L8 38 Z M9 45 L54 45 M26 24 L19 27 M29 31 L22 34',
  cloud:
    'M12 37 C0 33 7 19 17 22 C16 7 39 8 40 20 C54 11 65 31 53 37 Z M17 45 L14 51 M33 45 L30 53 M49 45 L46 51',
  envelope: 'M5 17 L57 14 L59 48 L8 52 Z M5 17 L33 35 L57 14 M8 52 L25 32 M59 48 L40 31',
  lock: 'M16 28 L49 26 L51 56 L15 58 Z M21 27 L21 17 C21 0 43 1 44 16 L44 27 M33 39 L33 48',
  tag: 'M6 10 L30 9 L59 38 L36 60 L7 31 Z M17 19 a3 3 0 1 0 1 0',
  share: 'M31 40 L32 5 M20 18 L32 5 L43 17 M17 29 L9 29 L10 57 L55 55 L54 29 L47 29',
  trash:
    'M13 19 L52 18 M22 17 L24 9 L41 8 L44 18 M18 22 L21 56 L46 55 L49 21 M28 29 L29 48 M39 28 L38 48',
  flash: 'M38 3 L15 35 L32 33 L26 61 L50 25 L34 27 Z',
  flip: 'M7 27 C13 2 49 1 57 23 M47 16 L58 24 L60 10 M57 38 C51 63 15 64 7 42 M18 49 L6 41 L4 55',
  wave: 'M5 43 Q22 17 31 24 Q39 29 34 33 Q29 28 26 38 Q23 51 37 46 Q49 35 54 36 Q61 38 57 41 Q51 39 51 46 Q52 51 61 47 M47 17 l4 -3 M54 24 l4 -3 M55 11 l4 -3',
  sun: 'M31 22 C16 22 19 45 32 43 C46 42 47 22 31 22 Z M32 5 l-.5 10 M31 51 l.5 9 M5 33 l10 -.5 M50 32 l10 .5 M12 13 l7 7 M46 46 l7 7 M12 53 l7 -8 M47 18 l7 -8',
  scribble:
    'M12 40 C-1 25 38 8 40 15 C45 27 7 55 9 43 C13 24 36 2 45 10 C60 24 8 54 6 36 C6 16 56 19 50 36 C44 62 13 48 15 33 C22 10 62 31 53 40 C30 57 17 53 20 39 C27 20 66 28 58 37 C43 48 3 40 17 29',
  mountain:
    'M5 58 L25 29 L32 49 L38 40 L50 53 M52 4 L40 27 L50 23 L43 42 M8 24 l3 5 M3 34 l4 2 M55 42 l4 -7',
  moon: 'M46 7 C22 13 12 37 23 48 C32 58 48 55 56 47 C35 49 30 35 46 7 Z M12 4 L8 16 L18 9 L5 10 L16 17 Z M59 18 L54 30 L64 23 L51 24 L62 30 Z',
  photo:
    'M12 16 L52 13 L54 50 L14 53 Z M15 48 L27 27 L39 47 M34 38 L43 31 L53 42 M41 23 C37 22 36 31 41 31 C47 31 47 23 41 23 Z',
  camera:
    'M10 23 L23 22 L25 16 L37 15 L40 22 L53 21 L55 48 L12 51 Z M17 22 l-.5 -4 l7 -.5 M31 28 C19 29 22 45 32 43 C44 42 43 27 31 28 Z M20 10 l-4 -6 M32 9 l-.3 -7 M44 10 l4 -6',
  mic: 'M31 8 C20 8 22 23 22 31 C23 43 41 42 41 30 L41 19 Q42 7 31 8 Z M17 30 C18 52 47 53 48 30 M32 49 l-.5 11 M24 60 l15 -.3',
  home: 'M12 30 L30 9 L51 31 L50 56 L36 56 L35 40 L27 40 L26 56 L12 57 Z M43 6 l2 -5 M53 15 l6 -5',
  calendar:
    'M10 16 L53 13 L55 53 L11 56 Z M11 26 L53 23 M21 7 l.5 14 M42 5 l-.3 15 M21 34 l1 0 M33 33 l1 0 M45 32 l1 0 M22 45 l1 0 M34 44 l1 0 M46 43 l1 0',
  rewind:
    'M12 24 C18 3 49 5 54 26 C61 50 32 64 17 46 M11 17 l1 10 l10 -3 M31 20 l.5 15 l10 8 M13 36 l2 5',
  settings:
    'M25 9 L27 4 L37 5 L39 13 L45 16 L53 13 L58 22 L52 28 L53 35 L59 41 L53 50 L45 47 L40 51 L37 60 L27 59 L25 50 L18 46 L10 49 L5 39 L12 33 L12 26 L7 20 L13 11 L21 15 Z M32 24 C20 23 22 41 33 40 C44 40 43 24 32 24 Z',
  arrow: 'M8 33 Q30 30 55 31 M43 20 L56 31 L44 43',
  check: 'M11 32 L26 47 L54 17',
  close: 'M17 17 L47 47 M46 17 L17 48',
  play: 'M22 12 L49 33 L22 53 Z',
  pause: 'M23 13 L23 52 M42 12 L42 51',
  mug: 'M12 25 Q30 20 47 24 L45 48 Q30 57 16 49 Z M47 29 C63 25 63 43 47 41 M12 25 Q29 33 47 24 M22 17 Q27 11 25 5 M33 16 Q38 10 36 4 M43 17 Q47 12 46 7',
  headphones:
    'M12 37 C8 3 52 1 53 36 M14 31 Q3 29 7 46 Q9 53 16 49 L16 29 M50 30 Q61 29 59 46 Q57 54 49 48 Z M12 33 l-.5 15 M54 33 l-.5 15',
} as const;
export type SketchIconName = keyof typeof drawings;
export function SketchIcon({
  name,
  size = 32,
  color = colors.ink,
  filled = false,
}: {
  name: SketchIconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      style={{ position: 'relative', zIndex: 1 }}
    >
      <Path
        d={drawings[name]}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
