import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenCapture from "expo-screen-capture";
import * as api from "../../lib/api";
import { useData } from "../../lib/data";
import { remaining } from "../../lib/format";
import { colors, fonts } from "../../lib/theme";
import { Button } from "../../components/ui";

const WebView = Platform.OS === "web" ? null : require("react-native-webview").WebView;

/** Moves the student's email around the video every few seconds — discourages screen recording. */
function Watermark({ text }: { text: string }) {
  const { width, height } = useWindowDimensions();
  const pos = useRef(new Animated.ValueXY({ x: 20, y: 80 })).current;
  useEffect(() => {
    const move = () => Animated.timing(pos, { toValue: { x: Math.random() * Math.max(width - 240, 10), y: 60 + Math.random() * Math.max(height - 220, 10) }, duration: 1600, useNativeDriver: Platform.OS !== "web" }).start();
    move(); const t = setInterval(move, 7000); return () => clearInterval(t);
  }, [width, height, pos]);
  return <Animated.Text pointerEvents="none" style={[st.wm, { transform: pos.getTranslateTransform() }]}>{text}</Animated.Text>;
}

export default function Player() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recordings, reload, now } = useData();
  const rec = recordings.find((r) => r.id === id);
  const [url, setUrl] = useState<string | null>(null);
  const [wm, setWm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Block screenshots / screen recording while this screen is open (Android: blocked; iOS: recording shows black)
  useEffect(() => {
    if (Platform.OS === "web") return;
    ScreenCapture.preventScreenCaptureAsync("player").catch(() => {});
    return () => { ScreenCapture.allowScreenCaptureAsync("player").catch(() => {}); };
  }, []);

  const load = async () => {
    setLoading(true); setErr(null);
    try { const v = await api.getVideoUrl(String(id)); setUrl(v.url); setWm(v.watermark); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  // count as watched after 2 minutes on the player
  useEffect(() => { const t = setTimeout(() => { api.markWatched(String(id)).then(reload); }, 120000); return () => clearTimeout(t); }, [id, reload]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={st.bar}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" hitSlop={12} style={st.close}><Ionicons name="close" size={26} color="#fff" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={st.title} numberOfLines={1}>{rec?.title || rec?.class?.title || "Recording"}</Text>
          {rec ? <Text style={st.left}>⏳ {remaining(rec.available_until, now)} बाकी</Text> : null}
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        {loading ? <ActivityIndicator color={colors.gold} size="large" /> : err ? (
          <View style={{ padding: 24, gap: 14, alignItems: "center" }}>
            <Text style={[st.title, { textAlign: "center" }]}>{err}</Text>
            <Button title="फिर try करें" variant="gold" onPress={load} />
          </View>
        ) : url ? (
          Platform.OS === "web"
            ? React.createElement("iframe", { src: url, style: { border: 0, width: "100%", height: "100%" }, allow: "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen", allowFullScreen: true })
            : <WebView source={{ uri: url }} style={{ flex: 1, backgroundColor: "#000" }} allowsFullscreenVideo allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} />
        ) : (
          <View style={st.demo}>
            <Ionicons name="play-circle" size={84} color={colors.gold} />
            <Text style={st.title}>Demo mode</Text>
            <Text style={st.left}>Live app में यहाँ Bunny Stream से class की recording चलेगी।</Text>
          </View>
        )}
        {wm ? <Watermark text={wm} /> : null}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bodyHeavy, color: "#fff", fontSize: 16 },
  left: { fontFamily: fonts.bodySemi, color: "#d8c9bc", fontSize: 13, marginTop: 2 },
  wm: { position: "absolute", top: 0, left: 0, color: "rgba(255,255,255,.28)", fontFamily: fonts.bodyBold, fontSize: 14 },
  demo: { alignItems: "center", gap: 8, padding: 24 },
});
