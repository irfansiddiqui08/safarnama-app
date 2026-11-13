import { Linking, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/theme";
import { Body, Button, H1, Logo } from "../components/ui";
import { useAuth } from "../lib/auth";

export default function UpdateRequired() {
  const { storeUrl } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14, maxWidth: 480, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center" }}><Logo size={120} /></View>
        <H1 style={{ textAlign: "center" }}>नया version उपलब्ध है</H1>
        <Body muted style={{ textAlign: "center" }}>Safarnama app का नया version आ गया है। आगे इस्तेमाल करने के लिए कृपया app update करें।</Body>
        {storeUrl ? <Button title="App update करें" variant="gold" onPress={() => Linking.openURL(storeUrl)} /> : null}
      </View>
    </SafeAreaView>
  );
}
