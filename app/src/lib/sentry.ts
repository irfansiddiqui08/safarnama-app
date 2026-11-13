import * as Sentry from "@sentry/react-native";

// Crash reports. Leave EXPO_PUBLIC_SENTRY_DSN empty to switch off.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const sentryEnabled = !!dsn;
if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,       // never send names or emails with crash reports
    tracesSampleRate: 0,         // crashes only, no performance tracing
    environment: __DEV__ ? "development" : "production",
  });
}
export { Sentry };
