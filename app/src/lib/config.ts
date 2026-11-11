// Values come from app.json "extra" or EXPO_PUBLIC_* environment variables (.env file).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const DEMO = process.env.EXPO_PUBLIC_DEMO === "1" || !SUPABASE_URL;

export const WHATSAPP = "917354854003";
export const WEBSITE = "https://safarnama.club";
export const PRIVACY_URL = "https://safarnama.club/privacy.html";
export const TERMS_URL = "https://safarnama.club/terms.html";

/** The Join button on a live class unlocks this many minutes before it starts. */
export const JOIN_EARLY_MIN = 10;
