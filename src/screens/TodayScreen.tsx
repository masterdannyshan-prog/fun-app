import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect, useNavigation, type Href } from 'expo-router';
import { InkRule, InkSurface, PaperGrain } from '../components/InkSurface';
import { MediaButton, VoicePlayback, VoiceRecorder } from '../components/JournalMedia';
import { DoodleDrawing } from '../components/DoodleDrawing';
import { SketchIcon } from '../components/SketchIcon';
import { back, Field, IconButton, LinkText, TabBar, ui } from '../components/SketchUI';
import { useJournal } from '../hooks/useJournal';
import { dayDate, doodles, weekDays, type VoiceNote } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { attachmentId, persistPhoto } from '../lib/media';
import { colors, fonts, moods } from '../theme';

const weekLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dateFormat = { weekday: 'long', month: 'long', day: 'numeric' } as const;
const example = 'golden light on the walk home.\ni stopped for a minute and just listened.';

export function TodayScreen({ day, editing = false }: { day: string; editing?: boolean }) {
  const book = useSketchbook();
  const insets = useSafeAreaInsets();
  const { fontScale, height } = useWindowDimensions();
  const largeText = fontScale > 1.3;
  const compact = height < 830 && !largeText;
  const journal = useJournal(day);
  const { draft, setDraft } = journal;
  const [message, setMessage] = useState('');
  const [navMessage, setNavMessage] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const navigation = useNavigation();
  useEffect(() => {
    if (Platform.OS !== 'web') {
      navigation.setOptions({ gestureEnabled: !voiceBusy });
      return;
    }
    return navigation.addListener('beforeRemove', (event) => {
      if (voiceBusy) {
        event.preventDefault();
        setMessage('stop your voice recording before leaving this day.');
      }
    });
  }, [navigation, voiceBusy]);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!voiceBusy) return false;
        setMessage('stop your voice recording before leaving this day.');
        return true;
      });
      return () => listener.remove();
    }, [voiceBusy]),
  );
  const [textHeight, setTextHeight] = useState(84);
  const [focused, setFocused] = useState(false);
  const [tagText, setTagText] = useState((draft.tags ?? []).join(', '));
  const controlsDisabled = !journal.ready || journal.saving || mediaBusy || voiceBusy;
  const captureVoice = useCallback(
    (voice: VoiceNote) => setDraft((previous) => ({ ...previous, voice })),
    [setDraft],
  );

  async function addPhoto(camera = false) {
    if (controlsDisabled) return;
    if (draft.photos.length >= 3) {
      setMessage('three photos is plenty for one little day. remove one to add another.');
      return;
    }
    if (camera) {
      router.push({ pathname: '/camera', params: { day } });
      return;
    }
    setMediaBusy(true);
    setMessage('');
    setNavMessage('');
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.65,
        base64: Platform.OS === 'web',
      };
      // Web pickers must be opened directly from the user's click, before awaiting permissions.
      const result = await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (Platform.OS === 'web' && (asset.fileSize ?? 0) > 2_000_000) {
        setMessage('choose a photo under 2 MB for this local browser preview.');
        return;
      }
      const id = attachmentId();
      const uri = await persistPhoto(asset, id);
      setDraft((previous) => ({ ...previous, photos: [...previous.photos, { id, uri }] }));
      setMessage('photo added.');
    } catch {
      setMessage('could not add that photo. check access and try again.');
    } finally {
      setMediaBusy(false);
    }
  }

  async function saveToday() {
    Keyboard.dismiss();
    setMessage('');
    setNavMessage('');
    if (await journal.save()) {
      if (editing) {
        router.replace(`/memory/${day}` as Href);
        return;
      }
      setMessage('today is tucked away. you can come back and edit it.');
      if (Platform.OS !== 'web')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }

  const feedback = journal.error || message;
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <PaperGrain />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, compact && { paddingBottom: 16 }]}>
            {editing ? (
              <View style={{ position: 'absolute', left: -5, top: 14 }}>
                <IconButton
                  icon="back"
                  label="Go back, draft kept"
                  onPress={back}
                  disabled={voiceBusy || mediaBusy || journal.saving}
                />
              </View>
            ) : null}
            <View style={styles.titleWrap}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.title,
                  compact && { fontSize: 60, lineHeight: 74 },
                  editing && { fontSize: 48 },
                ]}
              >
                {editing ? 'a little day' : 'today'}
              </Text>
              <View style={styles.titleUnderline}>
                <InkRule />
              </View>
            </View>
            {!largeText && !editing ? (
              <View style={styles.moon}>
                <SketchIcon name="moon" size={63} />
              </View>
            ) : null}
            <Text style={[styles.date, compact && { marginTop: 8 }]}>
              {dayDate(day).toLocaleDateString('en-US', dateFormat)}
            </Text>
          </View>

          <View style={[styles.moodSection, compact && { marginBottom: 16 }]}>
            <Text accessibilityRole="header" aria-level={2} style={styles.question}>
              {editing ? 'how did this day feel?' : 'how did today feel?'}
            </Text>
            <View
              style={[styles.moodRow, largeText && styles.moodRowLarge]}
              accessibilityRole="radiogroup"
              accessibilityLabel="How did today feel?"
            >
              {moods.map((mood) => (
                <Pressable
                  key={mood.id}
                  disabled={controlsDisabled}
                  accessibilityRole="radio"
                  accessibilityLabel={`${mood.label} mood`}
                  aria-checked={draft.mood === mood.id}
                  accessibilityState={{
                    checked: draft.mood === mood.id,
                    selected: draft.mood === mood.id,
                    disabled: controlsDisabled,
                  }}
                  onPress={() => {
                    setDraft((previous) => ({ ...previous, mood: mood.id }));
                    setMessage('');
                    setNavMessage('');
                    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
                  }}
                  style={({ pressed }) => [
                    styles.moodItem,
                    largeText && styles.moodItemLarge,
                    pressed && styles.pressed,
                  ]}
                >
                  <InkSurface
                    style={styles.moodStamp}
                    fill={mood.color}
                    radius={20}
                    grain
                    stroke={draft.mood === mood.id ? colors.cobalt : 'none'}
                    strokeWidth={2.4}
                  >
                    <SketchIcon name={mood.icon} size={61} />
                  </InkSurface>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.note,
              focused && styles.noteFocused,
              compact && { paddingTop: 16, paddingBottom: 8 },
            ]}
          >
            <Text
              nativeID="memory-label"
              style={[styles.noteLabel, compact && { marginBottom: 10 }]}
            >
              one thing i want to remember...
            </Text>
            <TextInput
              value={draft.text}
              onChangeText={(text) => {
                setDraft((previous) => ({ ...previous, text }));
                setMessage('');
                setNavMessage('');
              }}
              editable={journal.ready && !journal.saving}
              multiline
              placeholder={example}
              placeholderTextColor={colors.muted}
              accessibilityLabel="One thing I want to remember"
              accessibilityLabelledBy="memory-label"
              accessibilityHint="Write a few words about your day"
              textAlignVertical="top"
              maxLength={5000}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              selectionColor={colors.cobalt}
              onContentSizeChange={(event) =>
                setTextHeight(Math.max(84, Math.min(300, event.nativeEvent.contentSize.height)))
              }
              style={[
                styles.input,
                {
                  height: textHeight,
                  fontFamily: book.settings.writing === 'hand' ? fonts.hand : fonts.mono,
                },
                compact && { lineHeight: 24 },
              ]}
            />

            {draft.photos.length > 0 ? (
              <View style={styles.photos}>
                {draft.photos.map((photo, index) => (
                  <View key={photo.id} style={styles.photoWrap}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photo}
                      accessibilityLabel={`Attached memory photo ${index + 1}`}
                    />
                    <Pressable
                      onPress={() => {
                        setDraft((previous) => ({
                          ...previous,
                          photos: previous.photos.filter((item) => item.id !== photo.id),
                        }));
                        setMessage('photo removed.');
                        setNavMessage('');
                      }}
                      disabled={controlsDisabled}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      style={({ pressed }) => [styles.removePhoto, pressed && styles.pressed]}
                    >
                      <SketchIcon name="close" size={22} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            {draft.voice ? (
              <VoicePlayback
                key={draft.voice.id}
                note={draft.voice}
                disabled={controlsDisabled}
                onMessage={setMessage}
                onRemove={() => {
                  setDraft((previous) => ({ ...previous, voice: null }));
                  setMessage('voice note removed.');
                  setNavMessage('');
                }}
              />
            ) : null}

            <View style={[styles.mediaRow, compact && { marginTop: 8 }]}>
              <MediaButton
                label="photo"
                icon="photo"
                disabled={controlsDisabled}
                onPress={() => void addPhoto()}
              />
              <MediaButton
                label="camera"
                icon="camera"
                disabled={controlsDisabled}
                onPress={() => void addPhoto(true)}
              />
              <VoiceRecorder
                disabled={!journal.ready || journal.saving || mediaBusy}
                hasVoice={draft.voice !== null}
                onCapture={captureVoice}
                onBusy={setVoiceBusy}
                onMessage={(value) => {
                  setMessage(value);
                  setNavMessage('');
                }}
              />
            </View>
            {mediaBusy ? (
              <View style={styles.mediaLoading}>
                <ActivityIndicator size="small" color={colors.cobalt} />
                <Text style={styles.smallText}>adding your photo...</Text>
              </View>
            ) : null}
          </View>

          {editing ? (
            <View style={{ marginTop: 22 }}>
              <Field
                label="tags (comma separated, up to eight)"
                value={tagText}
                maxLength={240}
                editable={!controlsDisabled}
                placeholder="outside, slow moments"
                onChangeText={(value) => {
                  setTagText(value);
                  setDraft((previous) => ({
                    ...previous,
                    tags: [
                      ...new Set(
                        value
                          .split(',')
                          .map((item) => item.trim().toLowerCase().slice(0, 30))
                          .filter(Boolean),
                      ),
                    ].slice(0, 8),
                  }));
                }}
              />
              <Text style={[ui.body, { marginBottom: 12 }]}>a little doodle for this day</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {doodles.map((doodle) => (
                  <Pressable
                    key={doodle}
                    accessibilityRole="button"
                    accessibilityLabel={`${doodle} doodle`}
                    accessibilityState={{ selected: draft.doodle === doodle }}
                    disabled={controlsDisabled}
                    onPress={() => setDraft((previous) => ({ ...previous, doodle }))}
                  >
                    <InkSurface
                      radius={12}
                      fill={moods.find((item) => item.id === draft.mood)!.color}
                      stroke={draft.doodle === doodle ? colors.cobalt : 'none'}
                      style={{
                        width: 57,
                        height: 60,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SketchIcon name={doodle} size={40} />
                    </InkSurface>
                  </Pressable>
                ))}
              </View>
              <LinkText
                onPress={() => setDraft((previous) => ({ ...previous, doodle: undefined }))}
              >
                use my mood doodle
              </LinkText>
              <Text style={[ui.body, { marginTop: 14, marginBottom: 8 }]}>or draw your own</Text>
              <DoodleDrawing
                value={draft.customDoodle}
                disabled={controlsDisabled}
                onChange={(customDoodle) =>
                  setDraft((previous) => ({
                    ...previous,
                    customDoodle: customDoodle.length ? customDoodle : undefined,
                  }))
                }
              />
            </View>
          ) : (
            <View style={[styles.weekSection, compact && { marginTop: 14 }]}>
              <Text accessibilityRole="header" aria-level={2} style={styles.weekHeading}>
                this week
              </Text>
              <View style={styles.weekRow}>
                {weekDays(day, book.settings.sunday).map((date, index) => {
                  const entry = journal.entries[date];
                  const mood = moods.find((item) => item.id === entry?.mood);
                  return (
                    <Pressable
                      key={date}
                      style={styles.weekDay}
                      accessibilityRole="button"
                      disabled={date > day || controlsDisabled}
                      onPress={() => router.push(`/${entry ? 'memory' : 'edit'}/${date}` as Href)}
                      accessibilityLabel={`${dayDate(date).toLocaleDateString('en-US', dateFormat)}${date === day ? ', today' : ''}: ${entry ? `${entry.mood} memory saved` : 'no saved memory'}`}
                    >
                      <Text style={[styles.weekLetter, date === day && { color: colors.cobalt }]}>
                        {book.settings.sunday
                          ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]
                          : weekLetters[index]}
                      </Text>
                      <InkSurface
                        style={styles.weekTile}
                        fill={mood?.color ?? 'none'}
                        radius={10}
                        grain={!!entry}
                        stroke={entry ? 'none' : date === day ? colors.cobalt : colors.muted}
                        strokeWidth={date === day ? 1.5 : 1}
                      >
                        {mood ? (
                          <SketchIcon name={entry.doodle ?? mood.icon} size={34} />
                        ) : (
                          <Text style={styles.dash}>–</Text>
                        )}
                      </InkSurface>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <Pressable
            onPress={() => void saveToday()}
            disabled={controlsDisabled || journal.isSaved}
            accessibilityRole="button"
            accessibilityLabel={
              journal.isSaved ? 'Memory saved' : editing ? 'Save memory' : 'Save today'
            }
            accessibilityState={{
              disabled: controlsDisabled || journal.isSaved,
              busy: journal.saving,
            }}
            style={({ pressed }) => [
              styles.saveWrap,
              compact && { marginTop: 12 },
              pressed && styles.pressed,
              (!journal.ready || mediaBusy || voiceBusy) && styles.dimmed,
            ]}
          >
            <InkSurface
              fill={colors.cobalt}
              stroke={colors.cobalt}
              radius={33}
              style={styles.saveButton}
              grain
            >
              <CrayonMarks />
              {journal.saving || !journal.ready ? <ActivityIndicator color={colors.paper} /> : null}
              <Text style={styles.saveText}>
                {!journal.ready
                  ? 'opening...'
                  : journal.saving
                    ? 'saving...'
                    : journal.isSaved
                      ? editing
                        ? 'memory saved'
                        : 'today saved'
                      : editing
                        ? 'save memory'
                        : 'save today'}
              </Text>
              {journal.ready && !journal.saving ? (
                <SketchIcon
                  name={journal.isSaved ? 'check' : 'arrow'}
                  color={colors.paper}
                  size={32}
                />
              ) : null}
            </InkSurface>
          </Pressable>
          {!editing ? (
            <LinkText
              onPress={() => {
                if (!controlsDisabled) router.push(`/edit/${day}` as Href);
              }}
            >
              add tags & a little doodle
            </LinkText>
          ) : journal.isSaved ? (
            <LinkText onPress={() => router.replace(`/memory/${day}` as Href)}>
              view this memory
            </LinkText>
          ) : null}
        </ScrollView>
        <View style={[styles.nav, editing && { paddingBottom: Math.max(10, insets.bottom) }]}>
          {feedback || navMessage ? (
            <View style={styles.feedback}>
              <Text
                accessibilityLiveRegion="polite"
                role="status"
                style={[styles.feedbackText, journal.error ? { color: colors.error } : null]}
              >
                {journal.error || navMessage || message}
              </Text>
              {!journal.ready && journal.error ? (
                <Pressable onPress={journal.retry} accessibilityRole="button" style={styles.retry}>
                  <Text style={styles.retryText}>try opening again</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {editing ? (
            <Text style={[ui.small, ui.center]}>drafts stay here when you go back.</Text>
          ) : (
            <TabBar disabled={controlsDisabled} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function CrayonMarks() {
  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 58" preserveAspectRatio="none" aria-hidden>
        <Path
          d="M13 31 l13 -17 m-10 30 l24 -30 m-8 38 l7 -9 M50 9 l-9 12 m16 -6 l-17 28 M73 7 l-8 12 m-6 28 l8 -10 M87 12 l-8 10 M98 8 l-5 7 m-4 35 l7 -9 M120 7 l-8 9 M137 50 l9 -11 M159 8 l-8 10 M171 49 l7 -9 M194 8 l-7 9 M215 48 l8 -9 M232 10 l-7 7 M250 49 l10 -14 M273 9 l-8 12 m13 6 l-11 18 M289 23 l-14 22"
          stroke={colors.paper}
          strokeWidth={0.8}
          opacity={0.17}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 19, paddingTop: 15, paddingBottom: 12 },
  header: { alignItems: 'center', paddingBottom: 20 },
  titleWrap: { alignItems: 'center' },
  title: {
    fontFamily: fonts.handLight,
    fontSize: 66,
    lineHeight: 86,
    color: colors.ink,
    paddingHorizontal: 12,
  },
  titleUnderline: { width: 128, marginTop: -18, transform: [{ rotate: '-5deg' }] },
  moon: { position: 'absolute', right: 0, top: 5, transform: [{ rotate: '-8deg' }] },
  date: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 23,
    color: colors.ink,
    marginTop: 10,
    textAlign: 'center',
  },
  moodSection: { marginBottom: 20 },
  question: {
    fontFamily: fonts.mono,
    fontSize: 18,
    lineHeight: 28,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodItem: { flex: 1, alignItems: 'center', gap: 4 },
  moodRowLarge: { flexWrap: 'wrap', gap: 12 },
  moodItemLarge: { flexBasis: '45%', flexGrow: 1, flexShrink: 1 },
  moodStamp: { height: 84, width: '100%', alignItems: 'center', justifyContent: 'center' },
  moodLabel: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 24,
    color: colors.ink,
    maxWidth: '100%',
    textAlign: 'center',
  },
  note: {
    paddingHorizontal: 23,
    paddingTop: 20,
    paddingBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 24,
    backgroundColor: '#FFFDF6',
  },
  noteFocused: { borderColor: colors.cobalt, borderWidth: 2 },
  noteLabel: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 23,
    color: colors.ink,
    marginBottom: 12,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: 16,
    lineHeight: 25,
    color: colors.ink,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    outlineStyle: 'none' as never,
    minHeight: 84,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 13,
    paddingBottom: 1,
  },
  mediaLoading: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingTop: 12 },
  smallText: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 15 },
  photoWrap: {
    width: 80,
    height: 96,
    padding: 5,
    paddingBottom: 14,
    backgroundColor: '#FFFDF6',
    transform: [{ rotate: '-3deg' }],
  },
  photo: { width: '100%', height: '100%', borderRadius: 2 },
  removePhoto: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 24,
  },
  weekSection: { marginTop: 18 },
  weekHeading: {
    fontFamily: fonts.mono,
    fontSize: 16,
    lineHeight: 27,
    color: colors.ink,
    marginBottom: 6,
  },
  weekRow: { flexDirection: 'row', gap: 4 },
  weekDay: { flex: 1, alignItems: 'center', gap: 3 },
  weekLetter: { fontFamily: fonts.hand, fontSize: 17, lineHeight: 25, color: colors.ink },
  weekTile: { width: '100%', height: 49, justifyContent: 'center', alignItems: 'center' },
  dash: { fontFamily: fonts.hand, color: colors.ink, fontSize: 22 },
  saveWrap: { marginTop: 16, alignSelf: 'center', width: '82%' },
  saveButton: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  saveText: {
    fontFamily: fonts.handLight,
    fontSize: 30,
    lineHeight: 41,
    color: colors.paper,
    flexShrink: 1,
    textAlign: 'center',
  },
  feedback: { paddingVertical: 7, paddingHorizontal: 8 },
  feedbackText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.muted,
  },
  retry: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  retryText: {
    fontFamily: fonts.mono,
    color: colors.cobalt,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  nav: { backgroundColor: colors.paper, paddingHorizontal: 10 },
  navItems: { flexDirection: 'row', paddingTop: 5 },
  navItem: { flex: 1, minHeight: 56, justifyContent: 'center', alignItems: 'center', gap: 1 },
  navLabel: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 21,
    color: colors.ink,
    maxWidth: '100%',
    textAlign: 'center',
  },
  pressed: { opacity: 0.62 },
  dimmed: { opacity: 0.65 },
});
