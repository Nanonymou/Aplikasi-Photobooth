import Link from "next/link";
import {
  ChartColumn,
  ChevronRight,
  LibraryBig,
  Palette,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** The console areas, as navigable cards from the dashboard. */
const LINKS: QuickLink[] = [
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    description: "Kelola akun dan peran aksesnya.",
    icon: Users,
  },
  {
    href: "/admin/konten",
    label: "Konten",
    description: "Template dan aset pustaka.",
    icon: LibraryBig,
  },
  {
    href: "/admin/analitik",
    label: "Analitik",
    description: "Tren sesi, desain, dan ekspor.",
    icon: ChartColumn,
  },
  {
    href: "/admin/branding",
    label: "Branding",
    description: "Wajah acara di kiosk & slideshow.",
    icon: Palette,
  },
  {
    href: "/admin/pengaturan",
    label: "Pengaturan",
    description: "Perilaku sistem seluruh booth.",
    icon: Settings,
  },
];

/**
 * Dashboard shortcuts into the console.
 *
 * The tab bar is always there, but the landing should also point plainly at each
 * area — so an admin arriving cold has a labelled way in, not just a row of tabs.
 * One card per section, each a full link with a line on what lives there.
 */
export function QuickLinks() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Kelola</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-card border-border hover:border-primary/50 focus-visible:ring-ring/50 group flex items-start gap-3 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-[3px]"
          >
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-muted-foreground text-xs">{description}</p>
            </div>
            <ChevronRight className="text-muted-foreground group-hover:text-foreground ml-auto size-4 shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}
