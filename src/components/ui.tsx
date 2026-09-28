import React, { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useApp } from '../state/AppProvider';

export function Label({ children, style, strong = false, ...props }: React.ComponentProps<typeof Text> & { strong?: boolean }) {
  const { colors } = useApp();
  return <Text {...props} style={[{ color: colors.text, fontFamily: strong ? 'BengaliMedium' : 'Bengali', fontSize: 14, lineHeight: 23 }, style]}>{children}</Text>;
}

export function Tap({ children, style, onPressIn, onPressOut, ...props }: Omit<PressableProps, 'style' | 'children'> & { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useApp();
  const [scale] = useState(() => new Animated.Value(1));
  function move(value: number) {
    if (!reduceMotion) Animated.spring(scale, { toValue: value, speed: 32, bounciness: 1, useNativeDriver: Platform.OS !== 'web' }).start();
  }
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable {...props} accessibilityRole={props.accessibilityRole ?? 'button'}
    onPressIn={event => { move(0.97); onPressIn?.(event); }} onPressOut={event => { move(1); onPressOut?.(event); }}
    style={[{ minHeight: 44, opacity: props.disabled ? 0.5 : 1 }, style]}>{children}</Pressable></Animated.View>;
}

export function Icon({ name, size = 20, color }: { name: React.ComponentProps<typeof Feather>['name']; size?: number; color?: string }) {
  const { colors } = useApp();
  return <Feather name={name} size={size} color={color ?? colors.text} accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" />;
}

export function IconButton({ name, label, onPress, disabled }: { name: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useApp();
  return <Tap accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><Icon name={name} /></Tap>;
}

export function PrimaryButton({ title, onPress, disabled, icon }: { title: string; onPress: () => void; disabled?: boolean; icon?: React.ComponentProps<typeof Feather>['name'] }) {
  const { colors } = useApp();
  return <Tap onPress={onPress} disabled={disabled} style={{ minHeight: 52, borderRadius: 15, padding: 14, flexDirection: 'row', gap: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
    {icon && <Icon name={icon} color={colors.onPrimary} />}<Label strong style={{ color: colors.onPrimary }}>{title}</Label>
  </Tap>;
}

export function Notice() {
  const { colors, notice, setNotice } = useApp();
  if (!notice) return null;
  return <View style={{ backgroundColor: colors.soft, padding: 12, borderRadius: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
    <Label accessibilityLiveRegion="polite" style={{ flex: 1, fontSize: 12 }}>{notice}</Label>
    <Tap onPress={() => setNotice('')} accessibilityLabel="বার্তা বন্ধ করুন" style={{ width: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={18} /></Tap>
  </View>;
}

export const common = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 18 },
  title: { fontSize: 24, lineHeight: 36 },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontFamily: 'Bengali' },
});
export const smallText: TextStyle = { fontSize: 12, lineHeight: 20 };
