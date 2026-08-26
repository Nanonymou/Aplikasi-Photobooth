"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GitBranch, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  forgetRemix,
  rememberRemix,
  useRemixCredit,
  type RemixCredit as Credit,
} from "@/lib/showcase/remix";

/**
 * The strip that says whose work this session started from.
 *
 * Shown in the editor rather than only on the showcase, because that is where
 * somebody is actually making the thing — an attribution a remixer never sees
 * while they work is an attribution nobody is keeping.
 *
 * `arriving` is the design named by `?remix=` on this navigation; it is recorded
 * on mount so the credit survives a reload, and the stored one is what gets
 * rendered. A guest who is not remixing anything sees nothing at all.
 */
export function RemixCreditBanner({ arriving }: { arriving: Credit | null }) {
  const credit = useRemixCredit();

  useEffect(() => {
    if (arriving) rememberRemix(arriving);
  }, [arriving]);

  if (!credit) return null;

  return (
    <div className="bg-muted/50 border-border text-muted-foreground flex items-center gap-2 border-b px-4 py-1.5 text-xs">
      <GitBranch className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">
        Remix dari{" "}
        <span className="text-foreground font-medium">{credit.title}</span> oleh{" "}
        <span className="text-foreground font-medium">{credit.author}</span>.
        Kredit ini tersimpan bersama sesimu di perangkat ini.
      </span>

      <Link
        href="/jelajah"
        className="hover:text-foreground ml-auto shrink-0 underline-offset-4 hover:underline"
      >
        Lihat aslinya
      </Link>

      {/* Removable, because a remix can drift far enough from its source that
          the credit stops being true — and a credit nobody can take off is one
          people work around instead of using. */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={forgetRemix}
        aria-label="Hapus kredit remix"
        className="shrink-0"
      >
        <X />
      </Button>
    </div>
  );
}
