import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { DraftPage } from '../types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 20;
const MAX_IMAGE_EDGE = 1600;

export async function buildPdf(
  pages: DraftPage[],
  onProgress?: (completed: number, total: number) => void,
) {
  if (!pages.length || pages.length > 20) throw new Error('১ থেকে ২০টি পৃষ্ঠা বেছে নিন।');
  if (!FileSystem.cacheDirectory) throw new Error('ফোনের অস্থায়ী স্টোরেজ পাওয়া যায়নি।');

  const processed: string[] = [];
  let thumbnail: string | undefined;
  let outputUri: string | undefined;
  const pdf = await PDFDocument.create();

  try {
    for (const [index, page] of pages.entries()) {
      const resize = Math.max(page.width, page.height) > MAX_IMAGE_EDGE
        ? [{ resize: page.width >= page.height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE } }]
        : [];
      const image = await manipulateAsync(page.uri, resize, {
        compress: 0.78,
        format: SaveFormat.JPEG,
      });
      processed.push(image.uri);
      thumbnail ??= image.uri;

      const base64 = await FileSystem.readAsStringAsync(image.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const embedded = await pdf.embedJpg(base64);
      const scale = Math.min(
        (PAGE_WIDTH - PAGE_MARGIN * 2) / embedded.width,
        (PAGE_HEIGHT - PAGE_MARGIN * 2) / embedded.height,
      );
      const width = embedded.width * scale;
      const height = embedded.height * scale;
      const outputPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      outputPage.drawImage(embedded, {
        x: (PAGE_WIDTH - width) / 2,
        y: (PAGE_HEIGHT - height) / 2,
        width,
        height,
      });
      onProgress?.(index + 1, pages.length);
    }

    outputUri = `${FileSystem.cacheDirectory}docmint-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const base64 = await pdf.saveAsBase64({ dataUri: false });
    await FileSystem.writeAsStringAsync(outputUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const info = await FileSystem.getInfoAsync(outputUri);
    if (!info.exists || !info.size) throw new Error('PDF ফাইল তৈরি হয়নি। আবার চেষ্টা করুন।');

    return {
      uri: outputUri,
      pageCount: pages.length,
      thumbnail,
      async cleanup() {
        await Promise.all([...processed, outputUri!].map(file =>
          FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {}),
        ));
      },
    };
  } catch (error) {
    await Promise.all([...processed, ...(outputUri ? [outputUri] : [])].map(file =>
      FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {}),
    ));
    throw error;
  }
}
