import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authCallbackUrl } from "./auth-navigation";
import { supabase } from "./supabase-client";

export type MutahRole = "contributor" | "reviewer" | "admin";

export type MutahProfile = {
  id: string;
  display_name: string | null;
  role: MutahRole;
  language: "ar" | "en";
};

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: MutahProfile | null;
  signInWithEmail: (
    email: string,
    language?: "ar" | "en",
    next?: string,
  ) => Promise<AuthRequestResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  canReview: boolean;
  isAdmin: boolean;
};

export type AuthRequestErrorKind =
  "rate_limit" | "invalid_redirect" | "provider_failure" | "user_error" | "other";

export type AuthRequestResult = {
  error?: { kind: AuthRequestErrorKind; status?: number; code?: string };
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<MutahProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,role,language")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as MutahProfile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MutahProfile | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const hydrate = async (next: Session | null) => {
      const currentRevision = ++revision;
      if (!active) return;
      setSession(next);
      if (!next?.user) {
        setProfile(null);
        setReady(true);
        return;
      }
      try {
        const nextProfile = await loadProfile(next.user.id);
        if (active && currentRevision === revision) setProfile(nextProfile);
      } catch {
        if (active && currentRevision === revision) setProfile(null);
      } finally {
        if (active && currentRevision === revision) setReady(true);
      }
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        if (active) {
          setSession(null);
          setProfile(null);
          setReady(true);
        }
        return;
      }
      void hydrate(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      window.setTimeout(() => void hydrate(next), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(
    async (
      email: string,
      language: "ar" | "en" = "ar",
      next = "/account",
    ): Promise<AuthRequestResult> => {
      const redirectTo = authCallbackUrl(next);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
          data: { language },
        },
      });
      if (!error) return {};
      const code = error.code;
      const searchable = `${code ?? ""} ${error.message}`.toLowerCase();
      let kind: AuthRequestErrorKind = "other";
      if (error.status === 429 || searchable.includes("rate limit")) kind = "rate_limit";
      else if (searchable.includes("redirect")) kind = "invalid_redirect";
      else if ((error.status ?? 0) >= 500 || searchable.match(/mailer|smtp|provider/))
        kind = "provider_failure";
      else if (error.status === 400 || error.status === 422) kind = "user_error";
      return {
        error: {
          kind,
          ...(typeof error.status === "number" ? { status: error.status } : {}),
          ...(code ? { code } : {}),
        },
      };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    setProfile(await loadProfile(session.user.id));
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      signInWithEmail,
      signOut,
      refreshProfile,
      canReview: profile?.role === "reviewer" || profile?.role === "admin",
      isAdmin: profile?.role === "admin",
    }),
    [ready, session, profile, signInWithEmail, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
