// Admin only: sends a push notification through Expo's free push service
// to all students, one programme's students, or one student (by email).
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, env, json } from "../_shared/util.ts";

type Msg = { to: string; title: string; body: string; sound: "default"; data: { url?: string }; channelId: string; priority: "high" };

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Only internal app routes may be opened from a notification. */
export function safeUrl(url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  return /^\/[A-Za-z0-9_\-/()[\]]*$/.test(url) ? url : undefined;
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) return json({ error: "Admins only" }, 403);
    const { data: { user } } = await userClient.auth.getUser();

    const { title, body, audience, target, url } = await req.json();
    if (!title || !body) return json({ error: "Title and message are required" }, 400);
    if (!["all", "programme", "email"].includes(audience)) return json({ error: "Bad audience" }, 400);
    if (audience !== "all" && !target) return json({ error: "Choose the programme or email" }, 400);

    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: rows, error } = await admin.rpc("push_recipients", { p_audience: audience, p_target: target ?? null });
    if (error) throw error;
    const tokens: string[] = [...new Set(((rows ?? []) as { token: string }[]).map((r) => r.token))];

    const data = { url: safeUrl(url) };
    const messages: Msg[] = tokens.map((to) => ({ to, title: String(title).slice(0, 80), body: String(body).slice(0, 300), sound: "default", data, channelId: "default", priority: "high" }));

    let sent = 0, failed = 0;
    const dead: string[] = [];
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    for (const batch of chunk(messages, 100)) {
      const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify(batch) });
      const res = await r.json().catch(() => ({}));
      const tickets: { status: string; details?: { error?: string } }[] = res.data ?? [];
      tickets.forEach((t, i) => {
        if (t.status === "ok") sent++;
        else { failed++; if (t.details?.error === "DeviceNotRegistered") dead.push(batch[i].to); }
      });
      if (!tickets.length) failed += batch.length;
    }
    if (dead.length) await admin.from("push_tokens").delete().in("token", dead);

    await admin.from("notifications").insert({
      title, body, audience, target: target ?? null, url: data.url ?? null, sent_count: sent, failed_count: failed, created_by: user?.id ?? null,
    });
    return json({ ok: true, recipients: tokens.length, sent, failed });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
