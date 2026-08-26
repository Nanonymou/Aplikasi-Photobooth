"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CURRENT_PLAN,
  formatRupiah,
  nextPlan,
  startCheckout,
  yearlySaving,
  type BillingCycle,
  type Plan,
} from "@/lib/billing/plans";

/**
 * The button that starts an upgrade.
 *
 * Its own component because the same action belongs in more than one place — a
 * card here, and eventually the moment a free account runs out of design slots —
 * and a second copy is how one of them ends up saying something the other does
 * not.
 *
 * What it promises is deliberately modest. There is no payment provider behind
 * this yet, so pressing it records a choice and says so; a button that announced
 * "Selamat, kamu Pro!" would be the interface telling a lie the invoice will
 * later contradict.
 */
export function UpgradeButton({
  plan,
  cycle = "monthly",
  className,
}: {
  plan: Plan;
  cycle?: BillingCycle;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(false);

  async function upgrade() {
    if (busy || recorded) return;
    setBusy(true);
    await startCheckout(plan.id, cycle);
    setBusy(false);
    setRecorded(true);
  }

  return (
    <Button
      onClick={upgrade}
      disabled={busy || recorded}
      className={className}
      aria-live="polite"
    >
      {busy ? (
        <Loader2 className="animate-spin" />
      ) : recorded ? (
        <Check className="settings-confirm" />
      ) : (
        <Sparkles />
      )}
      {recorded ? "Pilihan tercatat" : `Naik ke ${plan.name}`}
    </Button>
  );
}

/**
 * The offer card.
 *
 * One tier up, never the most expensive one — a free account shown the Studio
 * price is being shown a number that has nothing to do with them. Three benefits,
 * taken from that plan's own feature list rather than written again here, so the
 * pitch and the pricing page cannot promise different things.
 *
 * Absent entirely at the top tier. An account that has bought everything should
 * not be sold to; the space is better empty.
 */
export function UpgradeOffer() {
  const plan = nextPlan(CURRENT_PLAN);
  if (!plan) return null;

  const saving = yearlySaving(plan);

  return (
    <section className="border-primary/30 from-primary/10 to-primary/0 flex flex-col gap-4 rounded-xl border bg-gradient-to-br p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-primary flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" />
            Naik paket
          </span>
          <p className="text-lg font-semibold tracking-tight">{plan.name}</p>
          <p className="text-muted-foreground text-sm">{plan.tagline}</p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums">
            {formatRupiah(plan.priceMonthly)}
          </p>
          <p className="text-muted-foreground text-xs">per bulan</p>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {plan.features.slice(0, 3).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>

      {saving > 0 && (
        <p className="text-muted-foreground text-xs">
          Ditagih tahunan jadi{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatRupiah(plan.priceYearly)}
          </span>
          /bln — hemat{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatRupiah(saving)}
          </span>{" "}
          setahun.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <UpgradeButton plan={plan} />
        <Button asChild variant="ghost" size="sm">
          <Link href="/langganan">Bandingkan semua paket</Link>
        </Button>
      </div>

      {/* Stated up front rather than after the fact: what a button will do to
          somebody's money belongs next to the button, not in a toast that
          appears once and leaves. */}
      <p className="text-muted-foreground text-xs">
        Pembayaran belum tersedia — menekan tombol di atas baru mencatat
        pilihanmu, paketmu belum berubah.
      </p>
    </section>
  );
}
