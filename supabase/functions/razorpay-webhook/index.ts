// Razorpay -> automatic enrolment.
// Razorpay calls this URL when a payment is captured. We verify Razorpay's
// signature, work out which programme was bought, and add an enrolment for
// the buyer's email. Anything we can't match lands in payments_unmatched for
// Humaira to assign from the admin panel.
import { createClient } from "npm:@supabase/supabase-js@2";
// Helpers inlined (instead of importing ../_shared/util.ts) so this file can be
// pasted into the Supabase dashboard editor on its own.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
}
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type Programme = { id: string; name: string; amount: number; access_days: number | null; is_bundle: boolean };

export function findProgramme(raw: string, payment: Record<string, unknown>, programmes: Programme[], map: { match_key: string; programme_id: string }[]): string | null {
  const notes = (payment.notes ?? {}) as Record<string, unknown>;
  // 1) website checkout: create-order writes the exact programme id into the order notes
  const pid = typeof notes.programme_id === "string" ? notes.programme_id : "";
  if (pid && programmes.some((p) => p.id === pid)) return pid;
  const hay = raw.toLowerCase();
  // 2) explicit mapping: Razorpay payment page id (pl_...) or a word from the page title
  for (const m of map) if (m.match_key && hay.includes(m.match_key.toLowerCase())) return m.programme_id;
  // 3) the programme id/slug written anywhere in notes or description
  const text = JSON.stringify([notes, payment.description ?? ""]).toLowerCase();
  for (const p of programmes) if (text.includes(p.id) || text.includes(p.name.toLowerCase())) return p.id;
  // No guessing by amount: other payments on this Razorpay account (e.g. one-to-one sessions)
  // can share a price with a programme. Anything else goes to the admin's Payments tab.
  return null;
}

export function isShopPayment(payment: Record<string, unknown>): boolean {
  const notes = (payment.notes ?? {}) as Record<string, unknown>;
  return notes.type === "shop";
}


// ---- Sarava Parihaara shop: "new order" email to Humaira ----------------------
// Sent through Resend (resend.com, free plan). Needs the secret RESEND_API_KEY.
// Optional secret ORDER_EMAIL_TO (default below). Without RESEND_API_KEY nothing is sent.
const esc = (t: unknown) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export function shopOrderEmail(payment: Record<string, unknown>): { subject: string; html: string; text: string } {
  const n = (payment.notes ?? {}) as Record<string, string>;
  const amount = Math.round(Number(payment.amount ?? 0) / 100);
  const inr = "Rs " + amount.toLocaleString("en-IN");
  const phone = String(n.phone || payment.contact || "").replace(/\D/g, "").slice(-10);
  const items = String(n.items || "").split("; ").filter(Boolean);
  const subject = `New order ${inr} - ${n.name || "Customer"}${n.city ? " (" + n.city + ")" : ""}`;
  const rows: [string, string][] = [
    ["Name", esc(n.name)],
    ["Mobile", phone ? `<a href="tel:+91${phone}">+91 ${phone}</a> &middot; <a href="https://wa.me/91${phone}">WhatsApp</a>` : ""],
    ["Email", esc(n.email || payment.email)],
    ["Address", `${esc(n.address)}<br>${esc(n.city)} ${esc(n.pincode)}`],
    ["Note", esc(n.note)],
    ["Payment", `${esc(payment.id)} &middot; ${esc(payment.method)}`],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#2a1d16">
<h2 style="color:#3b2014;margin:0 0 4px">New paid order &middot; ${inr}</h2>
<p style="margin:0 0 16px;color:#6f6058">Sarava Parihaara website &middot; free shipping &middot; payment received</p>
<h3 style="margin:16px 0 6px">Items</h3><ul style="margin:0 0 12px;padding-left:18px">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
<h3 style="margin:16px 0 6px">Ship to</h3>
<table style="border-collapse:collapse;width:100%">${rows.filter((r) => r[1].replace(/<[^>]+>|&middot;|\s/g, "")).map(([k, v]) => `<tr><td style="padding:6px 10px 6px 0;color:#6f6058;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0">${v}</td></tr>`).join("")}</table>
<p style="margin:20px 0"><a href="https://dashboard.razorpay.com/app/payments/${esc(payment.id)}" style="background:#3b2014;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open in Razorpay</a></p>
<p style="color:#6f6058;font-size:12px">Please pack and dispatch within 1&ndash;3 working days, then send the tracking link to the customer on WhatsApp.</p></div>`;
  const text = [`New paid order: ${inr}`, "", "Items:", ...items.map((i) => "- " + i), "", `Name: ${n.name ?? ""}`, `Mobile: ${phone}`, `Email: ${n.email || payment.email || ""}`, `Address: ${n.address ?? ""}, ${n.city ?? ""} ${n.pincode ?? ""}`, n.note ? `Note: ${n.note}` : "", `Payment: ${payment.id} (${payment.method})`].filter((l) => l !== "").join("\n");
  return { subject, html, text };
}
async function sendShopOrderEmail(payment: Record<string, unknown>): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const to = Deno.env.get("ORDER_EMAIL_TO") || "humayrasheikh03@gmail.com";
  const m = shopOrderEmail(payment);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("ORDER_EMAIL_FROM") || "Sarava Parihaara Orders <onboarding@resend.dev>", to: to.split(",").map((x) => x.trim()), subject: m.subject, html: m.html, text: m.text }),
  });
  if (!r.ok) console.error("Resend error", r.status, await r.text());
  return r.ok;
}

if (import.meta.main) Deno.serve(async (req) => {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacSha256Hex(env("RAZORPAY_WEBHOOK_SECRET"), raw);
  if (!safeEqual(sig, expected)) return json({ error: "bad signature" }, 401);

  const body = JSON.parse(raw);
  if (body.event !== "payment.captured") return json({ ok: true, ignored: body.event });

  const payment = body.payload?.payment?.entity ?? {};
  // Sarava Parihaara shop orders (saravaparihaaraglobal.com) share this Razorpay account.
  // They are product sales, not course purchases: never enrol them or list them as unmatched.
  if (isShopPayment(payment)) {
    const emailed = await sendShopOrderEmail(payment).catch((e) => { console.error("order email failed", e); return false; });
    return json({ ok: true, ignored: "shop order", emailed });
  }
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const email = String(payment.email || (payment.notes as Record<string, string> | undefined)?.email || "").trim().toLowerCase();
  const phone = String(payment.contact ?? "");
  const amount = Math.round(Number(payment.amount ?? 0) / 100);

  const [{ data: programmes }, { data: map }] = await Promise.all([
    admin.from("programmes").select("id, name, amount, access_days, is_bundle").eq("active", true),
    admin.from("razorpay_map").select("match_key, programme_id"),
  ]);
  const programmeId = email ? findProgramme(raw, payment, programmes ?? [], map ?? []) : null;

  if (!programmeId) {
    await admin.from("payments_unmatched").upsert({ payment_id: payment.id, email, phone, amount, raw: body });
    return json({ ok: true, matched: false });
  }

  const prog = (programmes ?? []).find((p) => p.id === programmeId)!;
  const { data: batch } = await admin.from("batches").select("id").eq("active", true).order("starts_on", { ascending: false }).limit(1).maybeSingle();
  const notes = (payment.notes ?? {}) as Record<string, string>;
  const name = notes.name || notes.full_name || notes.Name || null;

  let validUntil: string | null = null;
  if (prog.access_days) {
    // monthly programmes: extend from today, or from the current end date if still active
    const { data: existing } = await admin.from("enrolments").select("valid_until").eq("email", email).eq("programme_id", programmeId).order("valid_until", { ascending: false }).limit(1).maybeSingle();
    const today = new Date();
    const from = existing?.valid_until && new Date(existing.valid_until) > today ? new Date(existing.valid_until) : today;
    const months = Math.max(1, Math.round(amount / Math.max(prog.amount, 1)));
    from.setDate(from.getDate() + prog.access_days * months);
    validUntil = from.toISOString().slice(0, 10);
  }

  const { error } = await admin.from("enrolments").upsert({
    email, full_name: name, phone, programme_id: programmeId, batch_id: batch?.id ?? null,
    source: "razorpay", payment_id: payment.id, amount_paid: amount, valid_until: validUntil,
  }, { onConflict: "email,programme_id,batch_id" });
  if (error) {
    console.error(error);
    await admin.from("payments_unmatched").upsert({ payment_id: payment.id, email, phone, amount, raw: body });
    return json({ ok: true, matched: false, error: error.message });
  }
  return json({ ok: true, matched: true, programme: programmeId });
});
