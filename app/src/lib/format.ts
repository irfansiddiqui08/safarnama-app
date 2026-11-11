const IST = "Asia/Kolkata";

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const key = (x: Date) => x.toLocaleDateString("en-IN", { timeZone: IST });
  if (key(d) === key(today)) return "आज";
  if (key(d) === key(tomorrow)) return "कल";
  return d.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "long", year: "numeric" });
}

/** "5 घंटे 12 मिनट" style remaining time */
export function remaining(untilIso: string, now = Date.now()): string {
  const ms = new Date(untilIso).getTime() - now;
  if (ms <= 0) return "समाप्त";
  const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60;
  if (h >= 24) { const d = Math.floor(h / 24); return `${d} दिन ${h % 24} घंटे`; }
  return h > 0 ? `${h} घंटे ${m} मिनट` : `${m} मिनट`;
}

export type ClassState = "upcoming" | "joinable" | "live" | "ended";
export function classState(c: { starts_at: string; duration_min: number }, earlyMin: number, now = Date.now()): ClassState {
  const start = new Date(c.starts_at).getTime();
  const end = start + c.duration_min * 6e4;
  if (now >= end) return "ended";
  if (now >= start) return "live";
  if (now >= start - earlyMin * 6e4) return "joinable";
  return "upcoming";
}

export function firstName(name: string | null | undefined, email: string): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0];
  const local = email.split("@")[0].replace(/[._\d]+/g, " ").trim().split(" ")[0] || "";
  return local ? local[0].toUpperCase() + local.slice(1) : "";
}
