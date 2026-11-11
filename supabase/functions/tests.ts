// deno test -A functions/tests.ts
import { findProgramme } from "./razorpay-webhook/index.ts";
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
Deno.test("match unique amount (bundle 11000)", () => {
  assert(findProgramme("{}", { amount: 1100000 }, progs, []) === "complete", "bundle");
});
Deno.test("ambiguous 999 without mapping is unmatched", () => {
  assert(findProgramme("{}", { amount: 99900 }, progs, []) === null, "ambiguous");
});
Deno.test("match by programme name in description", () => {
  assert(findProgramme("{}", { amount: 99900, description: "Chakra Healing & Balancing" }, progs, []) === "chakra-healing", "desc");
});
