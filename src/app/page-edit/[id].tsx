import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Canvas, ColorMatrix, Image as SkiaImage, Paint, useImage } from '@shopify/react-native-skia';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../state/AppProvider';
import { common, IconButton, Label, PrimaryButton, Tap } from '../../components/ui';
import { makeColorMatrix, exportEditedJpeg, type ScanFilter } from '../../services/image-edit';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const filterOptions: { id: ScanFilter; title: string }[] = [
  { id: 'original', title: 'আসল' },
  { id: 'document', title: 'ডকুমেন্ট' },
  { id: 'grayscale', title: 'গ্রেস্কেল' },
  { id: 'blackwhite', title: 'সাদা-কালো' },
];

export default function PageEditScreen() {
  const app = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const page = app.draft.find(item => item.id === id);
  const [workingUri, setWorkingUri] = useState(page?.uri ?? '');
  const [filter, setFilter] = useState<ScanFilter>('original');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState({ left: 0, top: 0, right: 1, bottom: 1 });
  const [target, setTarget] = useState<'current' | 'all' | 'selected'>('current');
  const [selectedIds, setSelectedIds] = useState<string[]>(id ? [id] : []);
  const [history, setHistory] = useState<{ uri: string; filter: ScanFilter; brightness: number; contrast: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const previewHeight = Math.min(410, width * 1.08);
  const image = useImage(workingUri || null);
  const matrix = useMemo(() => makeColorMatrix(filter, brightness, contrast), [filter, brightness, contrast]);
  const pages = app.draft;
  const stageWidth = width - 36;
  const scale = image ? Math.min(stageWidth / image.width(), previewHeight / image.height()) : 1;
  const renderedWidth = image ? image.width() * scale : stageWidth;
  const renderedHeight = image ? image.height() * scale : previewHeight;
  const imageLeft = (stageWidth - renderedWidth) / 2;
  const imageTop = (previewHeight - renderedHeight) / 2;

  function remember() {
    setHistory(previous => [...previous, { uri: workingUri, filter, brightness, contrast }]);
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setWorkingUri(previous.uri); setFilter(previous.filter); setBrightness(previous.brightness); setContrast(previous.contrast);
    setHistory(items => items.slice(0, -1)); setCrop({ left: 0, top: 0, right: 1, bottom: 1 }); setCropMode(false);
  }

  async function rotate() {
    if (!page) return;
    setBusy(true); setError('');
    try {
      remember();
      const rotated = await manipulateAsync(workingUri, [{ rotate: 90 }], { format: SaveFormat.JPEG, compress: 0.96 });
      setWorkingUri(rotated.uri);
    } catch { setError('ছবি ঘোরানো যায়নি। আবার চেষ্টা করুন।'); }
    finally { setBusy(false); }
  }

  async function applyCrop() {
    if (!image) return;
    setBusy(true); setError('');
    try {
      const originX = Math.max(0, Math.floor(crop.left * image.width()));
      const originY = Math.max(0, Math.floor(crop.top * image.height()));
      const cropWidth = Math.max(1, Math.min(image.width() - originX, Math.floor((crop.right - crop.left) * image.width())));
      const cropHeight = Math.max(1, Math.min(image.height() - originY, Math.floor((crop.bottom - crop.top) * image.height())));
      remember();
      const result = await manipulateAsync(workingUri, [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }], { format: SaveFormat.JPEG, compress: 0.96 });
      setWorkingUri(result.uri); setCrop({ left: 0, top: 0, right: 1, bottom: 1 }); setCropMode(false);
    } catch { setError('ছবির প্রান্ত কাটতে পারেনি। আবার চেষ্টা করুন।'); }
    finally { setBusy(false); }
  }

  async function apply() {
    if (!page) return;
    setBusy(true); setError('');
    try {
      const targets = target === 'current' ? [page] : target === 'all' ? pages : pages.filter(item => selectedIds.includes(item.id));
      if (!targets.length) throw new Error('যে পৃষ্ঠাগুলোতে পরিবর্তন দেবেন, সেগুলো বেছে নিন।');
      const changed = [] as { id: string; uri: string; width: number; height: number }[];
      for (const item of targets) {
        const uri = item.id === page.id ? workingUri : item.uri;
        const output = filter !== 'original' || brightness !== 0 || contrast !== 1 ? await exportEditedJpeg(uri, matrix) : uri;
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => Image.getSize(output, (width, height) => resolve({ width, height }), reject));
        changed.push({ id: item.id, uri: output, width: dimensions.width, height: dimensions.height });
      }
      app.setDraft(previous => previous.map(item => {
        const update = changed.find(result => result.id === item.id);
        return update ? { ...item, originalUri: item.originalUri ?? item.uri, ...update } : item;
      }));
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'পরিবর্তন সেভ করা যায়নি।');
    } finally { setBusy(false); }
  }

  function reset() {
    if (!page) return;
    setWorkingUri(page.originalUri ?? page.uri);
    setFilter('original'); setBrightness(0); setContrast(1); setError('');
    setHistory([]); setCrop({ left: 0, top: 0, right: 1, bottom: 1 }); setCropMode(false);
  }

  if (!page) return <SafeAreaView style={{ flex: 1, backgroundColor: app.colors.background }}><Label>এই পৃষ্ঠাটি পাওয়া যায়নি।</Label></SafeAreaView>;

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: app.colors.background }}>
    <Stack.Screen options={{ title: 'ছবি এডিট করুন', headerShown: false }} />
    <View style={common.header}><IconButton name="x" label="এডিট বন্ধ করুন" disabled={busy} onPress={() => router.back()} /><Label strong style={{ fontSize: 19 }}>ছবি এডিট করুন</Label><Tap accessibilityRole="button" accessibilityLabel="মূল ছবিতে ফিরুন" disabled={busy} onPress={reset}><Label style={{ color: app.colors.primary }}>রিসেট</Label></Tap></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[common.content, { paddingBottom: 32 }]}>
      <View style={{ height: previewHeight, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' }}>
        {image ? <Canvas style={{ width: '100%', height: '100%' }}>
          <SkiaImage image={image} x={0} y={0} width={width - 36} height={previewHeight} fit="contain"><Paint><ColorMatrix matrix={matrix} /></Paint></SkiaImage>
        </Canvas> : <ActivityIndicator color={app.colors.heroAccent} />}
        {cropMode && image && <View pointerEvents="box-none" style={{ position: 'absolute', left: imageLeft, top: imageTop, width: renderedWidth, height: renderedHeight }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: renderedHeight * crop.top, backgroundColor: '#0009' }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: renderedHeight * (1 - crop.bottom), backgroundColor: '#0009' }} />
          <View style={{ position: 'absolute', left: 0, top: renderedHeight * crop.top, bottom: renderedHeight * (1 - crop.bottom), width: renderedWidth * crop.left, backgroundColor: '#0009' }} />
          <View style={{ position: 'absolute', right: 0, top: renderedHeight * crop.top, bottom: renderedHeight * (1 - crop.bottom), width: renderedWidth * (1 - crop.right), backgroundColor: '#0009' }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: renderedWidth * crop.left, top: renderedHeight * crop.top, width: renderedWidth * (crop.right - crop.left), height: renderedHeight * (crop.bottom - crop.top), borderColor: '#fff', borderWidth: 2 }} />
          {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map(corner => <CropDragHandle key={corner} corner={corner} crop={crop} width={renderedWidth} height={renderedHeight} onChange={setCrop} />)}
        </View>}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Tap onPress={() => { setCropMode(value => !value); setCrop({ left: 0, top: 0, right: 1, bottom: 1 }); }} style={{ flex: 1, borderRadius: 13, padding: 11, alignItems: 'center', backgroundColor: cropMode ? app.colors.soft : app.colors.surface, borderWidth: 1, borderColor: cropMode ? app.colors.primary : app.colors.border }}><Label style={{ color: cropMode ? app.colors.primary : app.colors.text }}>✂ প্রান্ত ঠিক করুন</Label></Tap>
        <IconButton name="rotate-ccw" label="সর্বশেষ পরিবর্তন ফিরিয়ে নিন" disabled={busy || !history.length} onPress={undo} />
      </View>
      {cropMode && <View style={{ gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: app.colors.border, backgroundColor: app.colors.surface }}>
        <Label strong>ছবির কোণ টেনে প্রান্ত ঠিক করুন</Label>
        <Label style={{ fontSize: 12, color: app.colors.muted }}>প্রয়োজনে নিচের বোতাম দিয়ে সূক্ষ্মভাবে ঠিক করতে পারবেন।</Label>
        <CropAdjuster title="বাম প্রান্ত" value={crop.left} onChange={value => setCrop(previous => ({ ...previous, left: Math.min(value, previous.right - 0.15) }))} />
        <CropAdjuster title="উপরের প্রান্ত" value={crop.top} onChange={value => setCrop(previous => ({ ...previous, top: Math.min(value, previous.bottom - 0.15) }))} />
        <CropAdjuster title="ডান প্রান্ত" value={1 - crop.right} onChange={value => setCrop(previous => ({ ...previous, right: Math.max(1 - value, previous.left + 0.15) }))} />
        <CropAdjuster title="নিচের প্রান্ত" value={1 - crop.bottom} onChange={value => setCrop(previous => ({ ...previous, bottom: Math.max(1 - value, previous.top + 0.15) }))} />
        <Tap onPress={() => { setCrop({ left: 0, top: 0, right: 1, bottom: 1 }); }} style={{ alignItems: 'center', padding: 6 }}><Label style={{ color: app.colors.primary }}>পুরো ছবিতে ফিরুন</Label></Tap>
        <PrimaryButton title="প্রান্ত কাটুন" icon="check" disabled={busy} onPress={() => void applyCrop()} />
      </View>}
      <View style={{ gap: 8 }}><Label strong>ফিল্টার</Label><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{filterOptions.map(option => <Tap key={option.id} accessibilityRole="button" accessibilityState={{ selected: filter === option.id }} onPress={() => { if (filter !== option.id) { remember(); setFilter(option.id); } }} style={{ borderRadius: 13, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: filter === option.id ? app.colors.soft : app.colors.surface, borderWidth: 1, borderColor: filter === option.id ? app.colors.primary : app.colors.border }}><Label style={{ color: filter === option.id ? app.colors.primary : app.colors.text }}>{option.title}</Label></Tap>)}</View></View>
      <Adjuster title="উজ্জ্বলতা" value={brightness} min={-0.3} max={0.3} step={0.1} format={value => `${Math.round(value * 100)}%`} onChange={value => { if (value !== brightness) remember(); setBrightness(value); }} />
      <Adjuster title="কনট্রাস্ট" value={contrast} min={0.7} max={1.6} step={0.1} format={value => `${Math.round(value * 100)}%`} onChange={value => { if (value !== contrast) remember(); setContrast(value); }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Label style={{ color: app.colors.muted }}>ঘোরানো</Label><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><IconButton name="rotate-cw" label="ছবি ৯০ ডিগ্রি ঘোরান" disabled={busy} onPress={() => void rotate()} /><Label>৯০°</Label></View></View>
      <View style={{ gap: 10, borderTopWidth: 1, borderColor: app.colors.border, paddingTop: 14 }}>
        <Label strong>পরিবর্তন কোথায় প্রয়োগ করবেন?</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>{([['current', 'এই পৃষ্ঠা'], ['all', 'সব পৃষ্ঠা'], ['selected', 'বেছে নিন']] as const).map(([value, title]) => <Tap key={value} onPress={() => setTarget(value)} accessibilityState={{ selected: target === value }} style={{ flex: 1, alignItems: 'center', padding: 8, borderWidth: 1, borderRadius: 12, borderColor: target === value ? app.colors.primary : app.colors.border, backgroundColor: target === value ? app.colors.soft : app.colors.surface }}><Label style={{ fontSize: 12, color: target === value ? app.colors.primary : app.colors.text }}>{title}</Label></Tap>)}</View>
        {target === 'selected' && pages.map((item, index) => <Tap key={item.id} onPress={() => setSelectedIds(previous => previous.includes(item.id) ? previous.filter(value => value !== item.id) : [...previous, item.id])} accessibilityState={{ checked: selectedIds.includes(item.id) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: selectedIds.includes(item.id) ? app.colors.primary : app.colors.border, backgroundColor: selectedIds.includes(item.id) ? app.colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selectedIds.includes(item.id) && <Label style={{ color: app.colors.onPrimary, fontSize: 12 }}>✓</Label>}</View><Label>পৃষ্ঠা {index + 1}{item.id === page.id ? ' · সম্পাদিত' : ''}</Label></Tap>)}
      </View>
      {!!error && <Label accessibilityLiveRegion="polite" style={{ color: app.colors.danger }}>{error}</Label>}
      <PrimaryButton title={busy ? 'ছবি তৈরি হচ্ছে…' : 'পরিবর্তন প্রয়োগ করুন'} icon="check" disabled={busy || !image} onPress={() => void apply()} />
    </ScrollView>
  </SafeAreaView>;
}

function CropAdjuster({ title, value, onChange }: { title: string; value: number; onChange: (value: number) => void }) {
  const colors = useApp().colors;
  const step = 0.025;
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Label>{title}</Label><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><IconButton name="minus" label={`${title} কমান`} disabled={value <= 0} onPress={() => onChange(Math.max(0, value - step))} /><Label style={{ minWidth: 45, textAlign: 'center', color: colors.primary }}>{Math.round(value * 100)}%</Label><IconButton name="plus" label={`${title} বাড়ান`} disabled={value >= 0.42} onPress={() => onChange(Math.min(0.42, value + step))} /></View></View>;
}

type CropBounds = { left: number; top: number; right: number; bottom: number };
type CropCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

function CropDragHandle({ corner, crop, width, height, onChange }: { corner: CropCorner; crop: CropBounds; width: number; height: number; onChange: React.Dispatch<React.SetStateAction<CropBounds>> }) {
  const start = useRef(crop);
  const latest = useRef({ crop, width, height, onChange });
  const [responder, setResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  useEffect(() => {
    latest.current = { crop, width, height, onChange };
  }, [crop, width, height, onChange]);
  useEffect(() => {
    setResponder(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { start.current = latest.current.crop; },
      onPanResponderMove: (_, gesture) => {
        const { width: currentWidth, height: currentHeight, onChange: update } = latest.current;
        const initial = start.current;
        const dx = gesture.dx / Math.max(currentWidth, 1);
        const dy = gesture.dy / Math.max(currentHeight, 1);
        const next = { ...initial };
        if (corner.endsWith('Left')) next.left = Math.max(0, Math.min(initial.right - 0.15, initial.left + dx));
        else next.right = Math.min(1, Math.max(initial.left + 0.15, initial.right + dx));
        if (corner.startsWith('top')) next.top = Math.max(0, Math.min(initial.bottom - 0.15, initial.top + dy));
        else next.bottom = Math.min(1, Math.max(initial.top + 0.15, initial.bottom + dy));
        update(next);
      },
      onPanResponderTerminationRequest: () => false,
    }));
  }, [corner]);
  const isLeft = corner.endsWith('Left');
  const isTop = corner.startsWith('top');
  const x = (isLeft ? crop.left : crop.right) * width;
  const y = (isTop ? crop.top : crop.bottom) * height;
  return <View {...responder?.panHandlers} accessibilityRole="adjustable" accessibilityLabel="ছবির ক্রপের কোণ টানুন" style={{ position: 'absolute', left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: '#4361ee', elevation: 4 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4361ee' }} />
  </View>;
}

function Adjuster({ title, value, min, max, step, format, onChange }: { title: string; value: number; min: number; max: number; step: number; format: (value: number) => string; onChange: (value: number) => void }) {
  const { colors } = useApp();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <Label strong>{title}</Label><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconButton name="minus" label={`${title} কমান`} disabled={value <= min} onPress={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))} />
      <Label style={{ width: 48, textAlign: 'center', color: colors.primary }}>{format(value)}</Label>
      <IconButton name="plus" label={`${title} বাড়ান`} disabled={value >= max} onPress={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))} />
    </View>
  </View>;
}

