import { Linking, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { WHATSAPP } from "../lib/config";
import { colors } from "../lib/theme";
import { Body, Button, H1 } from "../components/ui";

export default function DeviceLimit() {
  const { me, signOut } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14, maxWidth: 480, width: "100%", alignSelf: "center" }}>
        <Body style={{ fontSize: 44, textAlign: "center" }}>📱</Body>
        <H1 style={{ textAlign: "center" }}>2 devices की limit पूरी</H1>
        <Body muted style={{ textAlign: "center" }}>
          आपका account पहले से 2 phones पर चल रहा है। नया phone जोड़ने के लिए हमें WhatsApp करें — हम पुराना device हटा देंगे।
        </Body>
        <Button title="WhatsApp पर device reset करवाएं" variant="whatsapp" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello! कृपया मेरा Safarnama app device reset कर दें। Email: ${me?.email ?? ""}`)}`)} />
        <Button title="Logout" variant="ghost" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}
