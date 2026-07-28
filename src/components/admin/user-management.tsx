"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  MoreHorizontal,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ADMIN_USERS,
  ROLE_LABELS,
  STATUS_LABELS,
  type RoleId,
  type UserStatus,
} from "@/lib/admin/users";
import { initials } from "@/lib/auth/initials";
import { cn } from "@/lib/utils";

const ROLE_BADGE: Record<RoleId, string> = {
  admin: "bg-primary/10 text-primary",
  editor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  operator: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  tamu: "bg-muted text-muted-foreground",
};

const STATUS_BADGE: Record<UserStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  invited: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  suspended: "bg-destructive/10 text-destructive",
};

/** "all" plus each role, in the order the filter shows them. */
const ROLE_FILTERS: (RoleId | "all")[] = [
  "all",
  "admin",
  "editor",
  "operator",
  "tamu",
];

function Badge({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The user directory, searchable and filterable.
 *
 * The admin's working list: find a person by name or email, or narrow to a role,
 * then act on the row. Search and the role filter combine and run on the client
 * over the mock list, so the interaction is real ahead of the API. Per-row
 * actions — changing a role, suspending — are their own RBAC tasks, so they show
 * as disabled entries rather than dead buttons.
 */
type SortKey = "name" | "joined";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sortBy,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortBy: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === sortBy;
  const Icon = !active
    ? ChevronsUpDown
    : sortDir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortBy)}
      aria-label={`Urutkan berdasarkan ${label}`}
      className={cn(
        "flex items-center gap-1 font-medium",
        active ? "text-foreground" : "hover:text-foreground",
      )}
    >
      {label}
      <Icon className="size-3.5" />
    </button>
  );
}

export function UserManagement() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleId | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Names read best A→Z; dates newest-first.
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ADMIN_USERS.filter((user) => {
      if (role !== "all" && user.role !== role) return false;
      if (!q) return true;
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    });

    const sorted = [...list].sort((a, b) => {
      const cmp =
        sortKey === "name"
          ? a.name.localeCompare(b.name, "id")
          : a.joinedAt.localeCompare(b.joinedAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [query, role, sortKey, sortDir]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau email…"
            aria-label="Cari pengguna"
            className="pl-8"
          />
        </div>

        <div className="min-w-0 overflow-x-auto">
          <ToggleGroup
            type="single"
            variant="outline"
            value={role}
            onValueChange={(value) =>
              setRole((value as RoleId | "all") || "all")
            }
          >
            {ROLE_FILTERS.map((id) => (
              <ToggleGroupItem key={id} value={id} className="whitespace-nowrap">
                {id === "all" ? "Semua" : ROLE_LABELS[id]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="bg-card border-border min-w-0 overflow-hidden rounded-xl border">
        {/* `relative` so an absolutely-positioned sr-only cell is contained here
            and scrolls with the table instead of escaping the page width. */}
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-left text-xs">
                <th className="px-4 py-2.5 font-medium">
                  <SortHeader
                    label="Pengguna"
                    sortBy="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-2.5 font-medium">Peran</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  <SortHeader
                    label="Bergabung"
                    sortBy="joined"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Tindakan</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                        aria-hidden="true"
                      >
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={ROLE_BADGE[user.role]}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_BADGE[user.status]}>
                      {STATUS_LABELS[user.status]}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 whitespace-nowrap sm:table-cell">
                    {user.joined}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Tindakan untuk ${user.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem disabled>Lihat detail</DropdownMenuItem>
                        <DropdownMenuItem disabled>Ubah peran</DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          {user.status === "suspended"
                            ? "Aktifkan"
                            : "Tangguhkan"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground px-4 py-10 text-center text-sm"
                  >
                    Tidak ada pengguna yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Menampilkan {filtered.length} dari {ADMIN_USERS.length} pengguna.
      </p>
    </div>
  );
}
