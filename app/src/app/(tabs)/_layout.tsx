import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../lib/theme";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
const icon = (name: Icon) => ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.brown,
      tabBarInactiveTintColor: "#a8988c",
      tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line, height: 64, paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
      sceneStyle: { backgroundColor: colors.ivory },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="classes" options={{ title: "Live Classes", tabBarIcon: icon("videocam") }} />
      <Tabs.Screen name="programmes" options={{ title: "Programmes", tabBarIcon: icon("book") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person-circle") }} />
    </Tabs>
  );
}
