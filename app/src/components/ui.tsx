import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { colors, fonts, radius } from "../lib/theme";

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function Body({ children, style, muted, numberOfLines }: { children: React.ReactNode; style?: TextStyle; muted?: boolean; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[s.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}
export function Eyebrow({ children, color = colors.green }: { children: React.ReactNode; color?: string }) {
  return <Text style={[s.eyebrow, { color }]}>{children}</Text>;
}

export function Card({ children, style, dark }: { children: React.ReactNode; style?: ViewStyle; dark?: boolean }) {
  return <View style={[s.card, dark && s.cardDark, style]}>{children}</View>;
}

type BtnProps = { title: string; onPress?: () => void; variant?: "primary" | "gold" | "ghost" | "whatsapp" | "disabled"; loading?: boolean; style?: ViewStyle; icon?: string; small?: boolean };
export function Button({ title, onPress, variant = "primary", loading, style, icon, small }: BtnProps) {
  const disabled = variant === "disabled" || loading;
  const bg = { primary: colors.brown, gold: colors.gold, ghost: "transparent", whatsapp: colors.whatsapp, disabled: colors.line }[variant];
  const fg = { primary: "#fff", gold: colors.brown, ghost: colors.brown, whatsapp: "#fff", disabled: colors.placeholder }[variant];
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, borderColor: variant === "ghost" ? colors.brown : bg, opacity: pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{icon ? icon + "  " : ""}{title}</Text>}
    </Pressable>
  );
}

export function Pill({ text, tone = "gold" }: { text: string; tone?: "gold" | "green" | "red" | "dark" }) {
  const map = { gold: [colors.goldSoft, colors.brown], green: [colors.greenSoft, colors.green], red: [colors.dangerSoft, colors.danger], dark: ["rgba(255,255,255,.12)", "#fff"] } as const;
  return <View style={[s.pill, { backgroundColor: map[tone][0] }]}><Text style={[s.pillText, { color: map[tone][1] }]}>{text}</Text></View>;
}

export function Logo({ size = 72 }: { size?: number }) {
  return <Image source={require("../../assets/logo.png")} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="Safarnama Education logo" />;
}

export function Empty({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <View style={s.empty}>
      <Text style={{ fontSize: 34 }}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Body muted style={{ textAlign: "center" }}>{text}</Body> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  h1: { fontFamily: fonts.display, fontSize: 28, color: colors.brown, lineHeight: 34 },
  h2: { fontFamily: fonts.display, fontSize: 20, color: colors.brown, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22 },
  eyebrow: { fontFamily: fonts.bodyHeavy, fontSize: 11.5, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  card: { backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16 },
  cardDark: { backgroundColor: colors.brown, borderColor: colors.brown },
  btn: { borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, minHeight: 50 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 40 },
  btnText: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
  pill: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-start" },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  empty: { alignItems: "center", padding: 28, gap: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.brown, textAlign: "center" },
});
