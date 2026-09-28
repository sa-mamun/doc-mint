import { Skia, ImageFormat } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';

export type ScanFilter = 'original' | 'document' | 'grayscale' | 'blackwhite';

export function makeColorMatrix(filter: ScanFilter, brightness: number, contrast: number) {
  const mono = filter === 'grayscale' || filter === 'blackwhite';
  const weights = mono ? [0.213, 0.715, 0.072] : [1, 0, 0];
  const factor = filter === 'blackwhite' ? Math.max(contrast, 1.6) : filter === 'document' ? contrast * 1.22 : contrast;
  const offset = 0.5 * (1 - factor) + brightness + (filter === 'document' ? 0.04 : 0);
  return [
    weights[0] * factor, weights[1] * factor, weights[2] * factor, 0, offset,
    (mono ? weights[0] : 0) * factor, (mono ? weights[1] : 1) * factor, (mono ? weights[2] : 0) * factor, 0, offset,
    (mono ? weights[0] : 0) * factor, (mono ? weights[1] : 0) * factor, (mono ? weights[2] : 1) * factor, 0, offset,
    0, 0, 0, 1, 0,
  ];
}

export async function exportEditedJpeg(uri: string, matrix: number[]) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const data = Skia.Data.fromBase64(base64);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('ছবিটি এডিট করার জন্য খোলা যায়নি।');
  const surface = Skia.Surface.Make(image.width(), image.height());
  if (!surface) throw new Error('ছবি এডিট করার জায়গা তৈরি হয়নি।');

  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
  surface.getCanvas().drawImage(image, 0, 0, paint);
  surface.flush();
  const output = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 90);
  if (!output) throw new Error('এডিট করা ছবি তৈরি হয়নি।');
  const target = `${FileSystem.cacheDirectory}docmint-edit-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  await FileSystem.writeAsStringAsync(target, output, { encoding: FileSystem.EncodingType.Base64 });
  return target;
}
