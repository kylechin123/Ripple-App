"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PreferencePicker } from "@/components/PreferencePicker";
import { Button, Card, Chip, ErrorNote, Gate, TopBar } from "@/components/ui";
import { DISLIKES, INTEREST_GROUPS, SKILLS, TIMES } from "@/data/preferences";
import type { Profile } from "@/lib/types";

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

function PreferencesForm({ profile }: { profile: Profile }) {
  const { api, refresh } = useApp();
  // Initialised from the saved profile; the parent re-keys this form after every save.
  const [interests, setInterests] = useState(profile.interests);
  const [skills, setSkills] = useState(profile.skills);
  const [dislikes, setDislikes] = useState(profile.dislikes);
  const [minutes, setMinutes] = useState(profile.weekly_minutes);
  const [ward, setWard] = useState<number | null>(profile.ward);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changes: Record<string, unknown> = {};
  if (!sameList(interests, profile.interests)) changes.interests = interests;
  if (!sameList(skills, profile.skills)) changes.skills = skills;
  if (!sameList(dislikes, profile.dislikes)) changes.dislikes = dislikes;
  if (minutes !== profile.weekly_minutes) changes.weekly_minutes = minutes;
  if (ward !== profile.ward) changes.ward = ward;
  const dirty = Object.keys(changes).length > 0;

  async function save(body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      await api("/api/profile", { body });
      await refresh(); // new profile -> parent re-keys this form with the saved values
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  // Keep a custom time value (e.g. from an older version) selectable.
  const times = TIMES.some((t) => t.value === profile.weekly_minutes) ? TIMES : [...TIMES, { label: `${profile.weekly_minutes} min / week`, value: profile.weekly_minutes }];
  const learned = Object.entries(profile.category_weights ?? {}).filter(([, w]) => w !== 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Changes apply to new quests. Quests you&apos;ve already got stay as they are.</p>

      <Card>
        <h2 className="mb-3 font-semibold">Interests</h2>
        <PreferencePicker groups={INTEREST_GROUPS} value={interests} onChange={setInterests} addPlaceholder="Something else? e.g. Birdwatching" />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Skills</h2>
        <PreferencePicker options={SKILLS} value={skills} onChange={setSkills} addPlaceholder="Another skill? e.g. Sign language" />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Things to avoid</h2>
        <PreferencePicker options={DISLIKES} value={dislikes} onChange={setDislikes} addPlaceholder="Anything else to avoid?" />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="mb-3 font-semibold">Time per week</h2>
          <div className="grid grid-cols-2 gap-2">
            {times.map((t) => (
              <Chip key={t.value} active={minutes === t.value} onClick={() => setMinutes(t.value)} className="py-3">
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Markham ward</h2>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
              <Chip key={w} active={ward === w} onClick={() => setWard(ward === w ? null : w)}>
                Ward {w}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Learned topics</h2>
        <p className="mt-1 text-xs text-muted">
          {learned.length
            ? `Ripple has learned from the quests you pick and skip: ${learned.map(([c, w]) => `${c} ${w > 0 ? "+" : ""}${w}`).join(", ")}.`
            : "Ripple learns which topics you like from the quests you pick and skip."}
        </p>
        <Button variant="ghost" className="mt-2 px-0" disabled={busy || learned.length === 0} onClick={() => save({ category_weights: {} })}>
          Reset learned topics
        </Button>
      </Card>

      <ErrorNote message={error} />

      <div className="sticky bottom-20 z-10 flex gap-2">
        <Link href="/profile" className="flex-1">
          <Button variant="soft" className="w-full">
            {dirty ? "Cancel" : "Back"}
          </Button>
        </Link>
        <Button className="flex-[2]" disabled={!dirty || busy || interests.length === 0} onClick={() => save(changes)}>
          {busy ? "Saving…" : interests.length === 0 ? "Pick at least one interest" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function PreferencesInner() {
  const { profile } = useApp();
  // Re-key the form on the saved values so it resets to exactly what the server stored.
  const key = JSON.stringify([profile?.interests, profile?.skills, profile?.dislikes, profile?.weekly_minutes, profile?.ward, profile?.category_weights]);
  const [initialKey] = useState(key);
  if (!profile) return null;
  return (
    <>
      <TopBar title="Preferences" />
      {key !== initialKey && (
        <p className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand-ink">
          Saved ✓ New quests will use these preferences.{" "}
          <Link href="/profile" className="underline">
            Back to profile
          </Link>
        </p>
      )}
      <PreferencesForm key={key} profile={profile} />
    </>
  );
}

export default function PreferencesPage() {
  return (
    <Gate>
      <PreferencesInner />
    </Gate>
  );
}
