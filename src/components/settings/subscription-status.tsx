"use client";

import Link from "next/link";
import { useBilling } from "@/lib/billing/client";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  formatRupiah,
  planById,
  planRank,
  PLANS,
} from "@/lib/billing/plans";

/**
 * Where this account stands.
 *
 * The plan it is on, what that costs, and how much of the one thing the free
 * tier actually limits — saved designs — has been used. A usage bar only earns
 * its place where there is a ceiling to approach: on a plan with none it would
 * be a bar that never fills, which tells nobody anything, so it is replaced by
 * the sentence that is actually true.
 *
 * The upgrade path is a plain link, not a pitch. Comparing plans is the table
 * below, and choosing one is `/langganan`, which owns the billing-cycle switch
 * and the checkout flow.
 */
export function SubscriptionStatus() {
  const billing = useBilling();
  if (!billing) return null;

  const plan = planById(billing.subscription.plan);
  const designsUsed = billing.usage.designs;
  const designsLimit = billing.limits.designs;

  const limit = billing.limits.designs;
  // What this account is actually being charged, not the catalogue's number:
  // an old customer kept at an old price is the whole reason the two differ.
  const price = billing.subscription.priceIdr;
  const canUpgrade = planRank(plan.id) < PLANS.length - 1;

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Paket kamu</span>
          <p className="text-lg font-semibold tracking-tight">{plan.name}</p>
          <p className="text-muted-foreground text-sm">{plan.tagline}</p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums">
            {price === 0 ? "Gratis" : `${formatRupiah(price)}`}
          </p>
          <p className="text-muted-foreground text-xs">
            {price === 0 ? "Tanpa tagihan" : "per bulan, ditagih bulanan"}
          </p>
        </div>
      </div>

      {limit === null || designsLimit === null ? (
        <p className="text-muted-foreground text-sm">
          Kamu sudah menyimpan{" "}
          <span className="text-foreground font-medium tabular-nums">
            {designsUsed}
          </span>{" "}
          desain — paket ini tidak membatasinya.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Desain tersimpan</span>
            <span className="tabular-nums">
              <span className="font-medium">{designsUsed}</span>
              <span className="text-muted-foreground"> / {designsLimit}</span>
            </span>
          </div>
          <Progress value={designsUsed / designsLimit} />
          <p className="text-muted-foreground text-xs">
            {designsUsed >= designsLimit
              ? "Batas paketmu sudah penuh — hapus satu desain, atau naikkan paket."
              : `Sisa ${designsLimit - designsUsed} desain di paket ini.`}
          </p>
        </div>
      )}

      {canUpgrade && (
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href="/langganan">
            Lihat pilihan paket
            <ArrowUpRight />
          </Link>
        </Button>
      )}
    </section>
  );
}
