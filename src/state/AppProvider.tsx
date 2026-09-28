import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Platform, useColorScheme } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { router } from 'expo-router';
import { palettes, type ThemePreference } from '../theme';
import type { DraftPage, Library, MintDocument } from '../types';
import { deleteDocumentFiles, emptyLibrary, loadLibrary, saveLibrary, storeDocument } from '../services/repository';

function useAppState() {
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const latest = useRef(library);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<DraftPage[]>([]);
  const [draftName, setDraftName] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const system = useColorScheme();
  const mode = library.theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : library.theme;
  const colors = palettes[mode];

  const reload = useCallback(async () => {
    try { const saved = await loadLibrary(); latest.current = saved; setLibrary(saved); setLoadError(''); setReady(true); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'ডেটা পড়া যায়নি।'); }
  }, []);
  useEffect(() => {
    let active = true;
    loadLibrary().then(saved => {
      if (!active) return;
      latest.current = saved; setLibrary(saved); setReady(true);
    }, error => { if (active) setLoadError(error instanceof Error ? error.message : 'ডেটা পড়া যায়নি।'); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);

  function commit(change: (previous: Library) => Library): Promise<void> {
    const task = queue.current.then(async () => {
      const next = change(latest.current);
      await saveLibrary(next); // UI updates only after persistent write succeeds.
      latest.current = next;
      setLibrary(next);
    });
    queue.current = task.catch(() => {});
    return task;
  }

  async function run(work: () => Promise<void>) {
    if (lock.current || !ready) return;
    lock.current = true; setBusy(true); setNotice('');
    try { await work(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'কাজটি করা যায়নি। আবার চেষ্টা করুন।'); }
    finally { lock.current = false; setBusy(false); }
  }

  function nativeOnly() {
    if (Platform.OS !== 'web') return true;
    setNotice('ক্যামেরা, PDF তৈরি ও ফোনে সেভ করার জন্য Android/iOS অ্যাপে খুলুন।');
    return false;
  }

  async function addImages(source: 'camera' | 'gallery', append = false) {
    if (!nativeOnly()) return;
    if (append && draft.length >= 20) { setNotice('একটি PDF-এ সর্বোচ্চ ২০টি পৃষ্ঠা রাখা যাবে।'); return; }
    await run(async () => {
      let pages: DraftPage[];
      if (source === 'camera') {
        const remaining = 20 - (append ? draft.length : 0);
        let result: Awaited<ReturnType<typeof DocumentScanner.scanDocument>>;
        try { result = await DocumentScanner.scanDocument({ croppedImageQuality: 100, maxNumDocuments: remaining }); }
        catch { throw new Error('স্ক্যানার চালু হয়নি। Google Play Services আপডেট করে ইন্টারনেট সংযোগসহ আবার চেষ্টা করুন।'); }
        if (result.status === 'cancel' || !result.scannedImages?.length) return;
        const images = result.scannedImages.slice(0, remaining);
        pages = await Promise.all(images.map(async (uri, index) => {
          const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) =>
            Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
          return { id: `${Date.now()}-${index}`, uri, ...dimensions };
        }));
        if (result.scannedImages.length > remaining) setNotice('এক PDF-এ সর্বোচ্চ ২০টি পৃষ্ঠা রাখা যাবে; অতিরিক্ত পৃষ্ঠা যোগ হয়নি।');
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true,
          selectionLimit: 20 - (append ? draft.length : 0), quality: 0.9, orderedSelection: true });
        if (result.canceled) return;
        if ((append ? draft.length : 0) + result.assets.length > 20) throw new Error('সর্বোচ্চ ২০টি ছবি বেছে নিন।');
        pages = result.assets.map((asset, index) => ({ id: `${Date.now()}-${index}`,
          uri: asset.uri, width: asset.width, height: asset.height }));
      }
      if (append) setDraft(previous => [...previous, ...pages]);
      else setDraft(pages);
      if (!append) {
        setDraftName(`স্ক্যান ${new Date().toLocaleDateString('en-GB').replaceAll('/', '-')}`);
        router.push('/editor');
      }
    });
  }

  async function addDocument(document: MintDocument) {
    try { await commit(previous => ({ ...previous, documents: [document, ...previous.documents] })); }
    catch (error) { await deleteDocumentFiles(document).catch(() => {}); throw error; }
  }

  async function importPdf() {
    if (!nativeOnly()) return;
    await run(async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      try {
        const info = await FileSystem.getInfoAsync(file.uri);
        if (!info.exists || info.size > 50 * 1024 * 1024) throw new Error('৫০ এমবির মধ্যে একটি PDF বেছে নিন।');
        const signature = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64, position: 0, length: 5 });
        if (!signature.startsWith('JVBERi0')) throw new Error('ফাইলটি সঠিক PDF নয়।');
        await addDocument(await storeDocument({ uri: file.uri, name: file.name }));
        router.replace('/documents');
        setNotice('PDF আপনার লাইব্রেরিতে রাখা হয়েছে।');
      } finally {
        // Picker returned a cache copy; never remove the user's original document.
        if (FileSystem.cacheDirectory && file.uri.startsWith(FileSystem.cacheDirectory)) {
          await FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => {});
        }
      }
    });
  }

  return { library, colors, mode, ready, loadError, reload, busy, notice, setNotice, run, nativeOnly,
    draft, setDraft, draftName, setDraftName, reduceMotion, addImages, importPdf, addDocument,
    setTheme: (theme: ThemePreference) => run(() => commit(previous => ({ ...previous, theme }))),
    toggleFavorite: (id: string) => run(() => commit(previous => ({ ...previous,
      documents: previous.documents.map(d => d.id === id ? { ...d, favorite: !d.favorite } : d) }))),
    rename: (id: string, name: string) => commit(previous => ({ ...previous,
      documents: previous.documents.map(d => d.id === id ? { ...d, name: name.trim() } : d) })),
    remove: async (document: MintDocument) => {
      await commit(previous => ({ ...previous, documents: previous.documents.filter(d => d.id !== document.id) }));
      // A failed cleanup may leave an orphan; it cannot corrupt the remaining library.
      await deleteDocumentFiles(document);
    },
  };
}

type AppState = ReturnType<typeof useAppState>;
const AppContext = createContext<AppState | null>(null);
export function AppProvider({ children }: React.PropsWithChildren) {
  return <AppContext.Provider value={useAppState()}>{children}</AppContext.Provider>;
}
export function useApp() {
  const state = useContext(AppContext);
  if (!state) throw new Error('DocMint must be rendered inside AppProvider.');
  return state;
}
