import { Link } from "@tanstack/react-router";
import { Activity, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MENU = [
  { to: "/", label: "Dashboard" },
  { to: "/peta", label: "Peta & Alert" },
  { to: "/lapor", label: "Lapor Warga" },
  { to: "/puskesmas", label: "Input Puskesmas" },
  { to: "/verifikasi", label: "Verifikasi" },
  { to: "/analisis", label: "Analisis AI" },
  { to: "/kasus", label: "Data Kasus" },
  { to: "/tentang", label: "Konsep" },
] as const;

export function Navbar() {
  const [buka, setBuka] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Activity className="size-5" />
            <span className="pulse-dot absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-bold tracking-tight">SIDINI</span>
            <span className="block text-[11px] text-muted-foreground">
              Sistem Deteksi Dini Wabah
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {MENU.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              activeOptions={{ exact: m.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-primary/15 data-[status=active]:text-primary"
            >
              {m.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setBuka((v) => !v)}
          aria-label="Buka menu"
          className="ml-auto rounded-lg border border-border p-2 text-muted-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <div className={cn("border-t border-border/70 lg:hidden", buka ? "block" : "hidden")}>
        <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-4 py-3">
          {MENU.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              onClick={() => setBuka(false)}
              activeOptions={{ exact: m.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary data-[status=active]:bg-primary/15 data-[status=active]:text-primary"
            >
              {m.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
