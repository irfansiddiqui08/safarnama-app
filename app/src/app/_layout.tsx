import { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { Mulish_400Regular, Mulish_600SemiBold, Mulish_700Bold, Mulish_800ExtraBold } from "@expo-google-fonts/mulish";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { DataProvider } from "../lib/data";
import { colors } from "../lib/theme";
import { urlFromNotification } from "../lib/notifications";
import { Sentry } from "../lib/sentry";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { status, deviceBlocked, enrolled, updateRequired } = useAuth();
  const ready = status !== "loading";
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  const signedIn = status === "signedIn" && !updateRequired;
  const ok = signedIn && !deviceBlocked && enrolled !== false;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}>
      <Stack.Protected guard={updateRequired}>
        <Stack.Screen name="update-required" />
      </Stack.Protected>
      <Stack.Protected guard={!updateRequired && status !== "signedIn"}>
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

/** Opens the screen a tapped notification points to (e.g. a new recording). */
function NotificationTaps() {
  const { status } = useAuth();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (status !== "signedIn") return;
    const url = urlFromNotification(last);
    if (url) setTimeout(() => router.push(url as never), 300);
  }, [last, status]);
  return null;
}

function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold, Mulish_400Regular, Mulish_600SemiBold, Mulish_700Bold, Mulish_800ExtraBold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <RootStack />
          {Platform.OS !== "web" ? <NotificationTaps /> : null}
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
