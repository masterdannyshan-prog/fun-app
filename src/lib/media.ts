import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

export function attachmentId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
export async function persistPhoto(asset: ImagePickerAsset, id: string): Promise<string> {
  if (Platform.OS === 'web') {
    if (!asset.base64) throw new Error('The photo could not be read.');
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }
  const extension =
    asset.fileName
      ?.split('.')
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const target = new File(Paths.document, `little-days-${id}.${extension}`);
  await new File(asset.uri).copy(target);
  return target.uri;
}
export async function persistWebRecording(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read voice note.'));
    reader.onerror = () => reject(new Error('Could not read voice note.'));
    reader.readAsDataURL(blob);
  });
}
