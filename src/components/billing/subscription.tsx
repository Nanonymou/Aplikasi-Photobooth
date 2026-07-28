"use client";

import { useState } from "react";
import { Check, CreditCard, Info, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  CURRENT_PLAN,
  CURRENT_USAGE,
  formatRupiah,
  planRank,
  PLANS,
  priceFor,
  startCheckout,
  type BillingCycle,
  type Plan,
} from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

function CurrentPlanCard({ cycle }: { cycle: BillingCycle }) {
  const plan = PLANS.find((p) => p.id === CURRENT_PLAN)!;
  const price = priceFor(plan, cycle);
  const { designsUsed, designsLimit } = CURRENT_USAGE;
  const pct = Math.min(100, (designsUsed / designsLimit) * 100);

  return (
    <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">Paket kamu</span>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{plan.name}</span>
          <span className="text-muted-foreground text-sm">
            {price === 0 ? "tanpa tagihan" : `${formatRupiah(price)}/bln`}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-56">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Desain terpakai</span>
          <span className="tabular-nums">
            {designsUsed} / {designsLimit}
          </span>
        </div>
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  cycle,
  onUpgrade,
}: {
  plan: Plan;
  cycle: BillingCycle;
  onUpgrade: (plan: Plan) => void;
}) {
  const isCurrent = plan.id === CURRENT_PLAN;
  const isUpgrade = planRank(plan.id) > planRank(CURRENT_PLAN);
  const price = priceFor(plan, cycle);

  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-4 rounded-xl border p-5",
        plan.highlighted ? "border-primary" : "border-border",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{plan.name}</h3>
          {plan.highlighted && (
            <span className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
              <Sparkles className="size-3" />
              Populer
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-xs">{plan.tagline}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">
          {formatRupiah(price)}
        </span>
        {price > 0 && (
          <span className="text-muted-foreground text-sm">/bln</span>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="text-primary mt-0.5 size-4 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <Button variant="outline" disabled className="w-full">
          Paket saat ini
        </Button>
      ) : isUpgrade ? (
        <Button
          variant={plan.highlighted ? "default" : "outline"}
          className="w-full"
          onClick={() => onUpgrade(plan)}
        >
          Tingkatkan ke {plan.name}
        </Button>
      ) : (
        <Button variant="outline" disabled className="w-full">
          Turunkan
        </Button>
      )}
    </div>
  );
}

/**
 * The subscription page's body.
 *
 * Where a regular user reads their plan and moves between tiers: a status card
 * for where they are, a billing-cycle switch that reprices every card at once,
 * and the tiers themselves with the current one marked. Upgrading opens a summary
 * and a mock checkout — labelled a preview, since payments are not live — so the
 * whole flow is exercised without taking anyone's money.
 */
export function Subscription() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [upgrade, setUpgrade] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function checkout() {
    if (!upgrade || busy) return;
    setBusy(true);
    await startCheckout(upgrade.id, cycle);
    setBusy(false);
    setDone(upgrade.name);
  }

  function closeUpgrade() {
    setUpgrade(null);
    setDone(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <CurrentPlanCard cycle={cycle} />

      <div className="flex items-center justify-center">
        <ToggleGroup
          type="single"
          variant="outline"
          value={cycle}
          onValueChange={(value) => value && setCycle(value as BillingCycle)}
        >
          <ToggleGroupItem value="monthly">Bulanan</ToggleGroupItem>
          <ToggleGroupItem value="yearly">
            Tahunan
            <span className="text-primary ml-1.5 text-[10px] font-semibold">
              hemat 20%
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            onUpgrade={setUpgrade}
          />
        ))}
      </div>

      <Dialog open={upgrade !== null} onOpenChange={(open) => !open && closeUpgrade()}>
        <DialogContent className="max-w-sm">
          {done ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="text-primary size-5" />
                  Selamat menikmati {done}
                </DialogTitle>
                <DialogDescription>
                  Paketmu siap diaktifkan begitu pembayaran hidup.
                </DialogDescription>
              </DialogHeader>
              <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
                <Info className="mt-0.5 size-3 shrink-0" />
                Ini pratinjau alur langganan — pembayaran belum aktif, jadi belum
                ada biaya yang ditarik.
              </p>
              <DialogFooter>
                <Button size="sm" onClick={closeUpgrade}>
                  Selesai
                </Button>
              </DialogFooter>
            </>
          ) : upgrade ? (
            <>
              <DialogHeader>
                <DialogTitle>Tingkatkan ke {upgrade.name}</DialogTitle>
                <DialogDescription>
                  {formatRupiah(priceFor(upgrade, cycle))}/bln, ditagih{" "}
                  {cycle === "yearly" ? "tahunan" : "bulanan"}.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={closeUpgrade}>
                  Batal
                </Button>
                <Button size="sm" onClick={checkout} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  Lanjut ke pembayaran
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
