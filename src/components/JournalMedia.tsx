import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { attachmentId, persistWebRecording } from '../lib/media';
import type { VoiceNote } from '../lib/journal';
import { colors, fonts } from '../theme';
import { InkSurface } from './InkSurface';
import { SketchIcon, type SketchIconName } from './SketchIcon';

export function MediaButton({
  label,
  icon,
  onPress,
  disabled = false,
  active = false,
}: {
  label: string;
  icon: SketchIconName;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Stop voice recording' : `Add ${label}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <InkSurface
        style={styles.actionFrame}
        stroke={active ? colors.error : colors.ink}
        fill={active ? colors.messy : 'none'}
        radius={15}
      >
        <SketchIcon name={icon} size={43} color={active ? colors.error : colors.ink} />
      </InkSurface>
      <Text style={[styles.label, active && { color: colors.error }]}>{label}</Text>
    </Pressable>
  );
}

function timeLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

const recordingOptions = { ...RecordingPresets.HIGH_QUALITY, directory: 'document' as const };

export function VoiceRecorder({
  disabled,
  hasVoice,
  onCapture,
  onBusy,
  onMessage,
}: {
  disabled: boolean;
  hasVoice: boolean;
  onCapture: (note: VoiceNote) => void;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string) => void;
}) {
  const recorder = useAudioRecorder(recordingOptions);
  const state = useAudioRecorderState(recorder, 250);
  const [working, setWorking] = useState(false);
  const recording = useRef(false);
  const lock = useRef(false);
  const latest = useRef({ onCapture, onBusy, onMessage });
  useEffect(() => {
    latest.current = { onCapture, onBusy, onMessage };
  }, [onCapture, onBusy, onMessage]);

  const stop = useCallback(async () => {
    if (lock.current || !recording.current) return;
    lock.current = true;
    setWorking(true);
    try {
      const duration = recorder.getStatus().durationMillis / 1000;
      await recorder.stop();
      recording.current = false;
      if (!recorder.uri) throw new Error('No recording available.');
      const uri = await persistWebRecording(recorder.uri);
      latest.current.onCapture({ id: attachmentId(), uri, duration });
      latest.current.onMessage('voice note added.');
    } catch {
      latest.current.onMessage('could not keep that recording. please try again.');
    } finally {
      recording.current = false;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      lock.current = false;
      setWorking(false);
      latest.current.onBusy(false);
    }
  }, [recorder]);
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  useEffect(() => {
    if (state.isRecording && state.durationMillis >= 60_000) void stopRef.current();
  }, [state.isRecording, state.durationMillis]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (status) => {
      if (status !== 'active' && recording.current) void stopRef.current();
    });
    return () => listener.remove();
  }, []);

  async function toggle() {
    if (recording.current) {
      await stop();
      return;
    }
    if (lock.current) return;
    if (hasVoice) {
      onMessage('remove your current voice note to record another.');
      return;
    }
    lock.current = true;
    setWorking(true);
    onBusy(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        onMessage(
          'microphone access is off. allow it in your device or browser settings to add a voice note.',
        );
        onBusy(false);
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recording.current = true;
      onMessage('recording... tap stop when you’re done (60 seconds max).');
    } catch {
      onMessage('recording is unavailable here. check microphone access and try again.');
      onBusy(false);
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }

  return (
    <View style={styles.voiceAction}>
      <MediaButton
        label={working ? 'wait...' : state.isRecording ? 'stop' : 'voice'}
        icon="mic"
        active={state.isRecording}
        disabled={working || (disabled && !state.isRecording)}
        onPress={() => void toggle()}
      />
      {state.isRecording ? (
        <Text accessibilityLiveRegion="none" style={styles.timer}>
          {timeLabel(state.durationMillis / 1000)}
        </Text>
      ) : null}
    </View>
  );
}

export function VoicePlayback({
  note,
  onRemove,
  disabled,
  onMessage,
}: {
  note: VoiceNote;
  onRemove?: () => void;
  disabled: boolean;
  onMessage: (message: string) => void;
}) {
  const player = useAudioPlayer(note.uri);
  const state = useAudioPlayerStatus(player);
  useFocusEffect(
    useCallback(
      () => () => {
        try {
          player.pause();
        } catch {
          /* Player may already be released on unmount. */
        }
      },
      [player],
    ),
  );
  async function toggle() {
    try {
      if (state.playing) player.pause();
      else {
        if (state.didJustFinish || state.currentTime >= note.duration) await player.seekTo(0);
        player.play();
      }
    } catch {
      onMessage('could not play this voice note.');
    }
  }
  return (
    <InkSurface style={styles.playback} fill={colors.messy} stroke="none" radius={12}>
      <Pressable
        onPress={() => void toggle()}
        disabled={disabled || !state.isLoaded}
        accessibilityRole="button"
        accessibilityLabel={state.playing ? 'Pause voice note' : 'Play voice note'}
        style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
      >
        {state.isLoaded ? (
          <SketchIcon name={state.playing ? 'pause' : 'play'} size={25} />
        ) : (
          <ActivityIndicator color={colors.ink} />
        )}
      </Pressable>
      <Text style={styles.voiceText}>
        {state.error
          ? 'audio unavailable on this device; original kept in backup'
          : 'a little voice note'}
      </Text>
      <Text style={styles.duration}>
        {timeLabel(state.playing ? state.currentTime : note.duration)}
      </Text>
      {onRemove ? (
        <Pressable
          onPress={() => {
            player.pause();
            onRemove();
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Remove voice note"
          style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
        >
          <SketchIcon name="close" size={24} />
        </Pressable>
      ) : null}
    </InkSurface>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: 'center', minWidth: 66, minHeight: 76, gap: 4 },
  actionFrame: { width: 64, height: 53, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 22, color: colors.ink },
  voiceAction: { alignItems: 'center' },
  timer: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.error,
    position: 'absolute',
    bottom: -15,
  },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
  playback: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 3,
  },
  smallButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  voiceText: { flex: 1, fontFamily: fonts.mono, color: colors.ink, fontSize: 12 },
  duration: { fontFamily: fonts.mono, color: colors.ink, fontSize: 12 },
});
