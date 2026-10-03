import { Kalam_300Light } from '@expo-google-fonts/kalam/300Light';
import { Kalam_400Regular } from '@expo-google-fonts/kalam/400Regular';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { SketchbookProvider } from '../state/Sketchbook';

export default function RootLayout() {
  const [loaded, error] = useFonts({ Kalam_300Light, Kalam_400Regular, SpaceMono_400Regular });
  if (!loaded && !error)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.cobalt} />
        <Text style={styles.loadingText}>opening your sketchbook...</Text>
      </View>
    );
  return (
    <SafeAreaProvider>
      <View style={styles.desk}>
        <View style={styles.app}>
          <StatusBar style="dark" />
          <SketchbookProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.paper },
                animation: 'none',
              }}
            />
          </SketchbookProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { color: colors.ink, fontSize: 16 },
  desk: { flex: 1, backgroundColor: colors.desk, alignItems: 'center' },
  app: { width: '100%', maxWidth: 480, flex: 1, backgroundColor: colors.paper },
});
