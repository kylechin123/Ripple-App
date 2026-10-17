"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { IssueArt } from "@/components/IssueArt";
import type { MapIssue } from "@/components/IssueMap";
import { Button, Card, ErrorNote, Gate, Spinner, TopBar } from "@/components/ui";
import { useT } from "@/i18n";
import type { MessageKey } from "@/i18n/en";
import { getPosition } from "@/lib/client-utils";

const IssueMap = dynamic(() => import("@/components/IssueMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-2" /> });

const STATUS_LABEL: Record<MapIssue["status"], MessageKey> = { open: "map.open", active: "map.active", helped: "map.helped" };

function MapInner() {
  const { api, profile } = useApp();
  const router = useRouter();
  const t = useT();
  const [issues, setIssues] = useState<MapIssue[] | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ issues: MapIssue[] }>("/api/map")
      .then((r) => !cancelled && setIssues(r.issues))
      .catch((err) => !cancelled && setError(err.message));
    if (profile?.permissions.location) getPosition().then((p) => !cancelled && p && setMe({ lat: p.lat, lng: p.lng }));
    return () => {
      cancelled = true;
    };
  }, [api, profile?.permissions.location]);

  const issue = issues?.find((i) => i.id === selected) ?? null;

  async function start(i: MapIssue) {
    setError(null);
    setBusy(true);
    try {
      await api("/api/quests", { body: { issue_slug: i.slug, ...(me ? { lat: me.lat, lng: me.lng } : {}) } });
      const r = await api<{ issues: MapIssue[] }>("/api/map");
      const fresh = r.issues.find((x) => x.id === i.id);
      if (fresh?.questId) router.push(`/quest/${fresh.questId}`);
      else router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title={t("nav.map")} />
      <div className="relative -mx-4 h-[58vh] overflow-hidden border-y border-line">
        {issues ? <IssueMap issues={issues} me={me} selectedId={selected} onSelect={setSelected} /> : <Spinner />}
        <div className="pointer-events-none absolute right-3 top-3 z-[500] flex flex-col items-end gap-1 text-[11px] font-semibold">
          <span className="rounded-full bg-white/90 px-2 py-1 text-[#7c3aed] shadow">● {t("map.legendOpen")}</span>
          <span className="rounded-full bg-white/90 px-2 py-1 text-[#f97316] shadow">● {t("map.legendYours")}</span>
          <span className="rounded-full bg-white/90 px-2 py-1 text-[#16a34a] shadow">● {t("map.legendHelped")}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <ErrorNote message={error} />
        {issue ? (
          <Card className="animate-pop overflow-hidden p-0">
            <IssueArt category={issue.category} className="h-28 w-full" />
            <div className="space-y-2 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-brand">
                {issue.ward ? t("common.ward", { n: issue.ward }) : t("common.yorkRegion")} · {t(STATUS_LABEL[issue.status])}
              </p>
              <h2 className="text-lg font-bold leading-snug">{issue.title}</h2>
              <p className="line-clamp-3 text-sm text-muted">{issue.summary}</p>
              <p className="text-xs text-muted">🙌 {t(issue.helpers === 1 ? "map.helpersOne" : "map.helpers", { n: issue.helpers })}</p>
              {issue.questId ? (
                <Link href={`/quest/${issue.questId}`}>
                  <Button variant="fun" className="mt-1 w-full">
                    {t("map.continue")}
                  </Button>
                </Link>
              ) : (
                <Button variant="fun" className="mt-1 w-full" disabled={busy} onClick={() => start(issue)}>
                  {busy ? t("quest.starting") : t("map.start")}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="text-center text-sm text-muted">{t("map.tapPin")}</Card>
        )}

        {issues && (
          <div className="space-y-2">
            {issues.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setSelected(i.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected === i.id ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
              >
                <IssueArt category={i.category} className="h-12 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{i.title}</p>
                  <p className="text-xs text-muted">
                    {t(STATUS_LABEL[i.status])} · 🙌 {i.helpers}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function MapPage() {
  return (
    <Gate>
      <MapInner />
    </Gate>
  );
}
