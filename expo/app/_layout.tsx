import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ScanLimitProvider } from "@/contexts/ScanLimitContext";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isCompleted, isLoading } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!isCompleted && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isCompleted && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isCompleted, isLoading, segments, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <OnboardingGate>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="analyzing" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="limit-reached" options={{ presentation: "modal", headerShown: false }} />
      </Stack>
    </OnboardingGate>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <OnboardingProvider>
          <ScanLimitProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </ScanLimitProvider>
        </OnboardingProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
