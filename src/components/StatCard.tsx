import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  nilai,
  satuan,
  keterangan,
  icon: Icon,
  nada = "netral",
}: {
  label: string;
  nilai: string | number;
  satuan?: string;
  keterangan?: string;
  icon: LucideIcon;
  nada?: "netral" | "baik" | "waspada" | "bahaya";
}) {
  // Varian -text untuk teks ikon status, warna penuh untuk ikon. Amber
  // terang hanya aman sebagai isian, bukan sebagai teks (2,0:1 di putih).
  const warna =
    nada === "baik"
      ? "bg-success/15 text-success-text"
      : nada === "waspada"
        ? "bg-warning/15 text-warning-text"
        : nada === "bahaya"
          ? "bg-destructive/15 text-destructive"
          : "bg-primary/15 text-primary-text";

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${warna}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold leading-none">
        {nilai}
        {satuan && <span className="ml-1 text-sm font-medium text-muted-foreground">{satuan}</span>}
      </p>
      {keterangan && <p className="mt-2 text-xs text-muted-foreground">{keterangan}</p>}
    </div>
  );
}
