// Admin only: creates an empty video in Bunny Stream and returns signed
// credentials so the admin panel can upload the file straight to Bunny (TUS).
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, env, json, sha256Hex } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const { title } = await req.json();
    const libraryId = env("BUNNY_LIBRARY_ID"), apiKey = env("BUNNY_API_KEY");
    const r = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: "POST",
      headers: { AccessKey: apiKey, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Safarnama class recording" }),
    });
    if (!r.ok) {
      const msg = await r.text();
      console.error("Bunny create failed", r.status, msg, "libraryId=", libraryId, "keyLength=", apiKey.length, "keyHasSpaces=", /\s/.test(apiKey));
      return json({ error: `Bunny create failed (${r.status}): ${msg}` }, 502);
    }
    const video = await r.json();
    const expire = Math.floor(Date.now() / 1000) + 6 * 3600;
    const signature = await sha256Hex(`${libraryId}${apiKey}${expire}${video.guid}`);
    return json({ videoId: video.guid, libraryId, expire, signature, endpoint: "https://video.bunnycdn.com/tusupload" });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
