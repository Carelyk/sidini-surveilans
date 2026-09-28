import { AlertTriangle, BellRing, ShieldCheck } from "lucide-react";
import type { StatusDesa } from "@/lib/analitik";

export function AlertBanner({ status }: { status: StatusDesa[] }) {
  const klb = status.filter((s) => s.level === "KLB");
  const waspada = status.filter((s) => s.level === "Waspada");

  if (!klb.length && !waspada.length) {
    return (
      <div className="panel flex items-center gap-3 p-4">
        <ShieldCheck className="size-5 text-success-text" />
        <p className="text-sm text-muted-foreground">
          Tidak ada desa yang melewati ambang. Semua wilayah dalam fluktuasi normal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {klb.map((s) => (
        <div
          key={s.kode}
          className="panel border-destructive/50 bg-destructive/10 p-4 sm:p-5"
          role="alert"
        >
          <div className="flex flex-wrap items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
              <BellRing className="size-5" />
            </span>
            <div className="min-w-[14rem] flex-1">
              <p className="font-display text-sm font-bold uppercase tracking-wide text-destructive">
                Alert Otomatis — Dugaan KLB
              </p>
              <p className="mt-1 text-base font-semibold">
                Desa {s.desa}, Kec. {s.kecamatan}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{s.alasan}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Penerima notifikasi: Kepala Dinas · Tim Surveilans/Epidemiologi · Kepala{" "}
                {s.puskesmas} · Koordinator Kader {s.desa}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Metrik label="Kasus 7 hari" nilai={String(s.mingguIni)} />
              <Metrik label="Baseline" nilai={s.rataBaseline.toFixed(1)} />
              <Metrik label="Insidensi/100k" nilai={s.insidensi.toFixed(1)} />
            </div>
          </div>
        </div>
      ))}

      {waspada.length > 0 && (
        <div className="panel border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-text" />
            <p className="text-sm">
              <span className="font-semibold text-warning-text">Status waspada:</span>{" "}
              {waspada
                .map((w) => `${w.desa} (${w.mingguIni} kasus, ${w.rasio}x baseline)`)
                .join(" · ")}
              . Pantau 48 jam ke depan sebelum mobilisasi penuh.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Metrik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <p className="font-display text-lg font-bold leading-none">{nilai}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
