import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import type { Profile } from "../types";

let admin: SupabaseClient | null = null;

/** Service-role client. Bypasses RLS, so it must only ever run on the server. */
export function supabaseAdmin() {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Resolve the caller from the `Authorization: Bearer <supabase access token>` header. */
export async function requireUser(req: Request): Promise<{ userId: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Not signed in");
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid session");
  return { userId: data.user.id };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function requireProfile(req: Request) {
  const { userId } = await requireUser(req);
  const profile = await getProfile(userId);
  if (!profile || !profile.onboarded) throw new HttpError(409, "Finish onboarding first");
  return profile;
}

/** Wrap a route handler so thrown HttpErrors become JSON responses. */
export function handler<A extends unknown[]>(fn: (req: Request, ...rest: A) => Promise<Response>) {
  return async (req: Request, ...rest: A) => {
    try {
      return await fn(req, ...rest);
    } catch (err) {
      unstable_rethrow(err); // let Next.js handle its own control-flow errors (e.g. prerender bailout)
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error(err);
      const message = err instanceof Error ? err.message : "Server error";
      return Response.json({ error: message }, { status: 500 });
    }
  };
}
