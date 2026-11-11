import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fonts, radius } from "../lib/theme";
import { classState, dateLabel, remaining, timeLabel } from "../lib/format";
import { JOIN_EARLY_MIN } from "../lib/config";
import type { LiveClass, Recording } from "../lib/types";
import { Body, Button, Card, Pill } from "./ui";

export function ClassCard({ c, programme, now, highlight }: { c: LiveClass; programme: string; now: number; highlight?: boolean }) {
  const st = classState(c, JOIN_EARLY_MIN, now);
  const canJoin = (st === "joinable" || st === "live") && !!c.zoom_url;
  const startsIn = remaining(c.starts_at, now);
  return (
    <Card dark={highlight} style={st === "ended" ? { opacity: 0.6 } : undefined}>
      <View style={st2.row}>
        <Text style={[st2.when, highlight && { color: colors.goldSoft }]}>{dateLabel(c.starts_at)} · {timeLabel(c.starts_at)}</Text>
        {st === "live" ? <Pill text="● LIVE" tone="red" /> : st === "joinable" ? <Pill text="शुरू होने वाली है" tone="green" /> : st === "ended" ? <Pill text="खत्म" tone="gold" /> : null}
      </View>
      <Text style={[st2.title, highlight && { color: "#fff" }]}>{c.title}</Text>
      {programme ? <Body muted={!highlight} style={highlight ? { color: "#e0cfbd" } : { fontSize: 13.5 }}>{programme} · {c.duration_min} मिनट</Body> : null}
      {st !== "ended" ? (
        <View style={{ marginTop: 14, gap: 8 }}>
          <Button title={canJoin ? "Zoom पर Join करें" : `Join ${JOIN_EARLY_MIN} मिनट पहले खुलेगा`} variant={canJoin ? "gold" : "disabled"} icon={canJoin ? "🎥" : "🔒"}
            onPress={() => c.zoom_url && Linking.openURL(c.zoom_url)} />
          {st === "upcoming" ? <Text style={[st2.note, highlight && { color: "#e0cfbd" }]}>शुरू होने में {startsIn}</Text> : null}
          {canJoin && c.zoom_passcode ? <Text style={[st2.note, highlight && { color: "#e0cfbd" }]}>Passcode: <Text style={{ fontFamily: fonts.bodyHeavy }}>{c.zoom_passcode}</Text></Text> : null}
        </View>
      ) : null}
    </Card>
  );
}

export function RecordingCard({ r, programme, now }: { r: Recording; programme: string; now: number }) {
  const msLeft = new Date(r.available_until).getTime() - now;
  const urgent = msLeft < 3 * 3.6e6;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/player/${r.id}`)} style={({ pressed }) => [st2.rec, pressed && { opacity: 0.85 }]}>
      <View style={st2.play}><Text style={{ color: colors.brown, fontSize: 20, marginLeft: 3 }}>▶</Text></View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={st2.recTitle} numberOfLines={2}>{r.title || r.class?.title}</Text>
        {programme ? <Text style={st2.recMeta} numberOfLines={1}>{programme}</Text> : null}
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <Pill text={`⏳ ${remaining(r.available_until, now)} बाकी`} tone={urgent ? "red" : "gold"} />
          {r.watched ? <Pill text="✓ देख लिया" tone="green" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const st2 = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 },
  when: { fontFamily: fonts.bodyHeavy, color: colors.green, fontSize: 13 },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.brown, lineHeight: 24, marginBottom: 2 },
  note: { fontFamily: fonts.bodySemi, color: colors.muted, fontSize: 13, textAlign: "center" },
  rec: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14 },
  play: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  recTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15.5, color: colors.text },
  recMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
