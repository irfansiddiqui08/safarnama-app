import * as Application from "expo-application";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/** A stable id for this phone (used for the 2-device limit). */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === "android") return "a-" + Application.getAndroidId();
    if (Platform.OS === "ios") {
      const id = await Application.getIosIdForVendorAsync();
      if (id) return "i-" + id;
    }
  } catch {}
  // web / fallback: random id kept in storage
  const k = "sf_device_id";
  let id = await AsyncStorage.getItem(k);
  if (!id) { id = "w-" + Math.random().toString(36).slice(2) + Date.now().toString(36); await AsyncStorage.setItem(k, id); }
  return id;
}

export function deviceLabel(): string {
  return [Device.manufacturer, Device.modelName].filter(Boolean).join(" ") || Platform.OS;
}
