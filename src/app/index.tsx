import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Redirect } from 'expo-router';
import { useSketchbook } from '../state/Sketchbook';
import { localDay } from '../lib/journal';
import { TodayScreen } from '../screens/TodayScreen';

export default function TodayPage() {
  const book = useSketchbook();
  const [day, setDay] = useState(localDay);
  useEffect(() => {
    const update = () => setDay(localDay());
    const timer = setInterval(update, 60_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  if (!book.settings.onboarded && !Object.keys(book.records).length)
    return <Redirect href="/onboarding" />;
  return <TodayScreen key={day} day={day} />;
}
