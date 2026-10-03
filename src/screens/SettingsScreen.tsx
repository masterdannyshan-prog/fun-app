import { useState } from 'react';
import { Linking, Platform, Pressable, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { InkRule, InkSurface } from '../components/InkSurface';
import { SketchIcon, type SketchIconName } from '../components/SketchIcon';
import { Field, InkButton, LinkText, Notice, Page, ui } from '../components/SketchUI';
import { exportBook, exportRecovery, pickBackup } from '../lib/backup';
import { setReminder } from '../lib/reminder';
import { useSketchbook } from '../state/Sketchbook';
import { colors } from '../theme';

function SettingRow({
  icon,
  title,
  value,
  onPress,
  children,
  disabled = false,
}: {
  icon: SketchIconName;
  title: string;
  value?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <>
      <SketchIcon name={icon} size={29} />
      <View style={{ flex: 1 }}>
        <Text style={ui.body}>{title}</Text>
        {value ? <Text style={ui.small}>{value}</Text> : null}
      </View>
      {children ?? (onPress ? <SketchIcon name="arrow" size={22} /> : null)}
    </>
  );
  return (
    <View>
      <InkRule />
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}${value ? `, ${value}` : ''}`}
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [
            ui.row,
            { minHeight: 70, paddingVertical: 12 },
            pressed && ui.pressed,
            disabled && { opacity: 0.5 },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={[ui.row, { minHeight: 70, paddingVertical: 12 }]}>{content}</View>
      )}
    </View>
  );
}
export default function SettingsScreen() {
  const book = useSketchbook();
  const { restore } = useLocalSearchParams<{ restore?: string }>();
  const [message, setMessage] = useState(
    restore
      ? 'choose your Little Days .backup.json file below. existing memories and drafts will be kept.'
      : '',
  );
  const [busy, setBusy] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [time, setTime] = useState(book.settings.reminder ?? '20:30');
  const count = Object.values(book.records).filter((record) => record.saved).length;
  async function work(action: () => Promise<void>, success = '') {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'could not keep that change. please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function lock(value: boolean) {
    if (Platform.OS === 'web')
      throw new Error(
        'Device authentication is available in the installed mobile app. Browser storage is not encrypted.',
      );
    if (
      (await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE
    )
      throw new Error('Set up a fingerprint, face, or device passcode first.');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: value ? 'Protect your sketchbook' : 'Turn off sketchbook lock',
    });
    if (!result.success)
      throw new Error('Authentication was cancelled. Your lock setting has not changed.');
    await book.configure({ lock: value });
  }
  async function reminder(value: string | null) {
    await setReminder(value);
    try {
      await book.configure({ reminder: value });
    } catch (error) {
      await setReminder(book.settings.reminder).catch(() => {});
      throw error;
    }
    setReminderOpen(false);
  }
  async function restoreBook() {
    const backup = await pickBackup();
    if (!backup) {
      setMessage('import cancelled. nothing changed.');
      return;
    }
    const imported = await book.importRecords(backup.records, backup.capsules);
    await book.configure({ onboarded: true });
    setMessage(
      `${imported} day${imported === 1 ? '' : 's'} imported. existing dates and drafts were kept; new capsules were added.`,
    );
  }
  return (
    <Page title="settings" tabs error={book.error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open my sketchbook calendar"
        onPress={() => router.replace('/year')}
        style={({ pressed }) => [pressed && ui.pressed]}
      >
        <InkSurface radius={20} style={[ui.row, { padding: 21 }]}>
          <SketchIcon name="book" size={58} />
          <View style={{ flex: 1 }}>
            <Text style={ui.heading}>my sketchbook</Text>
            <Text style={ui.small}>
              {count} little {count === 1 ? 'memory' : 'memories'} kept
            </Text>
          </View>
          <SketchIcon name="arrow" size={25} />
        </InkSurface>
      </Pressable>
      <Notice message={message} />
      <Text accessibilityRole="header" style={[ui.heading, ui.section]}>
        your rhythm
      </Text>
      <SettingRow
        icon="moon"
        title="daily reminder"
        value={Platform.OS === 'web' ? 'mobile app only' : (book.settings.reminder ?? 'off')}
        onPress={() => {
          if (Platform.OS === 'web')
            setMessage('daily reminders use device notifications in the installed mobile app.');
          else setReminderOpen((value) => !value);
        }}
        disabled={busy}
      />
      {reminderOpen ? (
        <InkSurface radius={15} style={{ padding: 16, marginVertical: 8 }}>
          <Field
            label="reminder time (24-hour HH:MM)"
            value={time}
            onChangeText={setTime}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
          />
          <InkButton
            label="keep this reminder"
            disabled={busy}
            onPress={() => void work(() => reminder(time), 'a gentle daily reminder is set.')}
          />
          <LinkText onPress={() => void work(() => reminder(null), 'reminder turned off.')}>
            turn reminder off
          </LinkText>
        </InkSurface>
      ) : null}
      <SettingRow
        icon="calendar"
        title="week starts on"
        value={book.settings.sunday ? 'sunday' : 'monday'}
        onPress={() =>
          void work(() => book.configure({ sunday: !book.settings.sunday }), 'calendar updated.')
        }
        disabled={busy}
      />
      <Text accessibilityRole="header" style={[ui.heading, ui.section]}>
        make it yours
      </Text>
      <SettingRow
        icon="sun"
        title="colors & doodles"
        value="the little marks that make a day"
        onPress={() => router.push('/personalize')}
      />
      <SettingRow
        icon="book"
        title="writing style"
        value={book.settings.writing === 'mono' ? 'typewriter' : 'handwritten'}
        onPress={() =>
          void work(
            () => book.configure({ writing: book.settings.writing === 'mono' ? 'hand' : 'mono' }),
            'writing style updated.',
          )
        }
        disabled={busy}
      />
      <Text accessibilityRole="header" style={[ui.heading, ui.section]}>
        privacy & keeping
      </Text>
      <SettingRow
        icon="lock"
        title="lock my sketchbook"
        value={
          Platform.OS === 'web'
            ? 'device authentication: mobile only'
            : 'device authentication, not file encryption'
        }
      >
        <Switch
          accessibilityLabel="Lock my sketchbook"
          value={book.settings.lock}
          disabled={busy || Platform.OS === 'web'}
          trackColor={{ false: colors.intense, true: colors.cobalt }}
          onValueChange={(value) =>
            void work(
              () => lock(value),
              value
                ? 'lock is on. your next app opening will ask for device authentication.'
                : 'lock is off.',
            )
          }
        />
      </SettingRow>
      <SettingRow
        icon="cloud"
        title="stored on this device"
        value="no cloud sync or account. keep a backup."
      />
      <SettingRow
        icon="share"
        title="export my memories"
        value="portable backup with photos & voice notes"
        disabled={busy}
        onPress={() =>
          void work(async () => {
            await book.flush();
            if (book.corrupt.length)
              throw new Error(
                'Some data is unreadable. Export a recovery copy first; a normal backup would be incomplete.',
              );
            await exportBook(book.records, book.capsules);
          }, 'backup prepared. save it somewhere you trust.')
        }
      />
      <SettingRow
        icon="envelope"
        title="import a sketchbook"
        value="add missing days; never overwrite existing ones"
        disabled={busy}
        onPress={() => {
          if (!busy) {
            setBusy(true);
            setMessage('');
            void restoreBook()
              .catch((error) =>
                setMessage(
                  `import stopped: ${error instanceof Error ? error.message : 'storage failed'}. any days already imported remain safe; you can retry.`,
                ),
              )
              .finally(() => setBusy(false));
          }
        }}
      />
      {book.corrupt.length ? (
        <>
          <SettingRow
            icon="share"
            title="export a recovery copy"
            value="preserve unreadable records exactly as stored"
            disabled={busy}
            onPress={() =>
              void work(
                exportRecovery,
                'raw recovery copy prepared. it is for repair, not regular import.',
              )
            }
          />
          <LinkText onPress={() => void work(book.reload)}>try reading storage again</LinkText>
        </>
      ) : null}
      <Text accessibilityRole="header" style={[ui.heading, ui.section]}>
        a little help
      </Text>
      <SettingRow
        icon="book"
        title="about little days"
        value="version 1.0 · your memories belong to you"
        onPress={() => router.push('/about')}
      />
      <SettingRow
        icon="envelope"
        title="feedback & help"
        value="open the project’s GitHub issues"
        onPress={() =>
          void Linking.openURL('https://github.com/masterdannyshan-prog/fun-app/issues').catch(() =>
            setMessage('could not open GitHub. try again.'),
          )
        }
      />
      <LinkText onPress={() => router.push('/capsules')}>my time capsules</LinkText>
      <Text style={[ui.small, ui.center, { marginTop: 16 }]}>
        uninstalling the app or clearing browser data can erase your sketchbook. backups are private
        too — keep them carefully.
      </Text>
      <Text style={[ui.small, ui.center, { marginTop: 24 }]}>your memories belong to you.</Text>
      {busy ? <Notice message="keeping your change..." /> : null}
    </Page>
  );
}
