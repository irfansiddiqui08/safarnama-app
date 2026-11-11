import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../lib/api";
import { useAuth } from "../lib/auth";
import { DEMO, PRIVACY_URL, WHATSAPP } from "../lib/config";
import { colors, fonts, radius } from "../lib/theme";
import { Body, Button, Logo } from "../components/ui";

export default function Login() {
  const { demoSignIn } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const codeRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function send() {
    setErr(null); setBusy(true);
    try { await api.sendCode(email); setStep("code"); setTimeout(() => codeRef.current?.focus(), 300); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  async function verify() {
    setErr(null); setBusy(true);
    try { await api.verifyCode(email, code); if (DEMO) demoSignIn(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 8 }}><Logo size={170} /></View>
          <Text style={st.title}>स्वागत है 🌈</Text>
          <Body muted style={{ textAlign: "center", marginBottom: 22 }}>
            {step === "email" ? "Login करने के लिए वही email डालें जो आपने payment के समय दिया था।" : `हमने ${email.trim()} पर login code भेजा है।`}
          </Body>

          {step === "email" ? (
            <>
              <Text style={st.label}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="aapka@email.com" placeholderTextColor="#a8988c" autoCapitalize="none" autoComplete="email"
                keyboardType="email-address" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={() => emailOk && send()} style={st.input} accessibilityLabel="Email" />
              <Button title="Code भेजें" onPress={send} loading={busy} variant={emailOk ? "primary" : "disabled"} style={{ marginTop: 14 }} />
            </>
          ) : (
            <>
              <Text style={st.label}>Email में आया code</Text>
              <TextInput ref={codeRef} value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 8))} placeholder="••••••" placeholderTextColor="#a8988c"
                keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={8} style={[st.input, st.code]} accessibilityLabel="Login code"
                onSubmitEditing={() => code.length >= 6 && verify()} />
              <Button title="Login करें" onPress={verify} loading={busy} variant={code.length >= 6 ? "primary" : "disabled"} style={{ marginTop: 14 }} />
              <View style={st.links}>
                <Pressable onPress={() => { setStep("email"); setCode(""); setErr(null); }}><Text style={st.link}>Email बदलें</Text></Pressable>
                <Pressable onPress={send}><Text style={st.link}>Code दोबारा भेजें</Text></Pressable>
              </View>
              <Body muted style={{ textAlign: "center", fontSize: 13 }}>Code नहीं मिला? Spam / Promotions folder भी देखें।</Body>
            </>
          )}

          {err ? <Text style={st.err}>{err}</Text> : null}

          <View style={{ flex: 1 }} />
          <Pressable onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hello! मुझे Safarnama app में login करने में मदद चाहिए।")}`)} style={{ marginTop: 28 }}>
            <Text style={[st.link, { textAlign: "center" }]}>Login में दिक्कत? WhatsApp पर पूछें</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={st.small}>Privacy Policy</Text></Pressable>
          {DEMO ? <Text style={st.demo}>DEMO MODE · कोई भी email और 6 अंक डालें</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24, paddingTop: 20, maxWidth: 480, width: "100%", alignSelf: "center" },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.brown, textAlign: "center", marginBottom: 6 },
  label: { fontFamily: fonts.bodyHeavy, color: colors.brown, fontSize: 14, marginBottom: 6 },
  input: { backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: fonts.bodySemi, color: colors.text },
  code: { fontSize: 28, letterSpacing: 10, textAlign: "center", fontFamily: fonts.bodyHeavy },
  links: { flexDirection: "row", justifyContent: "space-between", marginVertical: 14 },
  link: { fontFamily: fonts.bodyBold, color: colors.green, fontSize: 14.5 },
  err: { fontFamily: fonts.bodySemi, color: colors.danger, backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 12, marginTop: 14, textAlign: "center" },
  small: { fontFamily: fonts.body, color: colors.muted, fontSize: 12.5, textAlign: "center", marginTop: 10 },
  demo: { fontFamily: fonts.bodyHeavy, color: colors.gold, fontSize: 11, textAlign: "center", marginTop: 10, letterSpacing: 1 },
});
