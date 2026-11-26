import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../lib/theme";


export default function TabsLayout() {
  // Leave room for the phone's own navigation buttons / gesture bar (Android draws edge-to-edge).
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.brown,
      tabBarInactiveTintColor: "#a8988c",
      tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line, height: 58 + Math.max(bottom, 8), paddingTop: 6, paddingBottom: Math.max(bottom, 8) },
      tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
      sceneStyle: { backgroundColor: colors.ivory },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} /> }} />
      <Tabs.Screen name="classes" options={{ title: "Live Classes", tabBarIcon: ({ color, size }) => <Ionicons name="videocam" color={color as string} size={size} /> }} />
      <Tabs.Screen name="programmes" options={{ title: "Programmes", tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color as string} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
