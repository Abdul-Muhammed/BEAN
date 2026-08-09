import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="username" />
      <Stack.Screen name="location" />
      <Stack.Screen name="preferences" />
      {/* Terminal step: writes the profile behind the loading animation. There
          is nothing to go back to, so the swipe gesture is disabled. */}
      <Stack.Screen name="curating" options={{ gestureEnabled: false }} />
    </Stack>
  );
}