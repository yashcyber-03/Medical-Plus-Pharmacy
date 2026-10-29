import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileCheckedFor, setProfileCheckedFor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the logged-in user's profile (name, role, active status).
  // Row Level Security guarantees a user can only read their own row
  // (admins can read all rows).
  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (error) console.error("Could not load profile:", error.message);
    setProfile(error ? null : data);
    setProfileCheckedFor(userId);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setProfileCheckedFor(null);
      } else {
        // setTimeout avoids calling Supabase inside its own auth callback
        setTimeout(() => loadProfile(newSession.user.id), 0);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    await loadProfile(data.user.id);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileCheckedFor(null);
  }

  async function sendPasswordReset(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }

  async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword });
  }

  const waitingForProfile = Boolean(session) && profileCheckedFor !== session.user.id;

  const value = {
    session,
    profile,
    loading,
    waitingForProfile,
    isAdmin: profile?.role === "admin" && profile?.is_active === true,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
