import { useCallback, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type CameraCapturedPicture,
} from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InkSurface, PaperGrain } from '../components/InkSurface';
import { back, IconButton, InkButton, LinkText, Notice, ui } from '../components/SketchUI';
import { attachmentId, persistPhoto } from '../lib/media';
import { localDay, validDay } from '../lib/journal';
import { useSketchbook } from '../state/Sketchbook';
import { colors, fonts } from '../theme';

export default function CameraScreen() {
  const { day: requested } = useLocalSearchParams<{ day?: string }>();
  const day = validDay(requested ?? '') && requested! <= localDay() ? requested! : localDay();
  const book = useSketchbook();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 700 || width < 360;
  const cameraHorizontalPadding = width < 360 ? 16 : 24;
  const bottomHorizontalPadding = width < 360 ? 16 : 26;
  const cameraTopPadding = compact ? 12 : 24;
  const cameraBottomPadding = compact ? 8 : 16;
  const cameraMinHeight = compact ? 120 : 180;
  const cameraHeaderSize = compact ? 38 : 43;
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [captured, setCaptured] = useState<CameraCapturedPicture | null>(null);
  // Stable callbacks prevent Expo's web stream hook from restarting on each render.
  const cameraReady = useCallback(() => setReady(true), []);
  const cameraError = useCallback(() => {
    setReady(false);
    setMessage('camera unavailable. choose a photo below or check device access.');
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  async function take() {
    if (!camera.current || busy || (Platform.OS !== 'web' && !ready)) return;
    setBusy(true);
    setMessage('');
    try {
      // On web, onCameraReady reports stream availability, not the first video frame.
      // Retry only that specific readiness error, with a small bounded frame wait.
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const photo = await camera.current.takePictureAsync({
            quality: 0.65,
            base64: Platform.OS === 'web',
            imageType: 'jpg',
          });
          if (!photo) throw new Error('No photo returned.');
          setCaptured(photo);
          break;
        } catch (error) {
          if (Platform.OS !== 'web' || attempt === 9) throw error;
          // Browsers can grant permission before the video element has produced
          // its first frame. Keep trying briefly instead of leaving capture disabled.
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    } catch {
      setMessage('could not take a photo. try again or choose one from your library.');
    } finally {
      setBusy(false);
    }
  }
  async function keep() {
    if (!captured || busy) return;
    if ((book.records[day]?.draft.photos.length ?? 0) >= 3) {
      setMessage('this day already has three photos. remove one before adding another.');
      return;
    }
    setBusy(true);
    try {
      if (Platform.OS === 'web' && !captured.uri.startsWith('data:') && !captured.base64)
        throw new Error('Photo data unavailable.');
      const id = attachmentId();
      const uri =
        Platform.OS === 'web'
          ? captured.uri.startsWith('data:')
            ? captured.uri
            : `data:image/jpeg;base64,${captured.base64}`
          : await persistPhoto(
              {
                uri: captured.uri,
                width: captured.width,
                height: captured.height,
                fileName: `${id}.jpg`,
              },
              id,
            );
      book.updateDraft(day, (draft) => ({ ...draft, photos: [...draft.photos, { id, uri }] }));
      await book.flush();
      if (router.canGoBack()) router.back();
      else router.replace(`/edit/${day}` as Href);
    } catch {
      setMessage('the photo could not be kept. it is still here — try again.');
    } finally {
      setBusy(false);
    }
  }
  async function gallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.65,
        base64: Platform.OS === 'web',
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if ((asset.fileSize ?? 0) > 2_000_000 && Platform.OS === 'web') {
          setMessage('choose a photo under 2 MB.');
          return;
        }
        setCaptured({
          uri: asset.uri,
          base64: asset.base64 ?? undefined,
          width: asset.width,
          height: asset.height,
          format: 'jpg',
        });
      }
    } catch {
      setMessage('could not choose a photo. check library access.');
    }
  }
  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: Math.max(16, insets.bottom),
        backgroundColor: colors.paper,
      }}
    >
      <PaperGrain />
      <View
        style={[
          ui.row,
          { paddingHorizontal: width < 360 ? 8 : 16, paddingTop: compact ? 8 : 16, justifyContent: 'space-between' },
        ]}
      >
        <IconButton icon="close" label="Close camera" onPress={back} disabled={busy} />
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fonts.handLight, fontSize: cameraHeaderSize, color: colors.ink }}
        >
          camera
        </Text>
        <IconButton
          icon="flash"
          label={flash ? 'Turn flash off' : 'Turn flash on'}
          onPress={() => setFlash((value) => !value)}
          disabled={busy || Platform.OS === 'web' || !!captured}
        />
      </View>
      <View style={{ flex: 1, paddingHorizontal: cameraHorizontalPadding, paddingTop: cameraTopPadding, minHeight: cameraMinHeight }}>
        <InkSurface
          radius={25}
          stroke={colors.cobalt}
          strokeWidth={1.8}
          style={{ flex: 1, padding: 5, minHeight: cameraMinHeight }}
        >
          {captured ? (
            <Image
              source={{ uri: captured.uri }}
              style={{ width: '100%', height: '100%', borderRadius: 20 }}
              resizeMode="contain"
              accessibilityLabel="Photo preview before attaching"
            />
          ) : permission?.granted && focused ? (
            <CameraView
              ref={camera}
              style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}
              facing={facing}
              flash={flash ? 'on' : 'off'}
              mode="picture"
              onCameraReady={cameraReady}
              onMountError={cameraError}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 16 }}>
              <Text style={[ui.body, ui.center]}>a little moment, through your lens.</Text>
              <Text style={[ui.small, ui.center]}>
                camera access is only used when you open this page. nothing is uploaded.
              </Text>
              <InkButton
                label="allow camera access"
                onPress={() => {
                  void requestPermission().catch(() =>
                    setMessage('camera permission could not be requested.'),
                  );
                }}
              />
              {permission && !permission.canAskAgain && Platform.OS !== 'web' ? (
                <LinkText onPress={() => void Linking.openSettings()}>
                  open device settings
                </LinkText>
              ) : null}
            </View>
          )}
        </InkSurface>
      </View>
      <View style={{ paddingHorizontal: bottomHorizontalPadding, paddingTop: cameraBottomPadding }}>
        <Notice message={message} />
        {captured ? (
          <>
            <InkButton
              label={busy ? 'keeping...' : 'use this little moment'}
              disabled={busy}
              onPress={() => void keep()}
            />
            <LinkText
              onPress={() => {
                if (!busy) setCaptured(null);
              }}
            >
              retake photo
            </LinkText>
          </>
        ) : (
          <>
            <View style={[ui.row, { justifyContent: 'space-around', paddingVertical: compact ? 8 : 16 }]}>
              <Text style={ui.body}>1×</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take photo"
                disabled={!ready || busy}
                accessibilityState={{ disabled: !ready || busy }}
                onPress={() => void take()}
                style={({ pressed }) => [
                  { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
                  pressed && ui.pressed,
                  (!ready || busy) && { opacity: 0.4 },
                ]}
              >
                <InkSurface
                  fill={colors.cobalt}
                  radius={35}
                  strokeWidth={2}
                  style={{ width: 68, height: 68, borderRadius: 35 }}
                />
              </Pressable>
              <IconButton
                icon="flip"
                label="Switch camera"
                onPress={() => {
                  setReady(false);
                  setFacing((value) => (value === 'back' ? 'front' : 'back'));
                }}
                disabled={busy || !permission?.granted}
              />
            </View>
            <Text style={[ui.small, ui.center]}>take one little moment</Text>
            <LinkText onPress={() => void gallery()}>choose a photo instead</LinkText>
          </>
        )}
      </View>
    </View>
  );
}
