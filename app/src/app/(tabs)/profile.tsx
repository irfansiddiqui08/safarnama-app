import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import * as api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useData } from "../../lib/data";
import { DEMO, PRIVACY_URL, TERMS_URL, WHATSAPP } from "../../lib/config";
import { colors, fonts, radius } from "../../lib/theme";
import { Screen } from "../../components/Screen";
import { Body, Button, Card, H1, H2 } from "../../components/ui";

export default function Profile() {
  const { me, signOut, refreshAccess } = useAuth();
  const { enrolments, programmeName } = useData();
  const [name, setName] = useState(me?.full_name ?? "");
  const [saved, setSaved] = useState(false);
  const wa = (text: string) => Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`);

  return (
    <Screen header={
      <View style={st.head}>
        <H1>Profile</H1>
        <Pressable onPress={signOut} accessibilityRole="button" accessibilityLabel="Logout" style={({ pressed }) => [st.logoutTop, pressed && { opacity: 0.6 }]}>
          <Ionicons name="log-out-outline" size={18} color={colors.brown} />
          <Text style={st.logoutText}>Logout</Text>
        </Pressable>
      </View>
    }>
      <Card style={{ gap: 10 }}>
        <Text style={st.label}>आपका नाम</Text>
        <TextInput value={name} onChangeText={(t) => { setName(t); setSaved(false); }} placeholder="पूरा नाम" placeholderTextColor={colors.placeholder} style={st.input} />
        <Button title={saved ? "✓ Save हो गया" : "नाम Save करें"} small variant={saved ? "ghost" : "primary"}
          onPress={async () => { await api.updateName(name.trim()); await refreshAccess(); setSaved(true); }} />
        <Text style={st.label}>Email</Text>
        <Body>{me?.email}</Body>
      </Card>

      <H2>Enrolled Programmes</H2>
      <Card style={{ gap: 8 }}>
        {enrolments.map((e) => (
          <View key={e.id} style={st.enrol}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Body style={{ flex: 1 }}>{e.programme?.name ?? programmeName(e.programme_id)}</Body>
          </View>
        ))}
      </Card>

      <H2>मदद</H2>
      <Card style={{ gap: 0, padding: 0 }}>
        <Row icon="logo-whatsapp" text="WhatsApp पर बात करें" onPress={() => wa("Hello! Safarnama app के बारे में मदद चाहिए।")} />
        <Row icon="phone-portrait" text="नए phone पर app चलाना है (device reset)" onPress={() => wa(`Hello! मेरा device reset करना है। Email: ${me?.email}`)} />
        <Row icon="document-text" text="Terms & Conditions" onPress={() => Linking.openURL(TERMS_URL)} />
        <Row icon="shield-checkmark" text="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} last />
      </Card>

      <Body muted style={{ fontSize: 13 }}>
        🎬 Recordings हर class के बाद 24 घंटे के लिए उपलब्ध रहती हैं। 📱 एक account 2 phones पर चल सकता है। Videos record या share करना मना है।
      </Body>

      <Button title="Logout" variant="ghost" onPress={signOut} />
      <Pressable accessibilityRole="button" onPress={() => {
        const go = async () => { try { await api.deleteAccount(); await signOut(); } catch (e) { Alert.alert("Error", (e as Error).message); } };
        const msg = "आपका app login हमेशा के लिए delete हो जाएगा। आपके payment records रहेंगे, और बाद में उसी email से फिर login कर सकते हैं।";
        if (Platform.OS === "web") { if (confirm(msg)) go(); }
        else Alert.alert("Account delete करें?", msg, [{ text: "रहने दें", style: "cancel" }, { text: "Delete", style: "destructive", onPress: go }]);
      }}><Text style={st.delete}>Account delete करें</Text></Pressable>
      <Text style={st.version}>Safarnama Education 5.0 · v{Application.nativeApplicationVersion ?? "1.0.0"}{DEMO ? " · demo" : ""}</Text>
    </Screen>
  );
}

function Row({ icon, text, onPress, last }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.row, !last && st.rowLine, pressed && { backgroundColor: colors.ivory }]} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={icon === "logo-whatsapp" ? colors.whatsapp : colors.brown} />
      <Text style={st.rowText}>{text}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoutTop: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brown },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.brown },
  input: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.sm, padding: 12, fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text, backgroundColor: colors.ivory },
  enrol: { flexDirection: "row", gap: 8, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  delete: { fontFamily: fonts.bodyBold, color: colors.danger, fontSize: 13.5, textAlign: "center", padding: 6 },
  version: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: "center" },
});
