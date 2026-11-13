import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "./api";
import { scheduleClassReminders } from "./notifications";
import { useAuth } from "./auth";
import type { Announcement, Enrolment, LiveClass, Programme, Recording } from "./types";

type Data = {
  loading: boolean; error: string | null;
  enrolments: Enrolment[]; programmes: Programme[]; hasBundle: boolean;
  classes: LiveClass[]; recordings: Recording[]; announcements: Announcement[];
  now: number; reload: () => Promise<void>;
  programmeName: (id: string) => string;
};
const DataContext = createContext<Data>(null as unknown as Data);
export const useData = () => useContext(DataContext);

type Loaded = Omit<Data, "reload" | "now" | "programmeName">;
const LOAD_ERROR = "Data load नहीं हुआ। Internet check करें और नीचे खींचकर refresh करें।";
const EMPTY: Loaded = { loading: false, error: LOAD_ERROR, enrolments: [], programmes: [], hasBundle: false, classes: [], recordings: [], announcements: [] };

/** Fetch everything the screens need, and schedule the class reminders. */
async function loadAll(): Promise<Loaded> {
  try {
    const [p, classes, recordings, announcements] = await Promise.all([api.getMyProgrammes(), api.getClasses(), api.getRecordings(), api.getAnnouncements()]);
    const names = new Map(p.programmes.map((x) => [x.id, x.name]));
    scheduleClassReminders(classes, (id) => names.get(id) ?? "");
    return { loading: false, error: null, ...p, classes, recordings, announcements };
  } catch {
    return EMPTY;
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [state, setState] = useState<Loaded>({
    loading: true, error: null, enrolments: [], programmes: [], hasBundle: false, classes: [], recordings: [], announcements: [],
  });
  const [now, setNow] = useState(() => Date.now());

  // On a failed refresh keep what's already on screen and just show the error banner
  const apply = useCallback((next: Loaded) => setState((prev) => (next.error ? { ...prev, loading: false, error: next.error } : next)), []);
  const reload = useCallback(async () => apply(await loadAll()), [apply]);

  useEffect(() => {
    if (status !== "signedIn") return;
    let active = true;
    loadAll().then((next) => { if (active) apply(next); });
    return () => { active = false; };
  }, [status, apply]);
  // tick every 30s so countdowns and Join buttons stay current
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const programmeName = useCallback((id: string) => state.programmes.find((p) => p.id === id)?.name ?? "", [state.programmes]);
  const recordings = state.recordings.filter((r) => new Date(r.available_until).getTime() > now);

  return <DataContext.Provider value={{ ...state, recordings, now, reload, programmeName }}>{children}</DataContext.Provider>;
}
