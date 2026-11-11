import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useData } from "../lib/data";
import { colors } from "../lib/theme";
import { Body } from "./ui";

/** Scrollable page with pull-to-refresh and the shared error banner. */
export function Screen({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  const { reload, error } = useData();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14, maxWidth: 640, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.gold} colors={[colors.gold]} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
        {header}
        {error ? <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12 }}><Body style={{ color: colors.danger }}>{error}</Body></View> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
