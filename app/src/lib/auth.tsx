import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEMO } from "./config";
import { supabase } from "./supabase";
import * as api from "./api";
import type { Me } from "./types";

type Status = "loading" | "signedOut" | "signedIn";
type Ctx = {
  status: Status;
  me: Me | null;
  deviceBlocked: boolean;
  enrolled: boolean | null; // null = still checking
  refreshAccess: () => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: () => void;
};
const AuthContext = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);

  const refreshAccess = useCallback(async () => {
    const m = await api.getMe();
    setMe(m);
    if (!m) return;
    try { setDeviceBlocked(!(await api.registerDevice(m.id))); } catch { setDeviceBlocked(false); }
    try { const { enrolments } = await api.getMyProgrammes(); setEnrolled(enrolments.length > 0); } catch { setEnrolled(null); }
  }, []);

  useEffect(() => {
    if (DEMO) { setStatus("signedOut"); return; }
    supabase.auth.getSession().then(({ data }) => setStatus(data.session ? "signedIn" : "signedOut"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setStatus(session ? "signedIn" : "signedOut");
      if (!session) { setMe(null); setEnrolled(null); setDeviceBlocked(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (status === "signedIn") refreshAccess(); }, [status, refreshAccess]);

  const signOut = useCallback(async () => { await api.signOut(); setStatus("signedOut"); setMe(null); setEnrolled(null); }, []);
  const demoSignIn = useCallback(() => setStatus("signedIn"), []);

  return (
    <AuthContext.Provider value={{ status, me, deviceBlocked, enrolled, refreshAccess, signOut, demoSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}
