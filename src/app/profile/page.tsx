"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Button, Card, ErrorNote, Gate, Stat, TopBar } from "@/components/ui";
import { getDemoLocation, getPosition, setDemoLocation } from "@/lib/client-utils";
import { STRETCH_CAP } from "@/lib/points";
import type { Permissions } from "@/lib/types";

const PERM_LABELS: Record<keyof Permissions, string> = { location: "Location", calendar: "Calendar (preview)", screentime: "Screen time (preview)", health: "Health & steps (preview)" };

type SquadInfo = {
  squad: { id: string; name: string; ward: number | null; invite_code: string } | null;
  members: { id: string; username: string; xp: number }[];
  goals: { id: string; xp_target: number; xp_progress: number; issues: { title: string } | null }[];
};

function ProfileInner() {
  const { api, profile, refresh } = useApp();
  const [squad, setSquad] = useState<SquadInfo | null>(null);
  const [code, setCode] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Safe to read localStorage here: <Gate> only mounts this after the client has loaded.
  const [demoLoc, setDemoLoc] = useState(getDemoLocation);

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
      setError("Location access was blocked by your browser.");
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

  return (
    <>
      <TopBar title={profile.username} />
      <ErrorNote message={error} />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Stat label="XP lifetime" value={profile.xp.toLocaleString()} />
          <Stat label="coins" value={profile.coins} />
          <Stat label="verified" value={profile.verified_count} />
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted">
            Stretch level {profile.stretch_level.toFixed(2)} · bonus unlocks fully after 5 verified quests (max {1 + STRETCH_CAP}×)
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-brand" style={{ width: `${stretchPct}%` }} />
          </div>
        </div>
      </Card>

      <Card className="mb-4 space-y-3">
        <h2 className="font-semibold">Squad</h2>
        {squad?.squad ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{squad.squad.name}</p>
                <p className="text-xs text-muted">
                  Invite code <span className="font-mono font-semibold text-fg">{squad.squad.invite_code}</span>
                </p>
              </div>
              <Button variant="ghost" onClick={() => squadAction({ action: "leave" })}>
                Leave
              </Button>
            </div>
            {squad.goals.map((g) => (
              <div key={g.id}>
                <p className="text-xs text-muted">
                  Squad goal: {g.issues?.title} · {g.xp_progress}/{g.xp_target} XP
                </p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-gold" style={{ width: `${Math.min(100, (g.xp_progress / g.xp_target) * 100)}%` }} />
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
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invite code" className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono uppercase" />
              <Button disabled={code.trim().length < 4} onClick={() => squadAction({ action: "join", invite_code: code })}>
                Join
              </Button>
            </div>
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New squad name" className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2" />
              <Button variant="soft" disabled={newName.trim().length < 2} onClick={() => squadAction({ action: "create", name: newName })}>
                Create
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="mb-4 space-y-2">
        <h2 className="font-semibold">Permissions</h2>
        <p className="text-xs text-muted">Revoke any of these at any time. Ripple works with all of them off.</p>
        {(Object.keys(PERM_LABELS) as (keyof Permissions)[]).map((k) => (
          <div key={k} className="flex items-center justify-between py-1">
            <span className="text-sm">{PERM_LABELS[k]}</span>
            <button
              type="button"
              role="switch"
              aria-checked={profile.permissions[k]}
              aria-label={PERM_LABELS[k]}
              onClick={() => togglePerm(k)}
              className={`relative h-7 w-12 rounded-full transition ${profile.permissions[k] ? "bg-brand" : "bg-line"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${profile.permissions[k] ? "left-6" : "left-1"}`} />
            </button>
          </div>
        ))}
      </Card>

      <Card className="mb-4 space-y-2">
        <h2 className="font-semibold">Your interests</h2>
        <p className="text-sm text-muted">{[...profile.interests, ...profile.skills].join(" · ") || "None yet"}</p>
        {Object.keys(profile.category_weights ?? {}).length > 0 && (
          <p className="text-xs text-muted">
            Learned preferences:{" "}
            {Object.entries(profile.category_weights)
              .sort((a, b) => b[1] - a[1])
              .map(([c, w]) => `${c} ${w > 0 ? "+" : ""}${w}`)
              .join(", ")}
          </p>
        )}
      </Card>

      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <Card className="border-dashed">
          <h2 className="font-semibold">Demo tools</h2>
          <label className="mt-2 flex items-center justify-between text-sm">
            Use demo location (pretend I&apos;m on site)
            <input
              type="checkbox"
              checked={demoLoc}
              onChange={(e) => {
                setDemoLocation(e.target.checked);
                setDemoLoc(e.target.checked);
              }}
            />
          </label>
          <p className="mt-1 text-xs text-muted">Only works when the server also has DEMO_MODE=true.</p>
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
