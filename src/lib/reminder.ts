import { Platform } from 'react-native';
export async function setReminder(time: string | null) {
  if (Platform.OS === 'web')
    throw new Error('Daily reminders are available in the installed mobile app, not this browser.');
  const Notifications = await import('expo-notifications');
  if (!time) {
    await Notifications.cancelScheduledNotificationAsync('little-days-daily');
    return;
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error('Use a time like 20:30 (24-hour clock).');
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('little-days', {
      name: 'A little daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (
    !permission.granted &&
    permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
  )
    throw new Error('Notifications are off. Allow them in device settings to receive reminders.');
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: 'little-days-daily',
    content: {
      title: 'A little moment for you',
      body: 'One thing you want to remember from today?',
      data: { url: '/' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'little-days',
    },
  });
}
