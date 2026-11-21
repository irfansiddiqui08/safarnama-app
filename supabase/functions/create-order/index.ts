// Website checkout: creates a Razorpay order for one programme.
// The price always comes from the database (never from the browser), and the
// programme id + buyer details are written into the order notes so the
// razorpay-webhook function knows exactly what was bought.
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, env, json } from "../_shared/util.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cleanPhone(p: unknown): string | null {
  const d = String(p ?? "").replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

export function validate(input: Record<string, unknown>): { ok: true; v: { programme_id: string; name: string; email: string; phone: string } } | { ok: false; error: string } {
  const programme_id = String(input.programme_id ?? "");
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = cleanPhone(input.phone);
  if (!/^[a-z0-9-]{1,40}$/.test(programme_id)) return { ok: false, error: "Programme not found" };
  if (name.length < 2 || name.length > 80) return { ok: false, error: "कृपया अपना पूरा नाम लिखें" };
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "कृपया सही email लिखें" };
  if (!phone) return { ok: false, error: "कृपया 10 अंकों का mobile number लिखें" };
  return { ok: true, v: { programme_id, name, email, phone } };
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const checked = validate(await req.json().catch(() => ({})));
    if (!checked.ok) return json({ error: checked.error }, 400);
    const { programme_id, name, email, phone } = checked.v;

    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: prog } = await admin.from("programmes").select("id, name, amount").eq("id", programme_id).eq("active", true).maybeSingle();
    if (!prog || !(prog.amount > 0)) return json({ error: "Programme not found" }, 404);

    const keyId = env("RAZORPAY_KEY_ID");
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${env("RAZORPAY_KEY_SECRET")}`) },
      body: JSON.stringify({
        amount: Math.round(prog.amount * 100),
        currency: "INR",
        receipt: `sf-${prog.id}-${Date.now()}`.slice(0, 40),
        notes: { programme_id: prog.id, programme: prog.name, name, email, phone },
      }),
    });
    const order = await r.json().catch(() => ({}));
    if (!r.ok || !order.id) {
      console.error("Razorpay order failed", r.status, JSON.stringify(order));
      return json({ error: "Payment शुरू नहीं हो पाया। कृपया थोड़ी देर बाद try करें या WhatsApp करें।" }, 502);
    }
    return json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId, programme: prog.name, programme_id: prog.id });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
