import { AlertTriangle, BellRing, ShieldCheck } from "lucide-react";
import type { StatusDesa } from "@/lib/analitik";

export function AlertBanner({ status }: { status: StatusDesa[] }) {
  const klb = status.filter((s) => s.level === "KLB");
  const waspada = status.filter((s) => s.level === "Waspada");

  if (!klb.length && !waspada.length) {
    return (
      <div className="panel flex items-center gap-2.5 p-3">
        <ShieldCheck className="size-4 shrink-0 text-success-text" aria-hidden />
        <p className="text-xs text-muted-foreground">
          Tidak ada desa yang melewati ambang. Semua wilayah dalam fluktuasi normal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {klb.map((s) => (
        <div
          key={s.kode}
          className="panel border-destructive/50 bg-destructive/10 p-3"
          role="alert"
        >
          <div className="flex flex-wrap items-start gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive/20 text-destructive">
              <BellRing className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-[13rem] flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-destructive">
                Alert otomatis · dugaan KLB
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                Desa {s.desa}, Kec. {s.kecamatan}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.alasan}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Penerima notifikasi: Kepala Dinas · Tim Surveilans/Epidemiologi · Kepala{" "}
                {s.puskesmas} · Koordinator Kader {s.desa}
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-1.5 text-center">
              <Metrik label="Kasus 7 hari" nilai={String(s.mingguIni)} />
              <Metrik label="Baseline" nilai={s.rataBaseline.toFixed(1)} />
              <Metrik label="Insidensi/100k" nilai={s.insidensi.toFixed(1)} />
            </div>
          </div>
        </div>
      ))}

      {waspada.length > 0 && (
        <div className="panel border-warning/40 bg-warning/10 p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
            <p className="text-xs">
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
    <div className="rounded-md border border-border/70 bg-background/40 px-2 py-1.5">
      <p className="text-sm font-bold leading-none tabular-nums">{nilai}</p>
      <p className="mt-1 text-[9px] uppercase leading-tight tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
