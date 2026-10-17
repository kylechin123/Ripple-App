"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PreferencePicker } from "@/components/PreferencePicker";
import { Button, Card, Chip, ErrorNote, Gate, TopBar } from "@/components/ui";
import { DISLIKES, INTEREST_GROUPS, SKILLS, TIMES } from "@/data/preferences";
import { useT } from "@/i18n";
import type { MessageKey } from "@/i18n/en";
import type { Profile } from "@/lib/types";

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

function PreferencesForm({ profile }: { profile: Profile }) {
  const { api, refresh } = useApp();
  const t = useT();
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
  const known = TIMES.some((tm) => tm.value === profile.weekly_minutes);
  const times = known ? TIMES : [...TIMES, { label: "", value: profile.weekly_minutes }];
  const timeLabel = (v: number) => (TIMES.some((tm) => tm.value === v) ? t(`time.${v}` as MessageKey) : t("time.custom", { n: v }));
  const learned = Object.entries(profile.category_weights ?? {}).filter(([, w]) => w !== 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("prefs.note")}</p>

      <Card>
        <h2 className="mb-3 font-semibold">💜 {t("prefs.interests")}</h2>
        <PreferencePicker groups={INTEREST_GROUPS} value={interests} onChange={setInterests} placeholder={t("picker.chooseInterests")} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">🛠️ {t("prefs.skills")}</h2>
        <PreferencePicker options={SKILLS} value={skills} onChange={setSkills} placeholder={t("picker.chooseSkills")} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">🙅 {t("prefs.avoid")}</h2>
        <PreferencePicker options={DISLIKES} value={dislikes} onChange={setDislikes} placeholder={t("picker.chooseDislikes")} />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="mb-3 font-semibold">⏱ {t("prefs.time")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {times.map((tm) => (
              <Chip key={tm.value} active={minutes === tm.value} onClick={() => setMinutes(tm.value)} className="py-3">
                {timeLabel(tm.value)}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">📍 {t("prefs.ward")}</h2>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
              <Chip key={w} active={ward === w} onClick={() => setWard(ward === w ? null : w)}>
                {t("common.ward", { n: w })}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">🧠 {t("prefs.learned")}</h2>
        <p className="mt-1 text-xs text-muted">
          {learned.length
            ? t("prefs.learnedSome", { list: learned.map(([c, w]) => `${t(`cat.${c}` as MessageKey)} ${w > 0 ? "+" : ""}${w}`).join(", ") })
            : t("prefs.learnedNone")}
        </p>
        <Button variant="ghost" className="mt-2 px-0" disabled={busy || learned.length === 0} onClick={() => save({ category_weights: {} })}>
          {t("prefs.reset")}
        </Button>
      </Card>

      <ErrorNote message={error} />

      <div className="sticky bottom-20 z-10 flex gap-2">
        <Link href="/profile" className="flex-1">
          <Button variant="soft" className="w-full">
            {dirty ? t("common.cancel") : t("common.back")}
          </Button>
        </Link>
        <Button variant="fun" className="flex-[2]" disabled={!dirty || busy || interests.length === 0} onClick={() => save(changes)}>
          {busy ? t("common.saving") : interests.length === 0 ? t("prefs.pickOne") : t("prefs.save")}
        </Button>
      </div>
    </div>
  );
}

function PreferencesInner() {
  const { profile } = useApp();
  const t = useT();
  // Re-key the form on the saved values so it resets to exactly what the server stored.
  const key = JSON.stringify([profile?.interests, profile?.skills, profile?.dislikes, profile?.weekly_minutes, profile?.ward, profile?.category_weights]);
  const [initialKey] = useState(key);
  if (!profile) return null;
  return (
    <>
      <TopBar title={t("profile.preferences")} />
      {key !== initialKey && (
        <p className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand-ink">
          {t("prefs.saved")}{" "}
          <Link href="/profile" className="underline">
            {t("prefs.backToProfile")}
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
