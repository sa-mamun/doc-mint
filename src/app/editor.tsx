import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { common, IconButton, Label, Notice, PrimaryButton, Tap } from '../components/ui';
import { buildPdf } from '../services/pdf';
import { storeDocument } from '../services/repository';

export default function EditorScreen() {
  const app = useApp();
  const { colors, draft, setDraft, draftName, setDraftName, busy, run, addImages } = app;
  const [saveStatus, setSaveStatus] = useState('');
  const leave = useCallback(() => {
    if (busy) return;
    const discard = () => { setDraft([]); router.replace('/'); };
    if (!draft.length) return discard();
    Alert.alert('স্ক্যান বাতিল করবেন?', 'সেভ না করা এই পৃষ্ঠাগুলো বাদ যাবে।', [{ text: 'থাকুন', style: 'cancel' }, { text: 'বাতিল করুন', style: 'destructive', onPress: discard }]);
  }, [busy, draft.length, setDraft]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { leave(); return true; });
    return () => subscription.remove();
  }, [leave]);

  async function save() {
    await run(async () => {
      if (!draftName.trim()) throw new Error('ডকুমেন্টের একটি নাম দিন।');
      setSaveStatus('PDF তৈরির প্রস্তুতি চলছে…');
      const result = await buildPdf(draft, (completed, total) => {
        setSaveStatus(`${completed}/${total} পৃষ্ঠা PDF-এ যোগ হচ্ছে…`);
      });
      try {
        setSaveStatus('ফোনে PDF সেভ হচ্ছে…');
        const document = await storeDocument({ uri: result.uri, name: draftName, pageCount: result.pageCount, thumbnailUri: result.thumbnail });
        setSaveStatus('লাইব্রেরি আপডেট হচ্ছে…');
        await app.addDocument(document);
        setDraft([]);
        router.replace(`/document/${document.id}`);
        app.setNotice('PDF ফোনে সেভ হয়েছে।');
      } finally { await result.cleanup(); }
    });
    setSaveStatus('');
  }

  function reorder(index: number, delta: number) {
    const copy = [...draft];
    [copy[index], copy[index + delta]] = [copy[index + delta], copy[index]];
    setDraft(copy);
  }

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
    <Stack.Screen options={{ gestureEnabled: false }} />
    <View style={common.header}><IconButton name="x" label="স্ক্যান বাতিল করুন" disabled={busy} onPress={leave} /><Label strong style={{ fontSize: 19 }}>PDF তৈরি করুন</Label><Label style={{ color: colors.muted }}>{draft.length}/২০</Label></View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={common.content}>
        <Notice /><View style={{ gap: 7 }}><Label strong>ডকুমেন্টের নাম</Label><TextInput accessibilityLabel="ডকুমেন্টের নাম" editable={!busy} value={draftName} maxLength={100} onChangeText={setDraftName} placeholder="নতুন ডকুমেন্ট" placeholderTextColor={colors.muted} style={[common.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]} /></View>
        <Label style={{ fontSize: 12, color: colors.muted }}>পৃষ্ঠা সাজিয়ে নিন। PDF ফোনেই তৈরি হবে, সর্বোচ্চ ২০ পৃষ্ঠা।</Label>
        {draft.map((page, index) => <View key={page.id} style={{ borderRadius: 19, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <Image source={{ uri: page.uri }} style={{ width: '100%', height: 260 }} resizeMode="contain" accessibilityLabel={`পৃষ্ঠা ${index + 1}`} />
          <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 }}><Label style={{ fontSize: 12 }}>পৃষ্ঠা {index + 1}</Label>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              <IconButton name="arrow-up" label={`পৃষ্ঠা ${index + 1} আগে নিন`} disabled={busy || index === 0} onPress={() => reorder(index, -1)} />
              <IconButton name="sliders" label={`পৃষ্ঠা ${index + 1} এডিট করুন`} disabled={busy} onPress={() => router.push(`/page-edit/${page.id}`)} />
              <IconButton name="rotate-cw" label={`পৃষ্ঠা ${index + 1} ঘোরান`} disabled={busy} onPress={() => void run(async () => {
                const rotated = await manipulateAsync(page.uri, [{ rotate: 90 }], { format: SaveFormat.JPEG, compress: 0.95 });
                setDraft(previous => previous.map(item => item.id === page.id ? { ...item, uri: rotated.uri, width: rotated.width, height: rotated.height } : item));
              })} />
              <IconButton name="trash-2" label={`পৃষ্ঠা ${index + 1} বাদ দিন`} disabled={busy} onPress={() => setDraft(previous => previous.filter(item => item.id !== page.id))} />
            </View>
          </View>
        </View>)}
        {!draft.length && <Label style={{ textAlign: 'center', padding: 25, color: colors.muted }}>ছবি বা ক্যামেরা থেকে পৃষ্ঠা যোগ করুন।</Label>}
        <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'space-around' }}>
          <Tap onPress={() => void addImages('camera', true)} disabled={busy || draft.length >= 20}><Label style={{ color: colors.primary }}>+ ক্যামেরা</Label></Tap>
          <Tap onPress={() => void addImages('gallery', true)} disabled={busy || draft.length >= 20}><Label style={{ color: colors.primary }}>+ গ্যালারি</Label></Tap>
        </View>
      </ScrollView>
      <View style={{ padding: 18, gap: 10, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
        {busy && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}><ActivityIndicator color={colors.primary} /><Label accessibilityLiveRegion="polite">{saveStatus || 'কাজ চলছে…'}</Label></View>}
        <PrimaryButton title="PDF সেভ করুন" icon="check" disabled={busy || !draft.length || !draftName.trim()} onPress={() => void save()} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
