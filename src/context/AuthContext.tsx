"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const supabaseRef = useRef<ReturnType<typeof createClient> | undefined>(undefined);

  const fetchProfile = async (userId: string) => {
    const sb = supabaseRef.current;
    if (!sb) return null;
    const { data } = await sb
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    return data as Profile | null;
  };

  const refresh = async () => {
    const sb = supabaseRef.current;
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    setUser(user);
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const logout = async () => {
    const sb = supabaseRef.current;
    if (!sb) return;
    await sb.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    let supabase: ReturnType<typeof createClient>;

    // Heartbeat: update last_active_at every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      const sb = supabaseRef.current;
      if (!sb) return;
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);
      }
    }, 30000);

    try {
      supabase = createClient();
    } catch {
      if (mounted) setLoading(false);
      return;
    }

    supabaseRef.current = supabase;

    timerRef.current = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    const init = async () => {
      if (!mounted) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(user);

      if (user) {
        const p = await fetchProfile(user.id);
        if (!mounted) return;
        setProfile(p);
      }

      clearTimeout(timerRef.current);
      if (mounted) setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          setLoading(true);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            if (mounted) setLoading(false);
          }, 4000);

          const p = await fetchProfile(u.id);
          if (!mounted) return;
          setProfile(p);
          clearTimeout(timerRef.current);
          if (mounted) setLoading(false);
        } else {
          setProfile(null);
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timerRef.current);
      clearInterval(heartbeatInterval);
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
