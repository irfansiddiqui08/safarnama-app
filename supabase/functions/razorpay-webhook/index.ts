// Razorpay -> automatic enrolment.
// Razorpay calls this URL when a payment is captured. We verify Razorpay's
// signature, work out which programme was bought, and add an enrolment for
// the buyer's email. Anything we can't match lands in payments_unmatched for
// Humaira to assign from the admin panel.
import { createClient } from "npm:@supabase/supabase-js@2";
import { env, hmacSha256Hex, json, safeEqual } from "../_shared/util.ts";

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
  if (isShopPayment(payment)) return json({ ok: true, ignored: "shop order" });
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
