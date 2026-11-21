import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileAuthProvider } from '../context/MobileAuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileAuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0b0f19' },
          }}
        />
      </MobileAuthProvider>
    </SafeAreaProvider>
  );
}
