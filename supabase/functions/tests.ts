// deno test -A functions/tests.ts
import { findProgramme, isShopPayment } from "./razorpay-webhook/index.ts";
import { quote } from "./shop-order/index.ts";
import { signEmbedUrl } from "./video-url/index.ts";
import { hmacSha256Hex, safeEqual, sha256Hex } from "./_shared/util.ts";

const progs = [
  { id: "complete", name: "Complete Safarnama Education 5.0", amount: 11000, access_days: null, is_bundle: true },
  { id: "the-power", name: "The Power (Shakti)", amount: 2100, access_days: null, is_bundle: false },
  { id: "chakra-healing", name: "Chakra Healing & Balancing", amount: 999, access_days: null, is_bundle: false },
  { id: "inner-child", name: "Inner Child Healing", amount: 999, access_days: null, is_bundle: false },
];
const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };

Deno.test("bunny embed token matches Bunny's documented example", async () => {
  // SHA256("4742a81b-..." + "32d140e2-..." + 1623440202) from docs.bunny.net
  const t = await sha256Hex("4742a81b-bf15-42fe-8b1c-8fcb9024c550" + "32d140e2-e4f4-4eec-9d53-20371e9be607" + 1623440202);
  const url = await signEmbedUrl("123", "4742a81b-bf15-42fe-8b1c-8fcb9024c550", "32d140e2-e4f4-4eec-9d53-20371e9be607", 1623440202);
  assert(url.includes(`token=${t}`) && url.includes("expires=1623440202") && url.startsWith("https://iframe.mediadelivery.net/embed/123/32d140e2"), url);
});
Deno.test("razorpay signature check", async () => {
  const sig = await hmacSha256Hex("secret", '{"a":1}');
  assert(safeEqual(sig, await hmacSha256Hex("secret", '{"a":1}')), "same");
  assert(!safeEqual(sig, await hmacSha256Hex("secret", '{"a":2}')), "different body");
});
Deno.test("match by payment page id mapping", () => {
  const raw = JSON.stringify({ payload: { payment: { entity: { notes: { payment_page_id: "pl_ABC123" } } } } });
  assert(findProgramme(raw, { amount: 99900 }, progs, [{ match_key: "pl_ABC123", programme_id: "inner-child" }]) === "inner-child", "map");
});
Deno.test("no guessing by amount (one-to-one sessions share prices)", () => {
  assert(findProgramme("{}", { amount: 1100000 }, progs, []) === null, "no amount match");
});
Deno.test("website checkout notes win", () => {
  assert(findProgramme("{}", { amount: 99900, notes: { programme_id: "inner-child" } }, progs, []) === "inner-child", "notes id");
  assert(findProgramme("{}", { amount: 99900, notes: { programme_id: "not-real" } }, progs, []) === null, "unknown id");
});
Deno.test("ambiguous 999 without mapping is unmatched", () => {
  assert(findProgramme("{}", { amount: 99900 }, progs, []) === null, "ambiguous");
});
Deno.test("match by programme name in description", () => {
  assert(findProgramme("{}", { amount: 99900, description: "Chakra Healing & Balancing" }, progs, []) === "chakra-healing", "desc");
});

import { chunk, safeUrl } from "./send-push/index.ts";
Deno.test("push batches of 100", () => {
  const b = chunk(Array.from({ length: 250 }, (_, i) => i), 100);
  assert(b.length === 3 && b[2].length === 50, "chunks");
});
Deno.test("notification can only open in-app screens", () => {
  assert(safeUrl("/player/abc-123") === "/player/abc-123", "player");
  assert(safeUrl("/(tabs)/classes") === "/(tabs)/classes", "tab");
  assert(safeUrl("https://evil.com") === undefined, "external blocked");
  assert(safeUrl("javascript:alert(1)") === undefined, "js blocked");
});

import { cleanPhone, validate } from "./create-order/index.ts";
Deno.test("checkout phone cleaning", () => {
  assert(cleanPhone("+91 73548 54003") === "7354854003", "+91");
  assert(cleanPhone("07354854003") === "7354854003", "0 prefix");
  assert(cleanPhone("12345") === null, "short");
  assert(cleanPhone("5354854003") === null, "bad start");
});
Deno.test("checkout validation", () => {
  const good = validate({ programme_id: "inner-child", name: "Asha  Verma", email: " Asha@Mail.com ", phone: "9876543210" });
  assert(good.ok && good.v.email === "asha@mail.com" && good.v.name === "Asha Verma", "good");
  assert(!validate({ programme_id: "x'; drop", name: "A B", email: "a@b.co", phone: "9876543210" }).ok, "bad id");
  assert(!validate({ programme_id: "inner-child", name: "A B", email: "not-an-email", phone: "9876543210" }).ok, "bad email");
});

Deno.test("shop: server prices, merged lines, validation", () => {
  const c = { name: "Test User", phone: "+91 98765 43210", address: "12 Station Road, Ward 5", city: "Rajnandgaon", pincode: "491441" };
  const q = quote({ items: [{ id: "oil-200", qty: 1 }, { id: "comb", qty: 2 }, { id: "oil-200", qty: 1 }], customer: c });
  assert(q.ok && q.total === 999 * 2 + 399 * 2 && q.lines.length === 2, "total");
  assert(!quote({ items: [{ id: "oil-200", qty: 1, price: 1 }], customer: { ...c, pincode: "12" } }).ok, "bad pin");
  assert(!quote({ items: [{ id: "fake", qty: 1 }], customer: c }).ok, "unknown id");
  assert(!quote({ items: [], customer: c }).ok, "empty");
});
Deno.test("shop payments are skipped by the enrolment webhook", () => {
  assert(isShopPayment({ notes: { type: "shop" } }) && !isShopPayment({ notes: { programme_id: "complete" } }), "shop flag");
});
