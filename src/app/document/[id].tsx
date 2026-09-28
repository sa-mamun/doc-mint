import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { useApp } from '../../state/AppProvider';
import { documentUri, thumbnailUri } from '../../services/repository';
import { common, Icon, IconButton, Label, Notice, PrimaryButton, Tap } from '../../components/ui';
import { formatSize } from '../../components/Workspace';

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const { colors, busy, run } = app;
  const document = app.library.documents.find(item => item.id === id);
  const [editedName, setName] = useState<string | null>(null);
  const name = editedName ?? document?.name ?? '';
  async function fileUri() {
    if (!document) throw new Error('ডকুমেন্টটি পাওয়া যায়নি।');
    const uri = documentUri(document);
    if (!(await FileSystem.getInfoAsync(uri)).exists) throw new Error('PDF ফাইলটি ফোনে পাওয়া যায়নি।');
    return uri;
  }
  function remove() {
    if (!document) return;
    Alert.alert('ফাইল মুছে ফেলবেন?', 'শুধু DocMint-এর কপি মুছবে। এটি ফেরানো যাবে না।', [{ text: 'বাতিল', style: 'cancel' },
      { text: 'মুছে ফেলুন', style: 'destructive', onPress: () => void run(async () => { await app.remove(document); router.replace('/documents'); }) }]);
  }
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={common.header}><IconButton disabled={busy} name="arrow-left" label="ফাইলের তালিকায় ফিরুন" onPress={() => router.replace('/documents')} /><Label strong style={{ fontSize: 18 }}>ডকুমেন্ট</Label><View style={{ width: 44 }} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={common.content}>
      <Notice />
      {!document ? <Label>ডকুমেন্টটি পাওয়া যায়নি।</Label> : <>
        <View style={{ backgroundColor: colors.surface, borderRadius: 22, minHeight: 220, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, padding: 18, gap: 15 }}>
          {thumbnailUri(document) ? <Image source={{ uri: thumbnailUri(document) }} style={{ width: '100%', height: 260 }} resizeMode="contain" accessibilityLabel="প্রথম পৃষ্ঠার প্রিভিউ" /> : <><Icon name="file-text" size={70} color={colors.primary} /><Label style={{ color: colors.muted }}>PDF ডকুমেন্ট</Label></>}
        </View>
        <View><Label strong style={{ fontSize: 19 }}>{document.name}</Label><Label style={{ fontSize: 12, color: colors.muted }}>{document.pageCount ? `${document.pageCount} পৃষ্ঠা · ` : ''}{formatSize(document.size)} · {new Date(document.createdAt).toLocaleDateString('en-GB')}</Label></View>
        <PrimaryButton title="শেয়ার / বাইরে সেভ করুন" icon="share" disabled={busy} onPress={() => void run(async () => {
          const uri = await fileUri();
          if (!(await Sharing.isAvailableAsync())) throw new Error('এই ডিভাইসে শেয়ার করা যাচ্ছে না।');
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: document.name });
        })} />
        <View style={{ flexDirection: 'row', gap: 20, justifyContent: 'space-around' }}>
          <Tap disabled={busy} onPress={() => void run(async () => { await Print.printAsync({ uri: await fileUri() }); })} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Icon name="printer" color={colors.primary} /><Label style={{ color: colors.primary }}>প্রিন্ট</Label></Tap>
          <Tap disabled={busy} onPress={() => void app.toggleFavorite(document.id)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Icon name={document.favorite ? 'star' : 'bookmark'} color={colors.primary} /><Label style={{ color: colors.primary }}>{document.favorite ? 'পছন্দের থেকে বাদ' : 'পছন্দের তালিকায়'}</Label></Tap>
        </View>
        <View style={{ gap: 8 }}><Label strong>নাম পরিবর্তন</Label><TextInput editable={!busy} accessibilityLabel="ফাইলের নতুন নাম" value={name} onChangeText={setName} maxLength={100} style={[common.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
          <Tap disabled={busy || !name.trim() || name.trim() === document.name} onPress={() => void run(async () => { await app.rename(document.id, name.trim()); app.setNotice('নাম পরিবর্তন হয়েছে।'); })} style={{ justifyContent: 'center' }}><Label style={{ color: colors.primary }}>নাম সেভ করুন</Label></Tap>
        </View>
        <Tap disabled={busy} onPress={remove} style={{ flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 10 }}><Icon name="trash-2" color={colors.danger} /><Label style={{ color: colors.danger }}>এই ফাইল মুছে ফেলুন</Label></Tap>
      </>}
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
