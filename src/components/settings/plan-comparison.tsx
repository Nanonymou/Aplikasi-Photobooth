import { Check, Minus } from "lucide-react";

import {
  CURRENT_PLAN,
  formatRupiah,
  PLAN_COMPARISON,
  PLANS,
  priceFor,
} from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm">{value}</span>;
  }

  return value ? (
    <>
      <Check className="text-primary mx-auto size-4" aria-hidden="true" />
      <span className="sr-only">Termasuk</span>
    </>
  ) : (
    <>
      <Minus className="text-muted-foreground/60 mx-auto size-4" aria-hidden="true" />
      <span className="sr-only">Tidak termasuk</span>
    </>
  );
}

/**
 * What each plan actually buys, side by side.
 *
 * A table, because that is what a comparison is: the reason three feature lists
 * are hard to compare is that the eye has to hold row three of one against row
 * five of another, and a grid does that holding for you.
 *
 * Scrolls sideways inside its own box rather than making the page do it. Three
 * columns of prose do not fit a phone, and a table that pushes the whole layout
 * wider takes the rest of the screen with it.
 *
 * The current plan's column is marked so somebody reading down it knows which
 * one is theirs without going back to the card above.
 */
export function PlanComparison() {
  return (
    <section className="bg-card border-border overflow-hidden rounded-xl border">
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Perbandingan paket</h2>
        <p className="text-muted-foreground text-xs">
          Yang kamu dapat di tiap paket, berdampingan.
        </p>
      </div>

      {/* `relative` is load-bearing: the tick/dash cells carry visually hidden
          labels, and `sr-only` positions them absolutely. Without a positioned
          ancestor they resolve against the viewport, so a cell scrolled off to
          the right pushes the *page* sideways — the table scrolls correctly and
          the document scrolls with it. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">
            Perbandingan fitur antara paket Gratis, Pro, dan Studio
          </caption>

          <thead>
            <tr className="border-border border-b">
              <th scope="col" className="text-muted-foreground px-4 py-2.5 text-xs font-medium">
                Fitur
              </th>
              {PLANS.map((plan) => {
                const current = plan.id === CURRENT_PLAN;
                const price = priceFor(plan, "monthly");

                return (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      "px-4 py-2.5 text-center align-bottom",
                      current && "bg-primary/5",
                    )}
                  >
                    <span className="block text-sm font-semibold">{plan.name}</span>
                    <span className="text-muted-foreground block text-xs font-normal tabular-nums">
                      {price === 0 ? "Gratis" : `${formatRupiah(price)}/bln`}
                    </span>
                    {current && (
                      <span className="text-primary block text-[10px] font-medium tracking-wide uppercase">
                        Paket kamu
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-border divide-y">
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-4 py-2.5 text-sm font-normal">
                  {row.label}
                </th>
                {PLANS.map((plan) => (
                  <td
                    key={plan.id}
                    className={cn(
                      "px-4 py-2.5 text-center",
                      plan.id === CURRENT_PLAN && "bg-primary/5",
                    )}
                  >
                    <Cell value={row.cells[plan.id]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
