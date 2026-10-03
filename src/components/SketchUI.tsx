import { router, usePathname, type Href } from 'expo-router';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { InkRule, InkSurface, PaperGrain } from './InkSurface';
import { SketchIcon, type SketchIconName } from './SketchIcon';
import { DoodleMark } from './DoodleDrawing';
import { colors, fonts, moods } from '../theme';
import { dayDate, type JournalEntry } from '../lib/journal';

export const ui = StyleSheet.create({
  body: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 24, color: colors.ink },
  small: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 20, color: colors.muted },
  heading: { fontFamily: fonts.hand, fontSize: 28, lineHeight: 40, color: colors.ink },
  section: { marginTop: 26, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: 20, gap: 12 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.62 },
});
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: SketchIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
        pressed && ui.pressed,
        disabled && { opacity: 0.4 },
      ]}
    >
      <SketchIcon name={icon} size={30} />
    </Pressable>
  );
}
export function back() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
export function TabBar({ disabled = false }: { disabled?: boolean }) {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const tabs = [
    { title: 'today', href: '/', icon: 'home' },
    { title: 'year', href: '/year', icon: 'calendar' },
    { title: 'rewind', href: '/rewind', icon: 'rewind' },
    { title: 'settings', href: '/settings', icon: 'settings' },
  ] as const;
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        paddingHorizontal: 10,
        paddingBottom: Math.max(10, insets.bottom),
      }}
    >
      <InkRule />
      <View style={{ flexDirection: 'row', paddingTop: 5 }}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.title}
            accessibilityRole="button"
            accessibilityLabel={`${tab.title}${path === tab.href ? ', current page' : ''}`}
            accessibilityState={{ selected: path === tab.href, disabled }}
            disabled={disabled}
            onPress={() => {
              Keyboard.dismiss();
              if (path !== tab.href) router.replace(tab.href);
            }}
            style={({ pressed }) => [
              { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 1 },
              pressed && ui.pressed,
              disabled && { opacity: 0.5 },
            ]}
          >
            <SketchIcon
              name={tab.icon}
              size={30}
              color={path === tab.href ? colors.cobalt : colors.ink}
              filled={path === tab.href && tab.icon === 'home'}
            />
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: 12,
                lineHeight: 21,
                color: path === tab.href ? colors.cobalt : colors.ink,
              }}
            >
              {tab.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Page({
  title,
  subtitle,
  children,
  tabs = false,
  right,
  footer,
  error,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  tabs?: boolean;
  right?: ReactNode;
  footer?: ReactNode;
  error?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <PaperGrain />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            {!tabs ? <IconButton icon="back" label="Go back" onPress={back} /> : null}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: fonts.handLight,
                  fontSize: title.length > 15 ? 38 : 52,
                  lineHeight: 70,
                  color: colors.ink,
                  textAlign: 'center',
                }}
              >
                {title}
              </Text>
              <View style={{ width: 115, marginTop: -12, transform: [{ rotate: '-4deg' }] }}>
                <InkRule />
              </View>
            </View>
            {right ?? (!tabs ? <View style={{ width: 48 }} /> : null)}
          </View>
          {subtitle ? (
            <Text style={[ui.body, ui.center, { marginTop: 14, marginBottom: 24 }]}>
              {subtitle}
            </Text>
          ) : (
            <View style={{ height: 22 }} />
          )}
          {error ? <Notice message={error} error /> : null}
          {children}
        </ScrollView>
        {footer ? (
          <View
            style={{
              padding: 16,
              paddingBottom: Math.max(16, insets.bottom),
              backgroundColor: colors.paper,
            }}
          >
            <InkRule />
            {footer}
          </View>
        ) : null}
        {tabs ? <TabBar /> : null}
      </KeyboardAvoidingView>
    </View>
  );
}
export function InkButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  icon = 'arrow',
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: SketchIconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        { marginTop: 12 },
        pressed && ui.pressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      <InkSurface
        fill={secondary ? 'none' : colors.cobalt}
        stroke={colors.cobalt}
        radius={15}
        style={{
          paddingVertical: 11,
          paddingHorizontal: 18,
          minHeight: 57,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.handLight,
            fontSize: 26,
            lineHeight: 35,
            color: secondary ? colors.cobalt : colors.paper,
            flexShrink: 1,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
        <SketchIcon name={icon} size={27} color={secondary ? colors.cobalt : colors.paper} />
      </InkSurface>
    </Pressable>
  );
}
export function LinkText({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{ minHeight: 48, justifyContent: 'center' }, pressed && ui.pressed]}
    >
      <Text
        style={[
          ui.body,
          { color: colors.cobalt, textDecorationLine: 'underline', textAlign: 'center' },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      role="status"
      style={[ui.small, { color: error ? colors.error : colors.muted, marginVertical: 12 }]}
    >
      {message}
    </Text>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[ui.small, { color: colors.ink, marginBottom: 6 }]}>{label}</Text>
      <View style={fieldStyles.shell}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          selectionColor={colors.cobalt}
          style={[ui.body, fieldStyles.input, props.style]}
        />
      </View>
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  shell: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: '#FFFDF6',
    padding: 13,
  },
  input: { minHeight: 26, padding: 0, margin: 0, borderWidth: 0, outlineStyle: 'none' as never },
});
export function Empty({
  title,
  body,
  action,
  onPress,
  icon = 'book',
}: {
  title: string;
  body: string;
  action?: string;
  onPress?: () => void;
  icon?: SketchIconName;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
      <SketchIcon name={icon} size={86} />
      <Text style={[ui.heading, ui.center]}>{title}</Text>
      <Text style={[ui.body, ui.center]}>{body}</Text>
      {action && onPress ? <InkButton label={action} onPress={onPress} /> : null}
    </View>
  );
}
export function MemoryCard({ entry, onPress }: { entry: JournalEntry; onPress?: () => void }) {
  const mood = moods.find((item) => item.id === entry.mood)!;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open memory for ${entry.date}: ${entry.text.slice(0, 80) || entry.mood}`}
      onPress={onPress ?? (() => router.push(`/memory/${entry.date}` as Href))}
      style={({ pressed }) => [{ marginBottom: 12 }, pressed && ui.pressed]}
    >
      <InkSurface
        radius={17}
        style={{ padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center' }}
      >
        <InkSurface
          fill={mood.color}
          stroke="none"
          grain
          radius={13}
          style={{ width: 66, height: 76, alignItems: 'center', justifyContent: 'center' }}
        >
          {entry.customDoodle?.length ? (
            <DoodleMark paths={entry.customDoodle} size={56} />
          ) : (
            <SketchIcon name={entry.doodle ?? mood.icon} size={49} />
          )}
        </InkSurface>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={ui.small}>
            {dayDate(entry.date)
              .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              .toLowerCase()}
          </Text>
          <Text numberOfLines={2} style={ui.body}>
            {entry.text || `a ${entry.mood} little day`}
          </Text>
          <Text style={ui.small}>
            {(entry.tags ?? []).map((tag) => `#${tag}`).join('  ')}
            {entry.photos.length
              ? `  ${entry.photos.length} photo${entry.photos.length > 1 ? 's' : ''}`
              : ''}
            {entry.voice ? '  voice note' : ''}
          </Text>
        </View>
      </InkSurface>
    </Pressable>
  );
}
export function Confirm({
  visible,
  title,
  body,
  onCancel,
  onConfirm,
  busy = false,
}: {
  visible: boolean;
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#20223666',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <InkSurface
          fill={colors.paper}
          radius={24}
          style={{ width: '100%', maxWidth: 420, padding: 24 }}
        >
          <Text accessibilityRole="header" style={ui.heading}>
            {title}
          </Text>
          <Text style={ui.body}>{body}</Text>
          <InkButton
            label={busy ? 'please wait...' : 'yes, delete'}
            icon="trash"
            onPress={onConfirm}
            disabled={busy}
          />
          <LinkText onPress={onCancel}>keep it</LinkText>
        </InkSurface>
      </View>
    </Modal>
  );
}
