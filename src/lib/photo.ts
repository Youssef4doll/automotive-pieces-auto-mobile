import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * A photograph from the shelf, ready to send to the shop.
 *
 * A phone camera takes 12 megapixels and 4–8 MB; the shop refuses anything
 * over 4 MB and never shows a part larger than a phone screen. So every
 * picture is scaled to 1600 px on its long side and saved as JPEG at 0.8
 * before it leaves the phone — a few hundred kilobytes, sent in seconds on a
 * workshop's 3G, and still sharp on the product page's zoom.
 *
 * The shop checks the bytes again on arrival (lib/image-upload on the
 * website); this is about the upload, not about trust.
 */

const LONG_SIDE = 1600;

export type PickedPhoto = { uri: string; width: number; height: number };

/** `null` when the person cancelled, or refused the permission. */
export async function pickPhoto(from: 'camera' | 'library'): Promise<PickedPhoto | null> {
  if (from === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1, allowsEditing: false };
  const result = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return shrink(asset.uri, asset.width, asset.height);
}

async function shrink(uri: string, width: number, height: number): Promise<PickedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > LONG_SIDE) {
    context.resize(width >= height ? { width: LONG_SIDE } : { height: LONG_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

/** A multipart body with the photo under `field`. */
export async function photoForm(field: 'files' | 'file', photo: PickedPhoto): Promise<FormData> {
  const form = new FormData();
  const name = `photo-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    // The browser needs a real Blob; the manipulated image is a blob: or data: URL.
    const blob = await (await fetch(photo.uri)).blob();
    form.append(field, blob, name);
  } else {
    // React Native's FormData reads a file from its URI when given this shape.
    form.append(field, { uri: photo.uri, name, type: 'image/jpeg' } as unknown as Blob);
  }
  return form;
}
