import { AlertTriangle, BellRing, ShieldCheck } from "lucide-react";
import { formatInsidensi, type StatusDesa, type StatusPenyakitDesa } from "@/lib/analitik";

/**
 * Alert lapis harian.
 *
 * Alert menyebut SATU penyakit pemicu, bukan gabungan semua penyakit:
 * "Dugaan KLB DBD di Desa X: 82 kasus dalam 7 hari (4,7x baseline)". Kata
 * "KLB" selalu didahului "Dugaan" karena status resmi KLB baru keluar dari
 * penilaian SKDR mingguan (lihat src/lib/skdr.ts).
 *
 * Angka yang ditampilkan (jumlah kasus, baseline, rasio, insidensi) semuanya
 * milik penyakit pemicu, bukan total gabungan desa.
 */
export function AlertBanner({ status }: { status: StatusDesa[] }) {
  const sinyal = status.filter((s) => s.level === "Sinyal");
  const waspada = status.filter((s) => s.level === "Waspada");

  if (!sinyal.length && !waspada.length) {
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
      {sinyal.map((s) => {
        const pemicu = pemicuTertinggi(s);
        return (
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
                  Sinyal · dugaan KLB
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  Dugaan KLB {pemicu.penyakit} di Desa {s.desa}, Kec. {s.kecamatan}:{" "}
                  {pemicu.mingguIni} kasus dalam 7 hari ({pemicu.rasio.toFixed(1)}x baseline)
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{pemicu.alasan}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Penerima notifikasi: Kepala Dinas · Tim Surveilans/Epidemiologi · Kepala{" "}
                  {s.puskesmas} · Koordinator Kader {s.desa}
                </p>
              </div>
              <div className="grid shrink-0 grid-cols-4 gap-1.5 text-center">
                <Metrik label={`${pemicu.penyakit} 7 hari`} nilai={String(pemicu.mingguIni)} />
                <Metrik label="Baseline" nilai={pemicu.rataBaseline.toFixed(1)} />
                <Metrik label="Rasio" nilai={`${pemicu.rasio.toFixed(1)}x`} />
                <Metrik label="Insidensi/100k" nilai={formatInsidensi(pemicu.insidensi)} />
              </div>
            </div>
          </div>
        );
      })}

      {waspada.length > 0 && (
        <div className="panel border-warning/40 bg-warning/10 p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
            <p className="text-xs">
              <span className="font-semibold text-warning-text">Status waspada:</span>{" "}
              {waspada
                .map((w) => {
                  const p = pemicuTertinggi(w);
                  return `${p.penyakit} di ${w.desa} (${p.mingguIni} kasus, ${p.rasio}x baseline)`;
                })
                .join(" · ")}
              . Pantau 48 jam ke depan sebelum mobilisasi penuh.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Status penyakit dengan level tertinggi untuk desa tersebut. */
function pemicuTertinggi(s: StatusDesa): StatusPenyakitDesa {
  const urut = { Aman: 0, Waspada: 1, Sinyal: 2 } as const;
  return s.perPenyakit.reduce((best, p) => (urut[p.level] > urut[best.level] ? p : best));
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
