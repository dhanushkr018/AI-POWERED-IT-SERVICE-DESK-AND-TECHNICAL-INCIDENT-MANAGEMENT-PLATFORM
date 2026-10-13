import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/context/auth-context";
import { friendlyAuthError } from "@/lib/authErrors";
import { api } from "@/lib/api";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export function AuthProvider({ children }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");

  const loadAccount = useCallback(async (nextSession) => {
    if (!nextSession?.access_token) {
      setAccount(null);
      setError("");
      return;
    }
    try {
      const me = await api("/me", { token: nextSession.access_token });
      setAccount(me);
      setError("");
    } catch (err) {
      setAccount(null);
      setError(err.message || "Could not load your account.");
    }
  }, []);

  useEffect(() => {
    if (!configured) return undefined;

    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(true);
      loadAccount(nextSession).finally(() => setLoading(false));
    });

    return () => data.subscription.unsubscribe();
  }, [configured, loadAccount]);

  const signIn = useCallback(async (email, password) => {
    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
    if (signInError) throw new Error(friendlyAuthError(signInError.message));
  }, []);

  const signUp = useCallback(async (values) => {
    const { data, error: signUpError } = await getSupabase().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          employee_id: values.employeeId || "",
          department: values.department || "",
          job_title: values.jobTitle || "",
        },
      },
    });
    if (signUpError) throw new Error(friendlyAuthError(signUpError.message));
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { alreadyRegistered: true, needsEmailConfirmation: false };
    }
    return { alreadyRegistered: false, needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setAccount(null);
  }, []);

  const updateProfile = useCallback(async (values) => {
    const result = await api("/me", {
      method: "PATCH",
      token: session?.access_token,
      body: values,
    });
    setAccount((current) => ({
      user: result.user,
      roles: result.roles ?? current?.roles ?? [],
    }));
    return result;
  }, [session]);

  const value = useMemo(
    () => ({
      configured,
      session,
      account,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
      hasRole: (role) => account?.roles?.includes(role) ?? false,
      reload: () => loadAccount(session),
    }),
    [account, configured, error, loadAccount, loading, session, signIn, signOut, signUp, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
