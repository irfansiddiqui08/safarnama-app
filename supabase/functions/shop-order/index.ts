// Sarava Parihaara website checkout (saravaparihaaraglobal.com): creates a Razorpay order for the shop cart.
// Self-contained single file so it can be pasted into the Supabase dashboard editor.
// Uses the separate Sarava Parihaara Razorpay account (Razorpay asked to keep the shop and the course on different accounts).
// Secrets: SHOP_RAZORPAY_KEY_ID / SHOP_RAZORPAY_KEY_SECRET. The course keys (RAZORPAY_*) are never used here.
// Orders carry notes.type = "shop"; shop-webhook emails each paid order to Humaira.
// Fulfil shop orders from the Razorpay dashboard: each payment shows items + delivery address in its notes.
//
// PRICES LIVE HERE, on the server. The browser only sends product ids and quantities.
// When a price changes, update it here AND in the website's assets/js/products.js.
export const SHOP_PRODUCTS: Record<string, { name: string; price: number }> = {
  "oil-200": { name: "Hair Regrowth Oil 200 ml", price: 999 },
  "oil-100": { name: "Hair Regrowth Oil 100 ml", price: 599 },
  "shampoo-200": { name: "Hair Growth Shampoo 200 ml", price: 369 },
  "maonic-200": { name: "Maonic Hair Mask 200 gm", price: 499 },
  "heena-150": { name: "21 Herbs Heena 150 gm", price: 399 },
  "comb": { name: "Lily Pure Wood Neem Comb", price: 399 },
  "face-25": { name: "Fresh Face Cream 25 gm", price: 699 },
  "polish-150": { name: "AuraGlow Skin Polish 150 gm", price: 499 },
};
export const SHIPPING = 0; // free shipping on all orders

export type Line = { id: string; qty: number; name: string; price: number };
export type Customer = { name: string; phone: string; email: string; address: string; city: string; pincode: string; note: string };

export function cleanPhone(p: unknown): string | null {
  const d = String(p ?? "").replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}
const clip = (s: unknown, n: number) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, n);

export function quote(input: Record<string, unknown>):
  | { ok: true; lines: Line[]; total: number; customer: Customer }
  | { ok: false; error: string } {
  const items = Array.isArray(input.items) ? input.items : [];
  const merged = new Map<string, number>();
  for (const it of items as Record<string, unknown>[]) {
    const id = String(it?.id ?? "");
    const qty = Math.floor(Number(it?.qty));
    if (!SHOP_PRODUCTS[id] || !(qty >= 1 && qty <= 20)) return { ok: false, error: "Your cart has an item we couldn't find. Please refresh the page and try again." };
    merged.set(id, Math.min(20, (merged.get(id) ?? 0) + qty));
  }
  if (!merged.size) return { ok: false, error: "Your cart is empty." };
  const lines = [...merged].map(([id, qty]) => ({ id, qty, ...SHOP_PRODUCTS[id] }));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0) + SHIPPING;

  const c = (input.customer ?? {}) as Record<string, unknown>;
  const phone = cleanPhone(c.phone);
  const email = clip(c.email, 254).toLowerCase();
  const customer: Customer = { name: clip(c.name, 80), phone: phone ?? "", email, address: clip(c.address, 250), city: clip(c.city, 60), pincode: String(c.pincode ?? "").replace(/\D/g, ""), note: clip(c.note, 200) };
  if (customer.name.length < 2) return { ok: false, error: "Please enter your full name." };
  if (!phone) return { ok: false, error: "Please enter a valid 10-digit mobile number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "Please check your email address." };
  if (customer.address.length < 8) return { ok: false, error: "Please enter your full delivery address." };
  if (customer.city.length < 2) return { ok: false, error: "Please enter your city." };
  if (!/^[1-9]\d{5}$/.test(customer.pincode)) return { ok: false, error: "Please enter a valid 6-digit PIN code." };
  return { ok: true, lines, total, customer };
}

// Razorpay order notes: max 15 keys, 256 characters each.
export function orderNotes(q: { lines: Line[]; total: number; customer: Customer }): Record<string, string> {
  const items = q.lines.map((l) => `${l.name} x${l.qty}`).join("; ");
  return {
    type: "shop",
    shop: "Sarava Parihaara",
    items: items.slice(0, 255),
    total: `Rs ${q.total} (free shipping)`,
    name: q.customer.name,
    phone: q.customer.phone,
    email: q.customer.email,
    address: q.customer.address,
    city: q.customer.city,
    pincode: q.customer.pincode,
    ...(q.customer.note ? { note: q.customer.note } : {}),
  };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const q = quote(await req.json().catch(() => ({})));
    if (!q.ok) return json({ error: q.error }, 400);

    const keyId = env("SHOP_RAZORPAY_KEY_ID");
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${env("SHOP_RAZORPAY_KEY_SECRET")}`) },
      body: JSON.stringify({ amount: q.total * 100, currency: "INR", receipt: `sp-${Date.now()}`, notes: orderNotes(q) }),
    });
    const order = await r.json().catch(() => ({}));
    if (!r.ok || !order.id) {
      console.error("Razorpay order failed", r.status, JSON.stringify(order));
      return json({ error: "Online payment couldn't start. Please try again, or order on WhatsApp." }, 502);
    }
    return json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId, total: q.total, lines: q.lines.map(({ id, qty, name, price }) => ({ id, qty, name, price })) });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again, or order on WhatsApp." }, 500);
  }
});
