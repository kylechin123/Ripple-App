"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "./AppProvider";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "soft" }) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-strong disabled:opacity-50",
    soft: "bg-brand-soft text-brand-ink hover:brightness-95 disabled:opacity-50",
    ghost: "bg-transparent text-muted hover:bg-surface-2 disabled:opacity-50",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${styles} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${className}`} {...props} />;
}

export function Chip({ active, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active ? "border-brand bg-brand text-white" : "border-line bg-surface text-fg hover:bg-surface-2"
      } ${className}`}
      {...props}
    />
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}

export function TopBar({ title }: { title: string }) {
  const { profile } = useApp();
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
      <h1 className="text-lg font-bold">{title}</h1>
      {profile && (
        <div className="flex gap-2">
          <Stat label="XP" value={profile.xp} />
          <Stat label="🪙" value={profile.coins} />
        </div>
      )}
    </header>
  );
}

const NAV = [
  { href: "/", label: "Quests", icon: "🌊" },
  { href: "/leaderboard", label: "Ranks", icon: "🏆" },
  { href: "/perks", label: "Perks", icon: "🎁" },
  { href: "/profile", label: "Me", icon: "🙂" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useApp();
  if (!profile?.onboarded || pathname.startsWith("/onboarding")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-md justify-around">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" || pathname.startsWith("/quest") : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`flex flex-1 flex-col items-center py-2 text-xs ${active ? "text-brand" : "text-muted"}`}>
              <span className="text-xl" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Gate a page: waits for auth, shows config errors, redirects to onboarding. */
export function useRequireOnboarded() {
  const app = useApp();
  const router = useRouter();
  useEffect(() => {
    if (app.ready && !app.configError && !app.profile?.onboarded) router.replace("/onboarding");
  }, [app.ready, app.configError, app.profile, router]);
  return app;
}

export function Gate({ children }: { children: React.ReactNode }) {
  const { ready, configError, profile } = useRequireOnboarded();
  if (configError) return <ConfigError message={configError} />;
  if (!ready || !profile?.onboarded) return <Spinner />;
  return <>{children}</>;
}

export function ConfigError({ message }: { message: string }) {
  return (
    <Card className="mt-10 border-red-300">
      <h2 className="font-bold">Ripple isn&apos;t configured yet</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-2 text-sm text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Supabase keys, and make sure anonymous sign-ins are enabled (Supabase → Authentication →
        Sign In / Providers).
      </p>
    </Card>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{message}</p>;
}
