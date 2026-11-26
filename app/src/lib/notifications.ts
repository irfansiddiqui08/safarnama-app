import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { DEMO } from "./config";
import { supabase } from "./supabase";
import type { LiveClass } from "./types";
import { timeLabel } from "./format";

const REMINDER_MIN = 10;
const REMINDER_PREFIX = "class-reminder-";

// Show notifications even while the app is open
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

let currentToken: string | null = null;

/** Ask permission (once) and save this phone's push token so Humaira can reach it. */
export async function registerForPush(userId: string): Promise<void> {
  if (DEMO || Platform.OS === "web" || !Device.isDevice) return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        // eslint-disable-next-line import/namespace -- AndroidImportance is a runtime enum re-exported by expo-notifications
        name: "Safarnama updates", importance: Notifications.AndroidImportance.HIGH, sound: "default", lightColor: "#d9a430",
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return; // set by `eas init`
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
    await supabase.from("push_tokens").upsert({ token, user_id: userId, platform: Platform.OS, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn("push registration failed", e);
  }
}

/** Remove this phone's token on logout, so the next person using the phone doesn't get these notifications. */
export async function unregisterPush(): Promise<void> {
  if (DEMO || !currentToken) return;
  try { await supabase.from("push_tokens").delete().eq("token", currentToken); } catch {}
  currentToken = null;
}

/** Local reminders 10 minutes before each upcoming class (no server needed, works offline). */
export async function scheduleClassReminders(classes: LiveClass[], programmeName: (id: string) => string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((n) => n.identifier.startsWith(REMINDER_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    const now = Date.now(), week = now + 7 * 864e5;
    for (const c of classes) {
      const at = new Date(c.starts_at).getTime() - REMINDER_MIN * 6e4;
      if (at <= now + 30000 || at > week) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_PREFIX + c.id,
        content: {
          title: `🎥 ${REMINDER_MIN} मिनट में class शुरू होगी`,
          body: `${c.title}${programmeName(c.programme_id) ? " · " + programmeName(c.programme_id) : ""} — ${timeLabel(c.starts_at)}. Join करने के लिए tap करें।`,
          data: { url: "/(tabs)/classes" },
          sound: "default",
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: "default" },
      });
    }
  } catch (e) {
    console.warn("reminder scheduling failed", e);
  }
}

/** Screen to open for a tapped notification (only in-app paths). */
export function urlFromNotification(n: Notifications.NotificationResponse | null | undefined): string | null {
  const url = n?.notification.request.content.data?.url;
  return typeof url === "string" && url.startsWith("/") ? url : null;
}
