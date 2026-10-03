import { Text } from 'react-native';
import { router } from 'expo-router';
import { InkSurface } from '../components/InkSurface';
import { InkButton, Page, ui } from '../components/SketchUI';
export default function AboutPage() {
  return (
    <Page title="little days" subtitle="a small sketchbook for a real life.">
      <InkSurface radius={22} style={{ padding: 24, gap: 18 }}>
        <Text style={ui.heading}>your days. your words.</Text>
        <Text style={ui.body}>
          one memory a day, with a feeling, a photo, a voice, or a tiny doodle. there is no perfect
          streak to keep. missing a day is okay.
        </Text>
        <Text style={ui.body}>version 1.0.0. made for iOS, Android, and the web.</Text>
      </InkSurface>
      <Text style={[ui.heading, ui.section]}>privacy, plainly</Text>
      <Text style={ui.body}>
        no analytics, advertising, account, or journal uploads. memories stay in this app’s device
        storage (IndexedDB in the browser). they are not encrypted by Little Days. your device lock
        adds protection; the app lock only gates opening the screen.
      </Text>
      <Text style={[ui.body, { marginTop: 18 }]}>
        time capsules are a date-based ritual, not a secure vault. someone with device access can
        change the date or read local storage. backups contain your text, photos, and voice notes,
        including capsules. don’t share a backup publicly.
      </Text>
      <Text style={[ui.body, { marginTop: 18 }]}>
        clearing browser data or uninstalling the app may remove your memories. export a backup
        regularly. imports add missing days and never replace your existing days or drafts.
        switching browsers or devices doesn’t sync automatically.
      </Text>
      <InkButton
        label="visit the first page again"
        secondary
        onPress={() => router.push('/onboarding')}
      />
    </Page>
  );
}
