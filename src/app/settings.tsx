import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { common, Icon, IconButton, Label, Notice, Tap } from '../components/ui';

export default function SettingsScreen() {
  const { colors, library, setTheme, busy } = useApp();
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={common.header}><IconButton name="arrow-left" label="ফিরে যান" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Label strong style={{ fontSize: 19 }}>সেটিংস</Label><View style={{ width: 44 }} /></View>
    <ScrollView contentContainerStyle={common.content}>
      <Notice /><Label strong style={common.title}>নিজের মতো করে</Label>
      <View><Label strong>Sapphire & Silver</Label><Label style={{ fontSize: 12, color: colors.muted }}>পছন্দটি এই ফোনে সেভ থাকবে।</Label></View>
      <View style={{ gap: 10 }}>{([{ id: 'light', title: 'লাইট', description: 'পরিষ্কার সিলভার ও স্যাফায়ার', icon: 'sun' },
        { id: 'dark', title: 'ডার্ক', description: 'মিডনাইট নীল ও নরম স্যাফায়ার', icon: 'moon' },
        { id: 'system', title: 'ফোনের সেটিংস অনুযায়ী', description: 'ফোনের সঙ্গে স্বয়ংক্রিয়ভাবে বদলাবে', icon: 'smartphone' }] as const).map(option =>
        <Tap key={option.id} onPress={() => void setTheme(option.id)} disabled={busy} accessibilityRole="radio" aria-checked={library.theme === option.id} accessibilityState={{ checked: library.theme === option.id }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 17, borderWidth: 1, borderRadius: 17, borderColor: library.theme === option.id ? colors.primary : colors.border, backgroundColor: library.theme === option.id ? colors.soft : colors.surface }}>
          <Icon name={option.icon} color={colors.primary} /><View style={{ flex: 1 }}><Label strong>{option.title}</Label><Label style={{ color: colors.muted, fontSize: 11 }}>{option.description}</Label></View>{library.theme === option.id && <Icon name="check" color={colors.primary} />}
        </Tap>)}</View>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
      <Label strong>আপনার ফাইল, আপনার ফোনে</Label>
      <Label style={{ color: colors.muted }}>ডকুমেন্ট কোনো সার্ভারে আপলোড হয় না। অ্যাপ মুছে ফেললে বা ফোন রিসেট করলে অ্যাপের ফাইলও মুছে যাবে। প্রয়োজনীয় PDF শেয়ার করে অন্য জায়গায় ব্যাকআপ রাখুন।</Label>
      <Label strong>প্রথম সংস্করণের সুবিধা</Label>
      <Label style={{ color: colors.muted }}>অটো-এজ ডিটেকশনসহ ডকুমেন্ট স্ক্যান, ছবি থেকে PDF, PDF ইমপোর্ট, পৃষ্ঠা সাজানো ও ঘোরানো, ফাইলের নাম পরিবর্তন, পছন্দের তালিকা এবং শেয়ার।</Label>
      <Label style={{ color: colors.muted, fontSize: 12 }}>OCR, একাধিক PDF একত্র করা ও PDF-এর সাইজ কমানো পরবর্তী ধাপের কাজ।</Label>
      <Label style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 18 }}>DocMint: PDF Scanner · 1.0.0</Label>
    </ScrollView>
  </SafeAreaView>;
}
