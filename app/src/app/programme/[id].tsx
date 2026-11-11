import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useData } from "../../lib/data";
import { colors, fonts } from "../../lib/theme";
import { ClassCard, RecordingCard } from "../../components/cards";
import { Screen } from "../../components/Screen";
import { Body, Card, Empty, Eyebrow, H1 } from "../../components/ui";

export default function ProgrammeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programmes, classes, recordings, now } = useData();
  const p = programmes.find((x) => x.id === id);
  const upcoming = classes.filter((c) => c.programme_id === id && new Date(c.starts_at).getTime() + c.duration_min * 6e4 > now);
  const past = classes.filter((c) => c.programme_id === id && new Date(c.starts_at).getTime() + c.duration_min * 6e4 <= now).reverse();
  const recs = recordings.filter((r) => r.class?.programme_id === id);

  if (!p) return <Screen><Empty icon="🔒" title="यह programme आपके account में नहीं है" /></Screen>;
  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen header={<View><Eyebrow>{p.duration ?? "Programme"}</Eyebrow><H1>{p.name}</H1></View>}>
        <Text style={st}>Recordings (24 घंटे)</Text>
        {recs.length ? recs.map((r) => <RecordingCard key={r.id} r={r} programme="" now={now} />)
          : <Card><Body muted>अभी कोई recording उपलब्ध नहीं है।</Body></Card>}

        <Text style={st}>आने वाली Classes</Text>
        {upcoming.length ? upcoming.map((c, i) => <ClassCard key={c.id} c={c} programme="" now={now} highlight={i === 0} />)
          : <Card><Body muted>अगली class का schedule जल्द आएगा।</Body></Card>}

        {past.length ? <>
          <Text style={st}>हो चुकी Classes</Text>
          {past.map((c) => <ClassCard key={c.id} c={c} programme="" now={now} />)}
        </> : null}
      </Screen>
    </>
  );
}

const st = { fontFamily: fonts.display, fontSize: 19, color: colors.brown, marginTop: 8 } as const;
