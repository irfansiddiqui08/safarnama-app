import { DEMO } from "./config";
import { supabase } from "./supabase";
import { getDeviceId, deviceLabel } from "./device";
import * as demo from "./demo";
import type { Announcement, Enrolment, LiveClass, Me, Programme, Recording } from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const todayIST = () => new Date(Date.now() + 5.5 * 3.6e6).toISOString().slice(0, 10);

/* ---------------- login ---------------- */
export async function sendCode(email: string) {
  if (DEMO) { await wait(500); return; }
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message.includes("rate") ? "बहुत बार कोशिश हुई। 1 मिनट बाद फिर try करें।" : error.message);
}

export async function verifyCode(email: string, code: string) {
  if (DEMO) { await wait(500); if (code.length < 6) throw new Error("पूरा code डालें"); return; }
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
  if (error) throw new Error("Code गलत है या expire हो गया। नया code मंगाएं।");
}

export async function signOut() {
  if (DEMO) return;
  await supabase.auth.signOut();
}

/** Registers this phone. Returns false if the account is already on 2 other devices. */
export async function registerDevice(userId: string): Promise<boolean> {
  if (DEMO) return true;
  const device_id = await getDeviceId();
  const { data } = await supabase.from("devices").select("device_id").eq("user_id", userId).eq("device_id", device_id).maybeSingle();
  if (data) { await supabase.from("devices").update({ last_seen: new Date().toISOString() }).eq("user_id", userId).eq("device_id", device_id); return true; }
  const { error } = await supabase.from("devices").insert({ user_id: userId, device_id, label: deviceLabel() });
  if (error) { if (error.message.includes("DEVICE_LIMIT")) return false; throw error; }
  return true;
}

/* ---------------- data ---------------- */
export async function getMe(): Promise<Me | null> {
  if (DEMO) return demo.demoMe;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id, email, full_name").eq("id", user.id).maybeSingle();
  return data ?? { id: user.id, email: user.email ?? "", full_name: null };
}

export async function updateName(full_name: string) {
  if (DEMO) { demo.demoMe.full_name = full_name; return; }
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ full_name }).eq("id", user.id);
}

/** Active enrolments. If the Complete Course is among them, every programme is listed. */
export async function getMyProgrammes(): Promise<{ enrolments: Enrolment[]; programmes: Programme[]; hasBundle: boolean }> {
  if (DEMO) return { enrolments: demo.demoEnrolments, programmes: demo.demoProgrammes, hasBundle: false };
  const [{ data: enrols, error }, { data: all }] = await Promise.all([
    supabase.from("enrolments").select("id, programme_id, valid_until, created_at"),
    supabase.from("programmes").select("id, name, duration, is_bundle, sort").eq("active", true).order("sort"),
  ]);
  if (error) throw error;
  const today = todayIST();
  const active = (enrols ?? []).filter((e) => !e.valid_until || e.valid_until >= today);
  const byId = new Map((all ?? []).map((p) => [p.id, p as Programme]));
  const enrolments = active.map((e) => ({ ...e, programme: byId.get(e.programme_id) })) as Enrolment[];
  const hasBundle = enrolments.some((e) => e.programme?.is_bundle);
  const ids = new Set(enrolments.map((e) => e.programme_id));
  const programmes = (all ?? []).filter((p) => !p.is_bundle && (hasBundle || ids.has(p.id))) as Programme[];
  return { enrolments, programmes, hasBundle };
}

/** Classes from the last 3 days onwards (the database only returns paid programmes). */
export async function getClasses(): Promise<LiveClass[]> {
  if (DEMO) return [...demo.demoClasses].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const since = new Date(Date.now() - 3 * 24 * 3.6e6).toISOString();
  const { data, error } = await supabase.from("classes")
    .select("id, programme_id, title, starts_at, duration_min, zoom_url, zoom_passcode")
    .gte("starts_at", since).order("starts_at");
  if (error) throw error;
  return data ?? [];
}

/** Recordings still inside their 24-hour window. */
export async function getRecordings(): Promise<Recording[]> {
  if (DEMO) return demo.demoRecordings.filter((r) => new Date(r.available_until).getTime() > Date.now());
  const [{ data, error }, { data: prog }] = await Promise.all([
    supabase.from("recordings").select("id, class_id, title, available_until, class:classes(id, programme_id, title, starts_at, duration_min, zoom_url, zoom_passcode)").order("available_until"),
    supabase.from("watch_progress").select("recording_id, watched"),
  ]);
  if (error) throw error;
  const watched = new Set((prog ?? []).filter((p) => p.watched).map((p) => p.recording_id));
  return (data ?? []).map((r) => ({ ...r, class: Array.isArray(r.class) ? r.class[0] : r.class, watched: watched.has(r.id) })) as Recording[];
}

export async function getAnnouncements(): Promise<Announcement[]> {
  if (DEMO) return demo.demoAnnouncements;
  const { data } = await supabase.from("announcements").select("id, message, created_at").eq("active", true).order("created_at", { ascending: false }).limit(3);
  return data ?? [];
}

export async function getVideoUrl(recordingId: string): Promise<{ url: string; watermark: string; available_until: string }> {
  if (DEMO) {
    await wait(400);
    const r = demo.demoRecordings.find((x) => x.id === recordingId);
    return { url: "", watermark: demo.demoMe.email, available_until: r?.available_until ?? new Date().toISOString() };
  }
  const device_id = await getDeviceId();
  const { data, error } = await supabase.functions.invoke("video-url", { body: { recording_id: recordingId, device_id } });
  if (error) {
    let msg = "Video load नहीं हुआ। Internet check करके फिर try करें।";
    try { const b = await (error as { context?: Response }).context?.json(); if (b?.error) msg = b.error === "DEVICE_NOT_REGISTERED" ? "यह device registered नहीं है। Logout करके फिर login करें।" : b.error; } catch {}
    throw new Error(msg);
  }
  return data;
}

export async function markWatched(recordingId: string) {
  if (DEMO) { const r = demo.demoRecordings.find((x) => x.id === recordingId); if (r) r.watched = true; return; }
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("watch_progress").upsert({ user_id: user.id, recording_id: recordingId, watched: true, updated_at: new Date().toISOString() });
}

/** Permanently deletes the student's login (Apple/Google requirement). */
export async function deleteAccount() {
  if (DEMO) { await wait(400); return; }
  const { error } = await supabase.functions.invoke("delete-account", { body: {} });
  if (error) throw new Error("Account delete नहीं हुआ। WhatsApp पर संपर्क करें।");
  await supabase.auth.signOut();
}
