import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { Mulish_400Regular, Mulish_600SemiBold, Mulish_700Bold, Mulish_800ExtraBold } from "@expo-google-fonts/mulish";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { DataProvider } from "../lib/data";
import { colors } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { status, deviceBlocked, enrolled } = useAuth();
  const ready = status !== "loading";
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  const signedIn = status === "signedIn";
  const ok = signedIn && !deviceBlocked && enrolled !== false;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && deviceBlocked}>
        <Stack.Screen name="device-limit" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !deviceBlocked && enrolled === false}>
        <Stack.Screen name="not-enrolled" />
      </Stack.Protected>
      <Stack.Protected guard={ok}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="programme/[id]" options={{ headerShown: true, title: "", headerTintColor: colors.brown, headerStyle: { backgroundColor: colors.ivory }, headerShadowVisible: false }} />
        <Stack.Screen name="player/[id]" options={{ presentation: "fullScreenModal", contentStyle: { backgroundColor: "#000" } }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold, Mulish_400Regular, Mulish_600SemiBold, Mulish_700Bold, Mulish_800ExtraBold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <RootStack />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
