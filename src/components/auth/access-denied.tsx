import type { ReactNode } from "react";
import { ShieldX } from "lucide-react";

import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

/**
 * The access-denied message, on its own.
 *
 * The reusable block that says "not you" — an icon, a heading, a reason, and an
 * optional way on — with no layout opinion of its own, so it drops into a full
 * page (the `Forbidden` host), a card, or a panel wherever a slice of UI is off
 * limits. Pass `allow` (and the visitor's `role`) to have it name the roles an
 * area admits, or `message` to say something specific; with neither it falls back
 * to a general line. No hooks, so a server component can render it directly.
 */
export function AccessDenied({
  title = "Akses ditolak",
  message,
  allow,
  role,
  action,
  className,
}: {
  title?: string;
  message?: ReactNode;
  allow?: readonly Role[];
  role?: Role;
  action?: ReactNode;
  className?: string;
}) {
  const allowedLabels = allow?.map((r) => ROLE_LABELS[r]).join(", ");

  const body =
    message ??
    (allowedLabels ? (
      <>
        Area ini hanya untuk peran {allowedLabels}.
        {role && <> Akunmu masuk sebagai {ROLE_LABELS[role]}.</>}
      </>
    ) : (
      "Kamu tidak punya akses ke area ini."
    ));

  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <span className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <ShieldX className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm text-pretty">{body}</p>
      </div>
      {action}
    </div>
  );
}
