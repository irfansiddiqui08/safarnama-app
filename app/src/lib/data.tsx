import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "./api";
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [state, setState] = useState<Omit<Data, "reload" | "now" | "programmeName">>({
    loading: true, error: null, enrolments: [], programmes: [], hasBundle: false, classes: [], recordings: [], announcements: [],
  });
  const [now, setNow] = useState(Date.now());

  const reload = useCallback(async () => {
    try {
      const [p, classes, recordings, announcements] = await Promise.all([api.getMyProgrammes(), api.getClasses(), api.getRecordings(), api.getAnnouncements()]);
      setState({ loading: false, error: null, ...p, classes, recordings, announcements });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: "Data load नहीं हुआ। Internet check करें और नीचे खींचकर refresh करें।" }));
    }
  }, []);

  useEffect(() => { if (status === "signedIn") reload(); }, [status, reload]);
  // tick every 30s so countdowns and Join buttons stay current
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const programmeName = useCallback((id: string) => state.programmes.find((p) => p.id === id)?.name ?? "", [state.programmes]);
  const recordings = state.recordings.filter((r) => new Date(r.available_until).getTime() > now);

  return <DataContext.Provider value={{ ...state, recordings, now, reload, programmeName }}>{children}</DataContext.Provider>;
}
