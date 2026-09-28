import { router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { Icon, Label, Tap } from './ui';

const items = [
  { id: 'documents', title: 'আমার ফাইল', icon: 'folder', route: '/documents' },
  { id: 'home', title: 'হোম', icon: 'home', route: '/' },
  { id: 'favorites', title: 'পছন্দের', icon: 'bookmark', route: '/favorites' },
] as const;

export function BottomNavigation() {
  const { colors } = useApp();
  const pathname = usePathname();
  const selected = pathname === '/documents' || pathname.startsWith('/document/')
    ? 'documents'
    : pathname === '/favorites' ? 'favorites' : 'home';

  return <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border }}>
    <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 11, paddingBottom: 7 }}>
      {items.map(item => <View key={item.id} style={{ flex: 1 }}>
        <Tap accessibilityState={{ selected: selected === item.id }} onPress={() => {
          if (pathname !== item.route) router.replace(item.route);
        }} style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ width: 55, height: 31, borderRadius: 12, backgroundColor: selected === item.id ? colors.soft : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={item.icon} size={19} color={selected === item.id ? colors.primary : colors.muted} />
          </View>
          <Label numberOfLines={1} style={{ fontSize: 10, color: selected === item.id ? colors.primary : colors.muted }}>{item.title}</Label>
        </Tap>
      </View>)}
    </View>
  </SafeAreaView>;
}
