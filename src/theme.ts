export const colors = {
  paper: '#F7F5EE',
  ink: '#202236',
  cobalt: '#3530C8',
  calm: '#C8DCE5',
  fun: '#DCEAAE',
  messy: '#D4CEE9',
  intense: '#C8CED8',
  muted: '#696977',
  grain: '#B8A68D',
  desk: '#E7E7E1',
  error: '#9E3542',
} as const;
export const fonts = {
  hand: 'Kalam_400Regular',
  handLight: 'Kalam_300Light',
  mono: 'SpaceMono_400Regular',
} as const;
export const moods = [
  { id: 'calm', label: 'calm', icon: 'wave', color: colors.calm },
  { id: 'fun', label: 'fun', icon: 'sun', color: colors.fun },
  { id: 'messy', label: 'messy', icon: 'scribble', color: colors.messy },
  { id: 'intense', label: 'intense', icon: 'mountain', color: colors.intense },
] as const;
export type Mood = (typeof moods)[number]['id'];
