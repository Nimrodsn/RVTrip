import '../global.css';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RVProfileProvider } from '../src/contexts/RVProfileContext';
import { StatusBar } from 'expo-status-bar';

function useRTL() {
  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);
}

export default function RootLayout() {
  useRTL();

  return (
    <SafeAreaProvider>
      <RVProfileProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: true,
            headerLargeTitle: false,
            animation: 'default',
          }}
        >
          <Stack.Screen name="index" options={{ title: 'RV-Twin Commander' }} />
          <Stack.Screen name="map" options={{ title: 'מפה' }} />
          <Stack.Screen name="checklist" options={{ title: 'בדיקה לפני יציאה' }} />
          <Stack.Screen name="commander" options={{ title: 'המפקד' }} />
          <Stack.Screen name="today" options={{ title: 'תוכנית להיום' }} />
          <Stack.Screen name="weather" options={{ title: 'מזג אוויר' }} />
          <Stack.Screen name="budget" options={{ title: 'תקציב והוצאות' }} />
          <Stack.Screen name="journal" options={{ title: 'יומן תמונות' }} />
          <Stack.Screen name="documents" options={{ title: 'מסמכי נסיעה' }} />
        </Stack>
      </RVProfileProvider>
    </SafeAreaProvider>
  );
}
