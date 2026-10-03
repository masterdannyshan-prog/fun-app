import { router } from 'expo-router';
import { Empty, Page } from '../components/SketchUI';
export default function NotFound() {
  return (
    <Page title="a loose page">
      <Empty
        title="this page wandered off"
        body="your memories are still in your sketchbook."
        action="back to today"
        onPress={() => router.replace('/')}
      />
    </Page>
  );
}
