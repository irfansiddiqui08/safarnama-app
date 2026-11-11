import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useData } from "../../lib/data";
import { longDate } from "../../lib/format";
import { colors, fonts, radius } from "../../lib/theme";
import { Screen } from "../../components/Screen";
import { Body, Card, Empty, H1, Pill } from "../../components/ui";

export default function Programmes() {
  const { loading, programmes, enrolments, hasBundle, recordings, classes, now } = useData();
  return (
    <Screen header={<View><H1>मेरे Programmes</H1><Body muted>{hasBundle ? "Complete Safarnama Education 5.0 — सभी programmes आपके लिए खुले हैं।" : "जिन programmes में आप enrolled हैं।"}</Body></View>}>
      {loading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} /> : programmes.length ? programmes.map((p) => {
        const e = enrolments.find((x) => x.programme_id === p.id);
        const recs = recordings.filter((r) => r.class?.programme_id === p.id).length;
        const next = classes.find((c) => c.programme_id === p.id && new Date(c.starts_at).getTime() > now);
        return (
          <Pressable key={p.id} onPress={() => router.push(`/programme/${p.id}`)} style={({ pressed }) => [st.row, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.name}>{p.name}</Text>
              {p.duration ? <Text style={st.meta}>{p.duration}</Text> : null}
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {recs ? <Pill text={`🎬 ${recs} recording`} tone="green" /> : null}
                {next ? <Pill text="अगली class scheduled" tone="gold" /> : null}
                {e?.valid_until ? <Pill text={`Valid till ${longDate(e.valid_until)}`} tone="gold" /> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.muted} />
          </Pressable>
        );
      }) : <Card><Empty icon="📚" title="कोई programme नहीं मिला" /></Card>}
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, borderLeftColor: colors.gold, padding: 16 },
  name: { fontFamily: fonts.display, fontSize: 17.5, color: colors.brown },
  meta: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted },
});
