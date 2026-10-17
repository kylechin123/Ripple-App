"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeGrid, StreakPill, useAchievements } from "@/components/Achievements";
import { useApp } from "@/components/AppProvider";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Button, Card, ErrorNote, Gate, Stat, TopBar } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n/en";
import { getDemoLocation, getPosition, setDemoLocation } from "@/lib/client-utils";
import { STRETCH_CAP } from "@/lib/points";
import type { Permissions } from "@/lib/types";

const PERMS: { key: keyof Permissions; label: MessageKey; preview: boolean }[] = [
  { key: "location", label: "perm.location", preview: false },
  { key: "calendar", label: "perm.calendar", preview: true },
  { key: "screentime", label: "perm.screentime", preview: true },
  { key: "health", label: "perm.health", preview: true },
];

type SquadInfo = {
  squad: { id: string; name: string; ward: number | null; invite_code: string } | null;
  members: { id: string; username: string; xp: number }[];
  goals: { id: string; xp_target: number; xp_progress: number; issues: { title: string } | null }[];
};

function ProfileInner() {
  const { api, profile, refresh } = useApp();
  const { t, opt } = useI18n();
  const [squad, setSquad] = useState<SquadInfo | null>(null);
  const [code, setCode] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Safe to read localStorage here: <Gate> only mounts this after the client has loaded.
  const [demoLoc, setDemoLoc] = useState(getDemoLocation);
  const achievements = useAchievements();

  const loadSquad = useCallback(async () => {
    try {
      setSquad(await api<SquadInfo>("/api/squads"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    api<SquadInfo>("/api/squads")
      .then((s) => !cancelled && setSquad(s))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (!profile) return null;

  async function togglePerm(key: keyof Permissions) {
    setError(null);
    const next = !profile!.permissions[key];
    if (key === "location" && next && !(await getPosition())) {
      setError(t("profile.locationBlocked"));
      return;
    }
    try {
      await api("/api/profile", { body: { permissions: { ...profile!.permissions, [key]: next } } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function squadAction(body: Record<string, string>) {
    setError(null);
    try {
      await api("/api/squads", { body });
      setCode("");
      setNewName("");
      await Promise.all([loadSquad(), refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const stretchPct = Math.min(100, (profile.verified_count / 5) * 100);
  const weekly = profile.weekly_minutes >= 60 ? t("profile.hoursShort", { n: Math.round(profile.weekly_minutes / 6) / 10 }) : t("profile.minShort", { n: profile.weekly_minutes });

  return (
    <>
      <TopBar title={profile.username} />
      <ErrorNote message={error} />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Stat label={t("profile.xpLifetime")} value={profile.xp.toLocaleString()} />
          <Stat label={t("profile.coins")} value={profile.coins} />
          <Stat label={t("profile.verified")} value={profile.verified_count} />
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted">{t("profile.stretch", { level: profile.stretch_level.toFixed(2), max: 1 + STRETCH_CAP })}</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-grad" style={{ width: `${stretchPct}%` }} />
          </div>
        </div>
        {achievements && (
          <div className="mt-3">
            <StreakPill weeks={achievements.streak.weeks} active={achievements.streak.activeThisWeek} />
          </div>
        )}
      </Card>

      {achievements && (
        <div className="mb-4">
          <BadgeGrid data={achievements} />
        </div>
      )}

      <Link href="/profile/hours" className="mb-4 block">
        <Card className="flex items-center gap-3 transition hover:border-brand">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-grad text-2xl">⏱️</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("hours.title")}</p>
            <p className="text-xs text-muted">{t("profile.hoursBlurb")}</p>
          </div>
          <span className="text-muted">›</span>
        </Card>
      </Link>

      <Card className="mb-4 space-y-3">
        <h2 className="font-semibold">👥 {t("profile.squad")}</h2>
        {squad?.squad ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{squad.squad.name}</p>
                <p className="text-xs text-muted">
                  {t("profile.inviteCode")} <span className="font-mono font-semibold text-fg">{squad.squad.invite_code}</span>
                </p>
              </div>
              <Button variant="ghost" onClick={() => squadAction({ action: "leave" })}>
                {t("profile.leave")}
              </Button>
            </div>
            {squad.goals.map((g) => (
              <div key={g.id}>
                <p className="text-xs text-muted">{t("profile.squadGoal", { title: g.issues?.title ?? "", progress: g.xp_progress, target: g.xp_target })}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-grad" style={{ width: `${Math.min(100, (g.xp_progress / g.xp_target) * 100)}%` }} />
                </div>
              </div>
            ))}
            <div className="space-y-1">
              {squad.members.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span>{m.username}</span>
                  <span className="tabular-nums text-muted">{m.xp} XP</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("profile.inviteCode")}
                className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface-2 px-3 py-2 font-mono uppercase outline-none focus:border-brand"
              />
              <Button disabled={code.trim().length < 4} onClick={() => squadAction({ action: "join", invite_code: code })}>
                {t("profile.join")}
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("profile.newSquadName")}
                className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface-2 px-3 py-2 outline-none focus:border-brand"
              />
              <Button variant="soft" disabled={newName.trim().length < 2} onClick={() => squadAction({ action: "create", name: newName })}>
                {t("profile.create")}
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">✨ {t("profile.preferences")}</h2>
          <Link href="/profile/preferences">
            <Button variant="soft" className="px-3 py-1.5 text-xs">
              {t("common.edit")}
            </Button>
          </Link>
        </div>
        {(
          [
            ["prefs.interests", profile.interests],
            ["prefs.skills", profile.skills],
            ["prefs.avoiding", profile.dislikes],
          ] as const
        ).map(([label, list]) => (
          <div key={label}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t(label)}</p>
            {list.length ? (
              <div className="flex flex-wrap gap-1.5">
                {list.map((v) => (
                  <span key={v} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-ink">
                    {opt(v)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">{t("profile.noneYet")}</p>
            )}
          </div>
        ))}
        <p className="text-xs text-muted">
          ⏱ {t("profile.perWeek", { time: weekly })}
          {profile.ward ? ` · ${t("common.ward", { n: profile.ward })}` : ""}
        </p>
      </Card>

      <Card className="mb-4 space-y-3">
        <h2 className="font-semibold">🌐 {t("lang.label")}</h2>
        <LanguagePicker />
        <p className="text-xs text-muted">{t("lang.note")}</p>
      </Card>

      <Card className="mb-4 space-y-2">
        <h2 className="font-semibold">🔒 {t("profile.permissions")}</h2>
        <p className="text-xs text-muted">{t("profile.permsHint")}</p>
        {PERMS.map((p) => (
          <div key={p.key} className="flex items-center justify-between py-1">
            <span className="text-sm">
              {t(p.label)}
              {p.preview && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-[10px] uppercase text-muted">{t("perm.preview")}</span>}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={profile.permissions[p.key]}
              aria-label={t(p.label)}
              onClick={() => togglePerm(p.key)}
              className={`relative h-7 w-12 rounded-full transition ${profile.permissions[p.key] ? "bg-grad" : "bg-line"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${profile.permissions[p.key] ? "left-6" : "left-1"}`} />
            </button>
          </div>
        ))}
      </Card>

      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <Card className="border-dashed">
          <h2 className="font-semibold">🧪 {t("profile.demoTools")}</h2>
          <label className="mt-2 flex items-center justify-between text-sm">
            {t("profile.demoLocation")}
            <input
              type="checkbox"
              checked={demoLoc}
              onChange={(e) => {
                setDemoLocation(e.target.checked);
                setDemoLoc(e.target.checked);
              }}
            />
          </label>
          <p className="mt-1 text-xs text-muted">{t("profile.demoNote")}</p>
        </Card>
      )}
    </>
  );
}

export default function ProfilePage() {
  return (
    <Gate>
      <ProfileInner />
    </Gate>
  );
}
