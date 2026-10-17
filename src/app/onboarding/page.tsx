"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearInviteIssue, readInvite, readInviteIssue, useApp } from "@/components/AppProvider";
import { Button, Card, Chip, ConfigError, ErrorNote, Spinner } from "@/components/ui";
import { getPosition } from "@/lib/client-utils";
import type { Permissions } from "@/lib/types";

const INTERESTS = ["Nature", "Sports", "Art & design", "Coding", "Music", "Food", "Animals", "Gaming", "Photography", "Reading", "Fashion", "Science"];
const SKILLS = ["Design", "Writing", "Coding", "Organizing", "Teaching", "Languages", "Social media", "Building things", "Public speaking", "Photography"];
const DISLIKES = ["Crowds", "Getting dirty", "Talking to strangers", "Early mornings", "Long walks", "Screens"];
const TIMES = [
  { label: "< 30 min / week", value: 30 },
  { label: "1 hour / week", value: 60 },
  { label: "2–3 hours / week", value: 150 },
  { label: "5+ hours / week", value: 300 },
];

const PERMISSIONS: { key: keyof Permissions; title: string; why: string; real: boolean }[] = [
  { key: "location", title: "Location", why: "Finds issues and events near you, and checks you're on site for location quests. Used per request, never stored.", real: true },
  { key: "calendar", title: "Calendar", why: "Suggests quests that fit your free time.", real: false },
  { key: "screentime", title: "Screen time", why: "Infers interests from the apps you use most.", real: false },
  { key: "health", title: "Health & steps", why: "Unlocks active quests and counts steps on cleanup walks.", real: false },
];

const STEPS = ["You", "Interests", "Skills", "Dislikes", "Time", "Permissions"];

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function Onboarding() {
  const { ready, configError, profile, api, refresh } = useApp();
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

  const canNext = [username.trim().length >= 2 && ageBand !== null, interests.length > 0, true, true, true, true][step];

  async function togglePermission(key: keyof Permissions) {
    const next = !perms[key];
    if (key === "location" && next) {
      setBusy("Asking for location…");
      const pos = await getPosition();
      setBusy(null);
      if (!pos) {
        setError("Location wasn't allowed. That's fine, Ripple works without it.");
        return;
      }
    }
    setError(null);
    setPerms((p) => ({ ...p, [key]: next }));
  }

  async function finish() {
    setError(null);
    try {
      setBusy("Saving your profile…");
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
      setBusy("Finding a quest that fits you…");
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

  if (busy && step === STEPS.length - 1 && busy !== "Asking for location…") return <Spinner label={busy} />;

  return (
    <div className="pt-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Ripple</p>
        <h1 className="mt-1 text-2xl font-bold">{["Let's get you started", "What are you into?", "What are you good at?", "Anything you'd rather avoid?", "How much time do you have?", "Permissions (all optional)"][step]}</h1>
        <div className="mt-4 flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <Card className="space-y-4">
        {step === 0 && (
          <>
            <label className="block text-sm font-medium">
              Pick a username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                placeholder="e.g. aisha_draws"
                className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-3 outline-none focus:border-brand"
              />
            </label>
            <p className="text-xs text-muted">No real names needed. Ripple never asks for one.</p>
            <div>
              <p className="mb-2 text-sm font-medium">Age</p>
              <div className="flex gap-2">
                <Chip active={ageBand === "minor"} onClick={() => chooseAge("minor")}>
                  Under 18
                </Chip>
                <Chip active={ageBand === "adult"} onClick={() => chooseAge("adult")}>
                  18+
                </Chip>
              </div>
              {ageBand === "minor" && <p className="mt-2 text-xs text-muted">We&apos;ll keep quests teen-safe and use stricter privacy defaults.</p>}
            </div>
          </>
        )}

        {step === 1 && (
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Chip key={i} active={interests.includes(i)} onClick={() => setInterests(toggle(interests, i))}>
                {i}
              </Chip>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((i) => (
              <Chip key={i} active={skills.includes(i)} onClick={() => setSkills(toggle(skills, i))}>
                {i}
              </Chip>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-wrap gap-2">
            {DISLIKES.map((i) => (
              <Chip key={i} active={dislikes.includes(i)} onClick={() => setDislikes(toggle(dislikes, i))}>
                {i}
              </Chip>
            ))}
          </div>
        )}

        {step === 4 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {TIMES.map((t) => (
                <Chip key={t.value} active={minutes === t.value} onClick={() => setMinutes(t.value)} className="py-3">
                  {t.label}
                </Chip>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Your Markham ward (optional, for ward leaderboards)</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                  <Chip key={w} active={ward === w} onClick={() => setWard(ward === w ? null : w)}>
                    Ward {w}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Ripple works fully with everything off. You can change these any time in your profile.</p>
            {PERMISSIONS.map((p) => (
              <div key={p.key} className="flex items-start justify-between gap-3 rounded-xl bg-surface-2 p-3">
                <div>
                  <p className="font-medium">
                    {p.title}
                    {!p.real && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-[10px] uppercase text-muted">preview</span>}
                  </p>
                  <p className="text-xs text-muted">{p.why}</p>
                  {ageBand === "minor" && (p.key === "screentime" || p.key === "health") && <p className="mt-1 text-xs text-muted">Off by default for under-18s.</p>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={perms[p.key]}
                  aria-label={p.title}
                  onClick={() => togglePermission(p.key)}
                  className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${perms[p.key] ? "bg-brand" : "bg-line"}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${perms[p.key] ? "left-6" : "left-1"}`} />
                </button>
              </div>
            ))}
            {busy && <p className="text-sm text-muted">{busy}</p>}
          </div>
        )}

        <ErrorNote message={error} />
      </Card>

      <div className="mt-4 flex gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {step === 2 || step === 3 ? (step === 2 ? (skills.length ? "Next" : "Skip") : dislikes.length ? "Next" : "Skip") : "Next"}
          </Button>
        ) : (
          <Button className="flex-1" disabled={Boolean(busy)} onClick={finish}>
            Find my first quest
          </Button>
        )}
      </div>
    </div>
  );
}
