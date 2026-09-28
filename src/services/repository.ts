import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { Library, MintDocument } from '../types';

const KEY = 'docmint.library.v1';
export const emptyLibrary: Library = { version: 1, theme: 'system', documents: [] };

export function documentDirectory() {
  if (!FileSystem.documentDirectory) throw new Error('ফোনের ফাইল স্টোরেজ পাওয়া যায়নি।');
  return `${FileSystem.documentDirectory}doc-mint/`;
}

export function documentUri(document: MintDocument) { return documentDirectory() + document.fileName; }
export function thumbnailUri(document: MintDocument) {
  return document.thumbnailName ? documentDirectory() + document.thumbnailName : undefined;
}

export async function loadLibrary(): Promise<Library> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...emptyLibrary, documents: [] };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('ফাইলের তালিকা পড়া যায়নি।');
  const data = value as Library;
  if (data.version !== 1 || !['system', 'light', 'dark'].includes(data.theme) || !Array.isArray(data.documents)) {
    throw new Error('ফাইলের তালিকার ফরম্যাট সঠিক নয়। ডেটা অপরিবর্তিত আছে।');
  }
  for (const doc of data.documents) {
    if (typeof doc.id !== 'string' || typeof doc.name !== 'string' || typeof doc.fileName !== 'string' ||
        !/^[\w-]+\.pdf$/.test(doc.fileName) || !Number.isFinite(doc.size) || !Number.isFinite(doc.createdAt) ||
        typeof doc.favorite !== 'boolean' || (doc.thumbnailName !== undefined && !/^[\w-]+\.jpg$/.test(doc.thumbnailName))) {
      throw new Error('একটি ফাইলের তথ্য পড়া যায়নি। ডেটা অপরিবর্তিত আছে।');
    }
  }
  return data;
}

export async function saveLibrary(data: Library) { await AsyncStorage.setItem(KEY, JSON.stringify(data)); }

export async function storeDocument(input: {
  uri: string; name: string; pageCount?: number; thumbnailUri?: string;
}): Promise<MintDocument> {
  await FileSystem.makeDirectoryAsync(documentDirectory(), { intermediates: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const fileName = `${id}.pdf`;
  const thumbnailName = input.thumbnailUri ? `${id}.jpg` : undefined;
  try {
    await FileSystem.copyAsync({ from: input.uri, to: documentDirectory() + fileName });
    if (input.thumbnailUri && thumbnailName) {
      await FileSystem.copyAsync({ from: input.thumbnailUri, to: documentDirectory() + thumbnailName });
    }
    const info = await FileSystem.getInfoAsync(documentDirectory() + fileName);
    if (!info.exists) throw new Error('PDF সেভ হয়নি। আবার চেষ্টা করুন।');
    return { id, name: input.name.trim().replace(/\.pdf$/i, '') || 'নতুন ডকুমেন্ট', fileName,
      thumbnailName, createdAt: Date.now(), pageCount: input.pageCount, size: info.size, favorite: false };
  } catch (error) {
    await FileSystem.deleteAsync(documentDirectory() + fileName, { idempotent: true }).catch(() => {});
    if (thumbnailName) await FileSystem.deleteAsync(documentDirectory() + thumbnailName, { idempotent: true }).catch(() => {});
    throw error;
  }
}

// Only files owned by DocMint are deleted; original camera/gallery/import files are never deleted.
export async function deleteDocumentFiles(document: MintDocument) {
  await FileSystem.deleteAsync(documentUri(document), { idempotent: true });
  const thumb = thumbnailUri(document);
  if (thumb) await FileSystem.deleteAsync(thumb, { idempotent: true });
}
