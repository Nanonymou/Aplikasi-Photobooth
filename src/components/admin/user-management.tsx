"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  LifeBuoy,
  MoreHorizontal,
  Search,
  UserCog,
} from "lucide-react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  changeRole,
  listUsers,
  tanggal,
  ROLE_LABELS,
  type AdminUser,
  type RoleId,
} from "@/lib/admin/users";
import { initials } from "@/lib/auth/initials";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

const ROLE_BADGE: Record<RoleId, string> = {
  admin: "bg-primary/10 text-primary",
  editor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  operator: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  tamu: "bg-muted text-muted-foreground",
};

/** "all" plus each role, in the order the filter shows them. */
const ROLE_FILTERS: (RoleId | "all")[] = [
  "all",
  "admin",
  "editor",
  "operator",
  "tamu",
];

/** Every assignable role, for the change-role picker. */
const ROLE_IDS = Object.keys(ROLE_LABELS) as RoleId[];

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

/** How long to sit on a keystroke before asking the server again. */
const SEARCH_DEBOUNCE_MS = 250;

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleId | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Change-role dialog: which user, and the role being picked.
  const [editingRole, setEditingRole] = useState<AdminUser | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleId>("editor");
  // Sign-in help dialog: which user, and whether the link was sent.
  const [helping, setHelping] = useState<AdminUser | null>(null);
  const [helpSent, setHelpSent] = useState(false);

  const load = useCallback(
    async (alive: () => boolean = () => true) => {
      try {
        const page = await listUsers({ search, role, sort: sortKey, dir: sortDir });
        if (!alive()) return;
        setUsers(page.users);
        setTotal(page.total);
        setFailed(null);
      } catch (cause) {
        if (!alive()) return;
        setFailed(
          cause instanceof Error ? cause.message : "Daftar pengguna gagal dimuat.",
        );
      } finally {
        if (alive()) setLoading(false);
      }
    },
    [search, role, sortKey, sortDir],
  );

  useEffect(() => {
    let current = true;
    void (async () => {
      await load(() => current);
    })();
    return () => {
      current = false;
    };
  }, [load]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  function openRoleEdit(user: AdminUser) {
    setEditingRole(user);
    setRoleDraft(user.role);
  }

  async function applyRole() {
    const target = editingRole;
    setEditingRole(null);
    if (!target || target.role === roleDraft) return;

    try {
      await changeRole(target.id, roleDraft);
      await load();
    } catch (cause) {
      // The server refuses to remove the last admin, and that refusal is the
      // whole message: it knows something this screen cannot.
      toast({
        variant: "error",
        title: "Peran gagal diubah",
        description: cause instanceof Error ? cause.message : undefined,
      });
    }
  }

  function openHelp(user: AdminUser) {
    setHelping(user);
    setHelpSent(false);
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Names read best A→Z; dates newest-first.
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const filtered = users;

  if (failed) {
    return (
      <div className="border-destructive/40 text-destructive rounded-xl border border-dashed px-4 py-16 text-center text-sm">
        {failed}
      </div>
    );
  }

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
                <th className="px-4 py-2.5 font-medium">Terakhir masuk</th>
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
                  <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {user.lastSignInAt ? tanggal(user.lastSignInAt) : "—"}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 whitespace-nowrap sm:table-cell">
                    {tanggal(user.joinedAt)}
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
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => openRoleEdit(user)}>
                          <UserCog />
                          Ubah peran
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openHelp(user)}>
                          <LifeBuoy />
                          Bantuan masuk
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
                    {loading ? "Memuat pengguna…" : "Tidak ada pengguna yang cocok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Menampilkan {filtered.length} dari {total} pengguna.
      </p>

      {/* Change role */}
      <Dialog
        open={editingRole !== null}
        onOpenChange={(open) => !open && setEditingRole(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah peran</DialogTitle>
            <DialogDescription>
              Atur peran untuk{" "}
              <span className="text-foreground font-medium">
                {editingRole?.name}
              </span>
              . Peran menentukan apa yang bisa mereka akses.
            </DialogDescription>
          </DialogHeader>

          <ToggleGroup
            type="single"
            variant="outline"
            value={roleDraft}
            onValueChange={(value) => value && setRoleDraft(value as RoleId)}
            className="flex-wrap justify-start"
          >
            {ROLE_IDS.map((id) => (
              <ToggleGroupItem key={id} value={id}>
                {ROLE_LABELS[id]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingRole(null)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={applyRole}
              disabled={roleDraft === editingRole?.role}
            >
              Simpan peran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign-in help */}
      <Dialog
        open={helping !== null}
        onOpenChange={(open) => !open && setHelping(null)}
      >
        <DialogContent className="max-w-sm">
          {helpSent ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary size-5" />
                  Bantuan terkirim
                </DialogTitle>
                <DialogDescription>
                  Tautan bantuan masuk dikirim ke{" "}
                  <span className="text-foreground font-medium">
                    {helping?.email}
                  </span>
                  . Ini pratinjau — belum ada email sungguhan yang dikirim.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button size="sm" onClick={() => setHelping(null)}>
                  Selesai
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Bantuan masuk</DialogTitle>
                <DialogDescription>
                  Kirim tautan agar{" "}
                  <span className="text-foreground font-medium">
                    {helping?.name}
                  </span>{" "}
                  bisa masuk atau mengatur ulang kata sandinya.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setHelping(null)}>
                  Batal
                </Button>
                <Button size="sm" onClick={() => setHelpSent(true)}>
                  <LifeBuoy />
                  Kirim tautan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
