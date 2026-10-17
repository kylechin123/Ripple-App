"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/types";

type Squad = { id: string; name: string; ward: number | null; invite_code: string };

type Ctx = {
  ready: boolean;
  configError: string | null;
  session: Session | null;
  profile: Profile | null;
  squad: Squad | null;
  refresh: () => Promise<void>;
  api: <T = unknown>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
};

const AppContext = createContext<Ctx | null>(null);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const INVITE_KEY = "ripple.invite";
const INVITE_ISSUE_KEY = "ripple.inviteIssue";

export function readInvite(): string | null {
  try {
    return localStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

/** Issue slug from an invite link, so the invitee gets a quest on the same issue as their friend. */
export function readInviteIssue(): string | null {
  try {
    return localStorage.getItem(INVITE_ISSUE_KEY);
  } catch {
    return null;
  }
}

export function clearInviteIssue() {
  try {
    localStorage.removeItem(INVITE_ISSUE_KEY);
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);

  const api = useCallback(
    async <T,>(path: string, init?: { method?: string; body?: unknown }): Promise<T> => {
      const { data } = await supabaseBrowser().auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(path, {
        method: init?.method ?? (init?.body ? "POST" : "GET"),
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, json.error ?? `Request failed (${res.status})`);
      return json as T;
    },
    [],
  );

  const refresh = useCallback(async () => {
    const r = await api<{ profile: Profile | null; squad: Squad | null }>("/api/profile");
    setProfile(r.profile);
    setSquad(r.squad);
  }, [api]);

  useEffect(() => {
    // Remember an invite link (?invite=<userId>) until onboarding uses it.
    try {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get("invite");
      const issue = params.get("issue");
      if (invite) localStorage.setItem(INVITE_KEY, invite);
      if (issue) localStorage.setItem(INVITE_ISSUE_KEY, issue);
    } catch {}

    let cancelled = false;
    (async () => {
      try {
        const sb = supabaseBrowser();
        let { data } = await sb.auth.getSession();
        if (!data.session) {
          const { error } = await sb.auth.signInAnonymously();
          if (error) throw error;
          ({ data } = await sb.auth.getSession());
        }
        if (cancelled) return;
        setSession(data.session);
        await refresh();
      } catch (err) {
        if (!cancelled) setConfigError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo(() => ({ ready, configError, session, profile, squad, refresh, api }), [ready, configError, session, profile, squad, refresh, api]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
