import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { thumbnailUri } from '../services/repository';
import type { MintDocument } from '../types';
import { common, Icon, IconButton, Label, Notice, Tap } from './ui';

export function formatSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function PaperArt() {
  return <View accessible={false} style={{ width: 86, height: 112, transform: [{ rotate: '7deg' }] }}>
    <View style={{ position: 'absolute', inset: 0, backgroundColor: '#7083A6', opacity: 0.45, borderRadius: 9, transform: [{ rotate: '-15deg' }, { translateX: -7 }] }} />
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 9, padding: 12, gap: 6 }}>
      <View style={{ backgroundColor: '#EAF0FF', width: 24, borderRadius: 4, marginBottom: 7 }}><Label style={{ fontSize: 7, lineHeight: 22, textAlign: 'center', color: '#335CDE' }}>PDF</Label></View>
      {[1, 2, 3].map(n => <View key={n} style={{ height: 3, width: n === 3 ? '65%' : '100%', borderRadius: 2, backgroundColor: '#DCE2EC' }} />)}
      <View style={{ height: 9, width: 26, borderBottomWidth: 2, borderColor: '#335CDE', alignSelf: 'flex-end', transform: [{ rotate: '-12deg' }] }} />
    </View>
  </View>;
}

function HeroRings() {
  return <View pointerEvents="none" style={{ position: 'absolute', width: 190, height: 190, right: -8, top: -27 }}>
    <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(173,196,255,0.10)' }} />
    <View style={{ position: 'absolute', width: 150, height: 150, left: 24, top: 18, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(173,196,255,0.12)' }} />
  </View>;
}

function DocumentRow({ document }: { document: MintDocument }) {
  const { colors, toggleFavorite, busy } = useApp();
  const thumbnail = thumbnailUri(document);
  return <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderColor: colors.border, paddingVertical: 13 }}>
    <View style={{ flex: 1 }}><Tap onPress={() => router.push(`/document/${document.id}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      {thumbnail ? <Image source={{ uri: thumbnail }} style={{ width: 43, height: 56, borderRadius: 7, backgroundColor: colors.surface }} resizeMode="cover" /> :
        <View style={{ width: 43, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><Icon name="file-text" color={colors.primary} /></View>}
      <View style={{ flex: 1 }}><Label numberOfLines={1} strong style={{ fontSize: 13 }}>{document.name}</Label>
        <Label style={{ fontSize: 11, lineHeight: 18, color: colors.muted, marginTop: 4 }}>{document.pageCount ? `${document.pageCount} পৃষ্ঠা · ` : ''}{formatSize(document.size)} · {new Date(document.createdAt).toLocaleDateString('en-GB')}</Label>
      </View>
    </Tap></View>
    <Tap disabled={busy} accessibilityLabel={`${document.name}: পছন্দের তালিকা পরিবর্তন`} accessibilityState={{ selected: document.favorite }} onPress={() => void toggleFavorite(document.id)} style={{ width: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={document.favorite ? 'star' : 'bookmark'} color={document.favorite ? colors.primary : colors.muted} size={19} />
    </Tap>
  </View>;
}

export function Workspace({ tab }: { tab: 'home' | 'documents' | 'favorites' }) {
  const { library, colors, mode, busy, importPdf, addImages, setNotice, setTheme } = useApp();
  const [query, setQuery] = useState('');
  const documents = useMemo(() => library.documents.filter(d => (tab !== 'favorites' || d.favorite) &&
    d.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, tab === 'home' ? 6 : undefined), [library.documents, tab, query]);
  const heading = tab === 'home' ? 'আপনার ডকুমেন্ট স্টুডিও' : tab === 'documents' ? 'আমার ফাইল' : 'পছন্দের ফাইল';
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={common.header}>
      <View style={[common.row, { gap: 9 }]}>
        <Icon name="maximize" color={colors.primary} size={20} />
        <Label strong style={{ fontFamily: undefined, fontSize: 19, lineHeight: 28, letterSpacing: -0.5 }}>DocMint</Label>
        <View style={{ backgroundColor: colors.soft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}><Label style={{ fontFamily: undefined, fontSize: 10, color: colors.primary, lineHeight: 20 }}>PDF</Label></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton name={mode === 'dark' ? 'sun' : 'moon'} label={mode === 'dark' ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'} onPress={() => void setTheme(mode === 'dark' ? 'light' : 'dark')} />
      </View>
    </View>
    <FlatList data={documents} keyExtractor={item => item.id} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}
      renderItem={({ item }) => <DocumentRow document={item} />} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      ListHeaderComponent={<View>
        <Notice />
        <Label strong style={[common.title, { marginTop: 14, fontSize: 22, lineHeight: 35 }]}>{heading}</Label>
        <Label style={{ fontSize: 12, color: colors.muted, marginTop: 0, marginBottom: 19 }}>{tab === 'home' ? 'স্ক্যান, গুছিয়ে রাখা আর শেয়ার—সহজেই।' : `${library.documents.filter(d => tab !== 'favorites' || d.favorite).length}টি ডকুমেন্ট · ফোনে সেভ করা`}</Label>
        {tab === 'home' ? <>
          <Tap disabled={busy} onPress={() => void addImages('camera')} accessibilityLabel="ক্যামেরা দিয়ে নতুন স্ক্যান" style={{ backgroundColor: colors.hero, borderRadius: 21, paddingHorizontal: 21, paddingVertical: 17, minHeight: 180, flexDirection: 'row', gap: 12, alignItems: 'center', overflow: 'hidden' }}>
            <HeroRings />
            <View style={{ flex: 1, gap: 8 }}><Label style={{ fontFamily: undefined, fontSize: 9, letterSpacing: 1.7, color: colors.heroAccent }}>PAPER TO PDF</Label>
              <Label strong style={{ fontSize: 21, lineHeight: 29, color: colors.heroText }}>কাগজ থেকে PDF</Label>
              <Label style={{ fontSize: 11, lineHeight: 18, color: colors.heroText }}>বিল, নোট কিংবা প্রয়োজনীয় কাগজ</Label>
              <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 9, borderRadius: 9, backgroundColor: colors.heroAccent, paddingHorizontal: 11, paddingVertical: 7, marginTop: 4 }}><Label style={{ fontSize: 11, color: colors.hero }}>স্ক্যান শুরু করুন</Label><Icon name="arrow-up-right" size={14} color={colors.hero} /></View>
            </View><PaperArt />
          </Tap>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 17, marginBottom: 20 }}>
            {[{ title: 'ছবি থেকে PDF', icon: 'copy', action: () => void addImages('gallery'), label: 'গ্যালারি থেকে ছবি নিয়ে PDF তৈরি করুন' },
              { title: 'একত্র করুন', icon: 'grid', action: () => setNotice('একাধিক PDF একত্র করার সুবিধাটি এখনো যোগ করা হয়নি।'), label: 'PDF একত্র করুন' },
              { title: 'সাইজ কমান', icon: 'minimize-2', action: () => setNotice('PDF-এর সাইজ কমানোর সুবিধাটি এখনো যোগ করা হয়নি।'), label: 'PDF-এর সাইজ কমান' }].map(tool =>
              <View key={tool.title} style={{ flex: 1 }}><Tap accessibilityLabel={tool.label} onPress={tool.action} disabled={busy} style={{ alignItems: 'center', paddingVertical: 5, gap: 8 }}>
                <View style={{ width: 45, height: 45, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}><Icon name={tool.icon as 'copy'} color={colors.primary} size={17} /></View>
                <Label numberOfLines={1} style={{ fontSize: 10 }}>{tool.title}</Label>
              </Tap></View>)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
            <Label numberOfLines={1} strong style={{ flexShrink: 1, fontSize: 16 }}>সাম্প্রতিক ফাইল</Label>
            <Tap onPress={() => router.replace('/documents')} style={{ minWidth: 60, alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
              <Label numberOfLines={1} style={{ fontSize: 12, color: colors.primary }}>সব দেখুন</Label>
            </Tap>
          </View>
        </> : <View style={{ gap: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13 }}><Icon name="search" color={colors.muted} size={18} /><TextInput accessibilityLabel="ফাইলের নাম দিয়ে খুঁজুন" value={query} onChangeText={setQuery} placeholder="ফাইলের নাম দিয়ে খুঁজুন" placeholderTextColor={colors.muted} style={{ flex: 1, minHeight: 50, color: colors.text, fontFamily: 'Bengali', fontSize: 14 }} /></View>
          <Tap onPress={() => void importPdf()} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="plus" color={colors.primary} size={18} /><Label style={{ color: colors.primary }}>ফোন থেকে PDF যোগ করুন</Label></Tap>
        </View>}
        {busy && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 }}><ActivityIndicator color={colors.primary} /><Label style={{ color: colors.muted }}>কাজ চলছে…</Label></View>}
      </View>}
      ListEmptyComponent={tab === 'home' ? <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 15, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 43, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><Icon name="file-text" color={colors.primary} size={18} /></View>
        <View style={{ flex: 1 }}><Label strong style={{ fontSize: 13 }}>এখনো কোনো PDF নেই</Label><Label style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>স্ক্যান করে আপনার প্রথম ফাইল তৈরি করুন</Label></View>
      </View> : <View style={{ alignItems: 'center', padding: 28, paddingHorizontal: 15, gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface }}>
        <View style={{ backgroundColor: colors.soft, padding: 14, borderRadius: 16 }}><Icon name={tab === 'favorites' ? 'bookmark' : 'file-plus'} color={colors.primary} size={25} /></View>
        <Label strong>{query ? 'মিলে এমন ফাইল পাওয়া যায়নি' : tab === 'favorites' ? 'পছন্দের তালিকা এখনো খালি' : 'আপনার প্রথম PDF তৈরি করুন'}</Label>
        <Label style={{ fontSize: 12, textAlign: 'center', color: colors.muted }}>{query ? 'অন্য নাম দিয়ে খুঁজে দেখুন।' : tab === 'favorites' ? 'ফাইলের পাশে বুকমার্ক চাপলে এখানে পাবেন।' : 'কাগজের ছবি তুলুন, গ্যালারি থেকে ছবি নিন অথবা একটি PDF ইমপোর্ট করুন।'}</Label>
      </View>} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
