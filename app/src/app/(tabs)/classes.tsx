import { ActivityIndicator, Text, View } from "react-native";
import { useData } from "../../lib/data";
import { dateLabel } from "../../lib/format";
import { colors, fonts } from "../../lib/theme";
import { ClassCard } from "../../components/cards";
import { Screen } from "../../components/Screen";
import { Body, Card, Empty, H1 } from "../../components/ui";

export default function Classes() {
  const { loading, classes, now, programmeName } = useData();
  const upcoming = classes.filter((c) => new Date(c.starts_at).getTime() + c.duration_min * 6e4 > now);
  // group by day
  const groups: { day: string; items: typeof upcoming }[] = [];
  for (const c of upcoming) {
    const d = dateLabel(c.starts_at);
    const g = groups.find((x) => x.day === d);
    if (g) g.items.push(c); else groups.push({ day: d, items: [c] });
  }
  return (
    <Screen header={<View><H1>Live Classes</H1><Body muted>Join button class शुरू होने से 10 मिनट पहले खुलता है।</Body></View>}>
      {loading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} /> :
        groups.length ? groups.map((g) => (
          <View key={g.day} style={{ gap: 10 }}>
            <Text style={{ fontFamily: fonts.bodyHeavy, color: colors.green, fontSize: 13, letterSpacing: 1, marginTop: 6 }}>{g.day.toUpperCase()}</Text>
            {g.items.map((c, i) => <ClassCard key={c.id} c={c} programme={programmeName(c.programme_id)} now={now} highlight={g === groups[0] && i === 0} />)}
          </View>
        )) : <Card><Empty icon="🗓️" title="अभी कोई class scheduled नहीं है" text="Schedule आते ही यहाँ दिखेगा और आपको WhatsApp पर भी बताया जाएगा।" /></Card>}
    </Screen>
  );
}
