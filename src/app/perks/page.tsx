"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Button, Card, ErrorNote, Gate, Spinner, TopBar } from "@/components/ui";
import { useT } from "@/i18n";

type Perk = { id: string; business: string; title: string; description: string; coin_cost: number; emoji: string };
type Redemption = { id: string; code: string; created_at: string; perks: { business: string; title: string; emoji: string } | null };

function PerksInner() {
  const { api, refresh } = useApp();
  const t = useT();
  const [data, setData] = useState<{ perks: Perk[]; redemptions: Redemption[]; coins: number; xp: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<{ code: string; perk: Perk } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api("/api/perks"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    api<NonNullable<typeof data>>("/api/perks")
      .then((r) => !cancelled && setData(r))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function redeem(perk: Perk) {
    setError(null);
    setBusy(perk.id);
    try {
      const { code } = await api<{ code: string }>("/api/perks", { body: { perk_id: perk.id } });
      setJustRedeemed({ code, perk });
      await Promise.all([load(), refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  if (!data) return error ? <ErrorNote message={error} /> : <Spinner />;

  return (
    <>
      <TopBar title={t("perks.title")} />
      <p className="mb-4 text-sm text-muted">{t("perks.intro")}</p>
      <ErrorNote message={error} />

      {justRedeemed && (
        <Card className="animate-pop mb-4 border-brand text-center">
          <p className="text-sm font-bold text-brand">🎉 {t("perks.redeemed")}</p>
          <p className="mt-1 font-bold">
            {justRedeemed.perk.emoji} {justRedeemed.perk.title}
          </p>
          <p className="text-xs text-muted">{justRedeemed.perk.business}</p>
          <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3">
            <QRCodeSVG value={justRedeemed.code} size={150} />
          </div>
          <p className="mt-2 font-mono text-sm">{justRedeemed.code}</p>
          <p className="mt-1 text-xs text-muted">{t("perks.showCounter", { xp: data.xp.toLocaleString() })}</p>
        </Card>
      )}

      <div className="grid gap-3">
        {data.perks.map((p) => {
          const affordable = data.coins >= p.coin_cost;
          return (
            <Card key={p.id} className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.title}</p>
                <p className="text-xs text-muted">
                  {p.business} · {p.description}
                </p>
              </div>
              <Button variant={affordable ? "primary" : "soft"} disabled={!affordable || busy === p.id} onClick={() => redeem(p)} className="shrink-0 px-3 py-2">
                {p.coin_cost} 🪙
              </Button>
            </Card>
          );
        })}
      </div>

      {data.redemptions.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-muted">{t("perks.yourCodes")}</h3>
          <div className="space-y-2">
            {data.redemptions.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span>{r.perks?.emoji}</span>
                <span className="flex-1 truncate">{r.perks?.title}</span>
                <span className="font-mono text-xs text-muted">{r.code}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="mt-6 text-center text-xs text-muted">{t("perks.mock")}</p>
    </>
  );
}

export default function Perks() {
  return (
    <Gate>
      <PerksInner />
    </Gate>
  );
}
