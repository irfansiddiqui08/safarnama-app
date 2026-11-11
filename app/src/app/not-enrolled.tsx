import { Linking, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { WHATSAPP } from "../lib/config";
import { colors } from "../lib/theme";
import { Body, Button, H1, Logo } from "../components/ui";

// Shown when someone logs in with an email that has no active programme.
// (No prices or purchase links here — app stores don't allow selling outside the store.)
export default function NotEnrolled() {
  const { me, signOut, refreshAccess } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14, maxWidth: 480, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center" }}><Logo size={120} /></View>
        <H1 style={{ textAlign: "center" }}>अभी कोई programme active नहीं है</H1>
        <Body muted style={{ textAlign: "center" }}>
          {me?.email} किसी active programme से जुड़ा नहीं है। अगर आपने payment किया है, तो हो सकता है आपने कोई दूसरा email दिया हो — या enrolment अभी update हो रहा हो।
        </Body>
        <Button title="WhatsApp पर संपर्क करें" variant="whatsapp" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello! मेरा Safarnama app में access नहीं दिख रहा। Email: ${me?.email ?? ""}`)}`)} />
        <Button title="दोबारा check करें" variant="ghost" onPress={refreshAccess} />
        <Button title="दूसरे email से login करें" variant="ghost" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}
