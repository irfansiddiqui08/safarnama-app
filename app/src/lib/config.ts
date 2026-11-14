// Safarnama Supabase project (Mumbai). The publishable key is meant to be public:
// the database's own access rules decide what each login can see.
// EXPO_PUBLIC_* variables in a .env file override these (e.g. for a test project).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://mtcvkfyxxkurinfloazu.supabase.co";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_OmCx57pJD2Hk9Jc2RTO35w_-rNfF8OJ";
export const DEMO = process.env.EXPO_PUBLIC_DEMO === "1";

export const WHATSAPP = "917354854003";
export const WEBSITE = "https://safarnama.club";
export const PRIVACY_URL = "https://safarnama.club/privacy.html";
export const TERMS_URL = "https://safarnama.club/terms.html";

/** The Join button on a live class unlocks this many minutes before it starts. */
export const JOIN_EARLY_MIN = 10;
