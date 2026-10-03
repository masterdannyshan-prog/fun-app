import { useLocalSearchParams } from 'expo-router';
import { Empty, Page } from '../../components/SketchUI';
import { localDay, validDay } from '../../lib/journal';
import { TodayScreen } from '../../screens/TodayScreen';
export default function EditPage() {
  const { date } = useLocalSearchParams<{ date: string }>();
  if (!validDay(date ?? '') || date > localDay())
    return (
      <Page title="a little day">
        <Empty
          title="this day isn’t ready"
          body="choose today or a day in the past to write a memory."
        />
      </Page>
    );
  return <TodayScreen key={date} day={date} editing />;
}
