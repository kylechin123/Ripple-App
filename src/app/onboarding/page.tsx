"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearInviteIssue, readInvite, readInviteIssue, useApp } from "@/components/AppProvider";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PreferencePicker } from "@/components/PreferencePicker";
import { Button, Card, Chip, ConfigError, ErrorNote, Spinner } from "@/components/ui";
import { DISLIKES, INTEREST_GROUPS, SKILLS, TIMES } from "@/data/preferences";
import { useT } from "@/i18n";
import type { MessageKey } from "@/i18n/en";
import { getPosition } from "@/lib/client-utils";
import type { Permissions } from "@/lib/types";

const PERMISSIONS: { key: keyof Permissions; title: MessageKey; why: MessageKey; real: boolean }[] = [
  { key: "location", title: "perm.location", why: "perm.location.why", real: true },
  { key: "calendar", title: "perm.calendar", why: "perm.calendar.why", real: false },
  { key: "screentime", title: "perm.screentime", why: "perm.screentime.why", real: false },
  { key: "health", title: "perm.health", why: "perm.health.why", real: false },
];

const STEP_TITLES: MessageKey[] = ["onb.title.you", "onb.title.interests", "onb.title.skills", "onb.title.dislikes", "onb.title.time", "onb.title.permissions"];

export default function Onboarding() {
  const { ready, configError, profile, api, refresh } = useApp();
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [ageBand, setAgeBand] = useState<"minor" | "adult" | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [ward, setWard] = useState<number | null>(null);
  const [perms, setPerms] = useState<Permissions>({ location: false, calendar: false, screentime: false, health: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [askingLocation, setAskingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.onboarded) router.replace("/");
  }, [profile, router]);

  // Minors get stricter defaults: screen time and health stay off unless they turn them on.
  function chooseAge(band: "minor" | "adult") {
    setAgeBand(band);
    if (band === "minor") setPerms((p) => ({ ...p, screentime: false, health: false }));
  }

  if (configError) return <ConfigError message={configError} />;
  if (!ready) return <Spinner />;

  const lastStep = STEP_TITLES.length - 1;
  const canNext = [username.trim().length >= 2 && ageBand !== null, interests.length > 0, true, true, true, true][step];

  async function togglePermission(key: keyof Permissions) {
    const next = !perms[key];
    if (key === "location" && next) {
      setAskingLocation(true);
      const pos = await getPosition();
      setAskingLocation(false);
      if (!pos) {
        setError(t("onb.locationDenied"));
        return;
      }
    }
    setError(null);
    setPerms((p) => ({ ...p, [key]: next }));
  }

  async function finish() {
    setError(null);
    try {
      setBusy(t("onb.saving"));
      await api("/api/profile", {
        body: {
          username: username.trim(),
          age_band: ageBand,
          ward,
          interests,
          skills,
          dislikes,
          weekly_minutes: minutes,
          permissions: perms,
          invited_by: readInvite(),
        },
      });
      setBusy(t("home.finding"));
      const pos = perms.location ? await getPosition() : null;
      const issueSlug = readInviteIssue();
      await api("/api/quests", { body: { ...(pos ? { lat: pos.lat, lng: pos.lng } : {}), ...(issueSlug ? { issue_slug: issueSlug } : {}) } });
      clearInviteIssue();
      await refresh();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  if (busy) return <Spinner label={busy} />;

  const optional = (list: string[]) => (list.length ? t("common.next") : t("common.skip"));

  return (
    <div className="pt-6">
      {/* Full-screen AI background behind onboarding */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url(/images/onboarding.webp)" }} />
      <div aria-hidden className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-[#1e1033]/30" />

      <div className="mb-6 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
            <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-xl shadow-lg" />
            <p className="font-display text-xl font-bold drop-shadow">Ripple</p>
          </div>
          <LanguagePicker compact />
        </div>
        {step === 0 && <p className="mt-4 text-sm font-medium opacity-90 drop-shadow">{t("onb.pitch")}</p>}
        <h1 className="mt-2 text-3xl font-bold drop-shadow-md">{t(STEP_TITLES[step])}</h1>
        <div className="mt-4 flex gap-1.5">
          {STEP_TITLES.map((s, i) => (
            <div key={s} className={`h-2 flex-1 rounded-full transition ${i <= step ? "bg-white shadow" : "bg-white/30"}`} />
          ))}
        </div>
      </div>

      <Card className="space-y-4">
        {step === 0 && (
          <>
            <label className="block text-sm font-medium">
              {t("onb.username")}
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                placeholder={t("onb.usernamePlaceholder")}
                className="mt-1 w-full rounded-2xl border-2 border-line bg-surface-2 px-3 py-3 outline-none focus:border-brand"
              />
            </label>
            <p className="text-xs text-muted">{t("onb.noRealNames")}</p>
            <div>
              <p className="mb-2 text-sm font-medium">{t("onb.age")}</p>
              <div className="flex gap-2">
                <Chip active={ageBand === "minor"} onClick={() => chooseAge("minor")}>
                  {t("onb.under18")}
                </Chip>
                <Chip active={ageBand === "adult"} onClick={() => chooseAge("adult")}>
                  18+
                </Chip>
              </div>
              {ageBand === "minor" && <p className="mt-2 text-xs text-muted">{t("onb.teenSafe")}</p>}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">{t("onb.interestsHint")}</p>
            <PreferencePicker groups={INTEREST_GROUPS} value={interests} onChange={setInterests} placeholder={t("picker.chooseInterests")} />
          </>
        )}

        {step === 2 && <PreferencePicker options={SKILLS} value={skills} onChange={setSkills} placeholder={t("picker.chooseSkills")} />}

        {step === 3 && <PreferencePicker options={DISLIKES} value={dislikes} onChange={setDislikes} placeholder={t("picker.chooseDislikes")} />}

        {step === 4 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {TIMES.map((tm) => (
                <Chip key={tm.value} active={minutes === tm.value} onClick={() => setMinutes(tm.value)} className="py-3">
                  {t(`time.${tm.value}` as MessageKey)}
                </Chip>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">{t("onb.wardPrompt")}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                  <Chip key={w} active={ward === w} onClick={() => setWard(ward === w ? null : w)}>
                    {t("common.ward", { n: w })}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("onb.permsHint")}</p>
            {PERMISSIONS.map((p) => (
              <div key={p.key} className="flex items-start justify-between gap-3 rounded-2xl bg-surface-2 p-3">
                <div>
                  <p className="font-medium">
                    {t(p.title)}
                    {!p.real && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-[10px] uppercase text-muted">{t("perm.preview")}</span>}
                  </p>
                  <p className="text-xs text-muted">{t(p.why)}</p>
                  {ageBand === "minor" && (p.key === "screentime" || p.key === "health") && <p className="mt-1 text-xs text-muted">{t("perm.offForMinors")}</p>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={perms[p.key]}
                  aria-label={t(p.title)}
                  onClick={() => togglePermission(p.key)}
                  className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${perms[p.key] ? "bg-grad" : "bg-line"}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${perms[p.key] ? "left-6" : "left-1"}`} />
                </button>
              </div>
            ))}
            {askingLocation && <p className="text-sm text-muted">{t("onb.askingLocation")}</p>}
          </div>
        )}

        <ErrorNote message={error} />
      </Card>

      <div className="mt-4 flex gap-2">
        {step > 0 && (
          <Button variant="soft" onClick={() => setStep(step - 1)}>
            {t("common.back")}
          </Button>
        )}
        {step < lastStep ? (
          <Button variant="fun" className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {step === 2 ? optional(skills) : step === 3 ? optional(dislikes) : t("common.next")}
          </Button>
        ) : (
          <Button variant="fun" className="flex-1" disabled={askingLocation} onClick={finish}>
            ⚡ {t("onb.finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
