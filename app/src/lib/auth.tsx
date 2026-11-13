import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEMO } from "./config";
import { supabase } from "./supabase";
import * as api from "./api";
import { registerForPush, unregisterPush } from "./notifications";
import { checkUpdateRequired } from "./version";
import type { Me } from "./types";

type Status = "loading" | "signedOut" | "signedIn";
type Ctx = {
  status: Status;
  me: Me | null;
  deviceBlocked: boolean;
  enrolled: boolean | null; // null = still checking
  updateRequired: boolean;
  storeUrl: string;
  refreshAccess: () => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: () => void;
};
const AuthContext = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthContext);

type Access = { me: Me | null; deviceBlocked: boolean; enrolled: boolean | null };

/** Who is logged in, is this phone allowed, and do they have an active programme? */
async function loadAccess(): Promise<Access> {
  const me = await api.getMe();
  if (!me) return { me, deviceBlocked: false, enrolled: null };
  let deviceBlocked = false;
  try { deviceBlocked = !(await api.registerDevice(me.id)); } catch {}
  registerForPush(me.id);
  let enrolled: boolean | null = null;
  try { enrolled = (await api.getMyProgrammes()).enrolments.length > 0; } catch {}
  return { me, deviceBlocked, enrolled };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(DEMO ? "signedOut" : "loading");
  const [me, setMe] = useState<Me | null>(null);
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  // Minimum-version check (Humaira can force an update from the admin panel)
  useEffect(() => { checkUpdateRequired().then(setStoreUrl); }, []);

  const applyAccess = useCallback((a: Access) => { setMe(a.me); setDeviceBlocked(a.deviceBlocked); setEnrolled(a.enrolled); }, []);
  const refreshAccess = useCallback(async () => { applyAccess(await loadAccess()); }, [applyAccess]);

  useEffect(() => {
    if (DEMO) return;
    supabase.auth.getSession().then(({ data }) => setStatus(data.session ? "signedIn" : "signedOut"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setStatus(session ? "signedIn" : "signedOut");
      if (!session) { setMe(null); setEnrolled(null); setDeviceBlocked(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (status !== "signedIn") return;
    let active = true;
    loadAccess().then((a) => { if (active) applyAccess(a); });
    return () => { active = false; };
  }, [status, applyAccess]);

  const signOut = useCallback(async () => { await unregisterPush(); await api.signOut(); setStatus("signedOut"); setMe(null); setEnrolled(null); }, []);
  const demoSignIn = useCallback(() => setStatus("signedIn"), []);

  return (
    <AuthContext.Provider value={{ status, me, deviceBlocked, enrolled, updateRequired: storeUrl !== null, storeUrl: storeUrl ?? "", refreshAccess, signOut, demoSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}
