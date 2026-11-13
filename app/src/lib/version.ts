import * as Application from "expo-application";
import { Platform } from "react-native";
import { DEMO } from "./config";
import { supabase } from "./supabase";

/** "1.2.10" > "1.2.9" */
export function isOlder(current: string, minimum: string): boolean {
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = minimum.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

/** Returns the store link if this installed version is below the minimum Humaira set; otherwise null. */
export async function checkUpdateRequired(): Promise<string | null> {
  if (DEMO || Platform.OS === "web") return null;
  try {
    const { data } = await supabase.from("app_settings").select("key, value");
    const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const min = Platform.OS === "ios" ? s.min_version_ios : s.min_version_android;
    const current = Application.nativeApplicationVersion ?? "0.0.0";
    if (min && isOlder(current, min)) return (Platform.OS === "ios" ? s.app_store_url : s.play_store_url) || "";
  } catch {}
  return null;
}
