import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useData } from "../../lib/data";
import { firstName } from "../../lib/format";
import { colors, fonts } from "../../lib/theme";
import { ClassCard, RecordingCard } from "../../components/cards";
import { Screen } from "../../components/Screen";
import { Body, Button, Card, Empty, Eyebrow, H2 } from "../../components/ui";

export default function Home() {
  const { me } = useAuth();
  const { loading, classes, recordings, announcements, programmes, hasBundle, now, programmeName } = useData();
  const upcoming = classes.filter((c) => new Date(c.starts_at).getTime() + c.duration_min * 6e4 > now);
  const next = upcoming[0];
  const name = me ? firstName(me.full_name, me.email) : "";

  return (
    <Screen header={
      <View style={st.top}>
        <View style={{ flex: 1 }}>
          <Text style={st.hello}>नमस्ते{name ? `, ${name}` : ""} 🙏</Text>
          <Body muted>Dreams Into Reality</Body>
        </View>
        <Image source={require("../../../assets/logo.png")} style={{ width: 58, height: 58 }} />
      </View>
    }>
      {loading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} /> : (
        <>
          {announcements.map((a) => (
            <View key={a.id} style={st.ann}><Body style={{ color: colors.brown }}>{a.message}</Body></View>
          ))}

          <Eyebrow>अगली Live Class</Eyebrow>
          {next ? <ClassCard c={next} programme={programmeName(next.programme_id)} now={now} highlight /> : (
            <Card><Empty icon="🗓️" title="अभी कोई class scheduled नहीं है" text="नई class का schedule आते ही यहाँ दिखेगा।" /></Card>
          )}

          <View style={st.sectionRow}>
            <H2>Recordings</H2>
            <Text style={st.hint}>हर recording 24 घंटे के लिए</Text>
          </View>
          {recordings.length ? recordings.map((r) => (
            <RecordingCard key={r.id} r={r} programme={programmeName(r.class?.programme_id ?? "")} now={now} />
          )) : <Card><Empty icon="🎬" title="अभी कोई recording उपलब्ध नहीं" text="Class के बाद recording यहाँ 24 घंटे के लिए आएगी।" /></Card>}

          <View style={st.sectionRow}>
            <H2>मेरे Programmes</H2>
            {hasBundle ? <Text style={st.hint}>Complete Course ✨</Text> : null}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {programmes.map((p) => (
              <Button key={p.id} title={p.name} variant="ghost" small onPress={() => router.push(`/programme/${p.id}`)} style={{ borderWidth: 1.5 }} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  hello: { fontFamily: fonts.display, fontSize: 26, color: colors.brown },
  ann: { backgroundColor: colors.goldSoft, borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: colors.gold },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 },
  hint: { fontFamily: fonts.bodyBold, color: colors.muted, fontSize: 12.5 },
});
