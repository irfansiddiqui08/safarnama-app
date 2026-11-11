// Returns a short-lived, signed Bunny Stream player URL for one recording.
// The student's own login is used for the database read, so the access rules
// (enrolled + inside the 24-hour window) decide whether anything comes back.
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, env, json, sha256Hex } from "../_shared/util.ts";

const LINK_MINUTES = 30; // a signed link stops working after this

export function signEmbedUrl(libraryId: string, tokenKey: string, videoId: string, expires: number): Promise<string> {
  return sha256Hex(tokenKey + videoId + expires).then((token) =>
    `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true&preload=true&responsive=true`
  );
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { recording_id, device_id } = await req.json();
    if (!recording_id) return json({ error: "recording_id required" }, 400);

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please log in again" }, 401);

    // Device must be one of the student's (max 2) registered devices
    if (device_id) {
      const { data: dev } = await supabase.from("devices").select("device_id").eq("user_id", user.id).eq("device_id", device_id).maybeSingle();
      if (!dev) return json({ error: "DEVICE_NOT_REGISTERED" }, 403);
    }

    const { data: rec, error } = await supabase.from("recordings")
      .select("id, bunny_video_id, available_until").eq("id", recording_id).maybeSingle();
    if (error) throw error;
    if (!rec) return json({ error: "This recording is not available (it may have expired)." }, 404);

    const until = Math.floor(new Date(rec.available_until).getTime() / 1000);
    const expires = Math.min(Math.floor(Date.now() / 1000) + LINK_MINUTES * 60, until);
    const url = await signEmbedUrl(env("BUNNY_LIBRARY_ID"), env("BUNNY_TOKEN_KEY"), rec.bunny_video_id, expires);
    return json({ url, expires, available_until: rec.available_until, watermark: user.email });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
