import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { NotoSansBengali_400Regular } from '@expo-google-fonts/noto-sans-bengali/400Regular';
import { NotoSansBengali_500Medium } from '@expo-google-fonts/noto-sans-bengali/500Medium';
import { AppProvider, useApp } from '../state/AppProvider';
import { BottomNavigation } from '../components/BottomNavigation';
import { Label, PrimaryButton } from '../components/ui';

function RootNavigation() {
  const { ready, loadError, reload, colors, mode, reduceMotion } = useApp();
  if (!ready) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 28, gap: 18 }}>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    {loadError ? <><Label>{loadError}</Label><PrimaryButton title="আবার চেষ্টা করুন" onPress={() => void reload()} /></> : <ActivityIndicator color={colors.primary} />}
  </SafeAreaView>;
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'none' : 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="documents" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="favorites" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
    </Stack>
    <BottomNavigation />
  </View>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Bengali: NotoSansBengali_400Regular, BengaliMedium: NotoSansBengali_500Medium });
  if (!loaded && !error) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F5F7FB' }}><ActivityIndicator color="#335CDE" /></View>;
  return <SafeAreaProvider><AppProvider><RootNavigation /></AppProvider></SafeAreaProvider>;
}
