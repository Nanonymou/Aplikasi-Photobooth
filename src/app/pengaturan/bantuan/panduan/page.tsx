import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { SectionHeading } from "@/components/settings/section-heading";
import { Button } from "@/components/ui/button";
import { QUICK_GUIDES } from "@/lib/help/guides";

export const metadata: Metadata = {
  title: "Panduan cepat — FrameStudio AI",
};

/**
 * The quick-start guide.
 *
 * Four walkthroughs in the order a first ten minutes actually goes: take a
 * photo, arrange it, dress it up, get it out. Sits under Bantuan rather than
 * beside it, because somebody looking for "how do I start" is already in the
 * place where questions get answered.
 *
 * Steps are numbered and short. A guide long enough to need its own contents
 * page has stopped being a guide, and the articles next door are where the long
 * answers live.
 */
export default function QuickGuidePage() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link href="/pengaturan/bantuan">
            <ArrowLeft />
            Bantuan
          </Link>
        </Button>

        <SectionHeading
          title="Panduan cepat"
          description="Empat hal yang kamu lakukan di sepuluh menit pertama, berurutan."
        />
      </div>

      <div className="flex flex-col gap-4">
        {QUICK_GUIDES.map((guide, index) => {
          const Icon = guide.icon;

          return (
            <section
              key={guide.slug}
              className="bg-card border-border overflow-hidden rounded-xl border"
            >
              <div className="border-border flex items-start gap-3 border-b px-4 py-3">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">
                    <span className="text-muted-foreground tabular-nums">
                      {index + 1}.
                    </span>{" "}
                    {guide.title}
                  </h2>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {guide.summary}
                  </p>
                </div>

                {guide.href && (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href={guide.href}>
                      <span className="hidden sm:inline">{guide.hrefLabel}</span>
                      <span className="sm:hidden">Buka</span>
                      <ArrowUpRight />
                    </Link>
                  </Button>
                )}
              </div>

              <ol className="divide-border divide-y">
                {guide.steps.map((step, position) => (
                  <li key={step.title} className="flex gap-3 px-4 py-3">
                    <span className="text-muted-foreground border-border mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums">
                      {position + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-muted-foreground text-sm text-pretty">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs">
        Pertanyaan yang lebih spesifik ada di{" "}
        <Link href="/pengaturan/bantuan" className="text-foreground underline">
          daftar artikel
        </Link>
        .
      </p>
    </>
  );
}
