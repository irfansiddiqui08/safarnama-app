// Sarava Parihaara shop webhook (saravaparihaaraglobal.com).
// Receives "payment.captured" from the SEPARATE Sarava Parihaara Razorpay account and emails
// Humaira the order (items, address, phone) through Resend. Self-contained single file for the
// Supabase dashboard editor. Secrets: SHOP_RAZORPAY_WEBHOOK_SECRET, RESEND_API_KEY (ORDER_EMAIL_TO optional).
// "Enforce JWT verification" must be OFF (Razorpay can't send a Supabase token).

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
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacSha256Hex(env("SHOP_RAZORPAY_WEBHOOK_SECRET"), raw);
  if (!safeEqual(sig, expected)) return json({ error: "bad signature" }, 401);

  const body = JSON.parse(raw);
  if (body.event !== "payment.captured") return json({ ok: true, ignored: body.event });
  const payment = body.payload?.payment?.entity ?? {};
  if (!isShopPayment(payment)) return json({ ok: true, ignored: "not a website shop order" });

  const emailed = await sendShopOrderEmail(payment).catch((e) => { console.error("order email failed", e); return false; });
  return json({ ok: true, emailed });
});
