import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layers, MapPin, TrendingUp } from "lucide-react";

import { AlatTabel } from "@/components/AlatTabel";
import { LevelBadge } from "@/components/LevelBadge";
import { PetaSKDR, type ModePeta } from "@/components/PetaSKDR";
import {
  FilterSKDRBar,
  keFilterSKDR,
  namaMinggu,
  type FilterState,
} from "@/components/FilterSKDRBar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KABUPATEN, KECAMATAN, TOTAL_PENDUDUK } from "@/data/wilayah";
import { AMBANG, ringkasan, statusKecamatan, type StatusKecamatan } from "@/lib/skdr";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/peta")({
  head: () => ({
    meta: [
      { title: "Peta SKDR & Ambang KLB | SIDINI" },
      {
        name: "description",
        content:
          "Choropleth Kabupaten Bandung per kecamatan dengan ambang KLB per penyakit, diperbarui dari data SKDR mingguan.",
      },
      { property: "og:title", content: "Peta SKDR & Ambang KLB | SIDINI" },
      {
        property: "og:description",
        content: "Sebaran kasus per kecamatan dengan ambang KLB per penyakit yang bisa diaudit.",
      },
    ],
  }),
  component: Peta,
});

const nf = new Intl.NumberFormat("id-ID");

const AWAL: FilterState = {
  tahun: 2026,
  mingguDari: 5,
  mingguSampai: 9,
  penyakit: "DBD",
  jenis: "penderita",
  kodeKecamatan: null,
};

function Peta() {
  const [f, setF] = useState<FilterState>(AWAL);
  const [mode, setMode] = useState<ModePeta>("insidensi");
  // Fokus peta terpisah dari filter wilayah supaya memilih kecamatan di peta
  // tidak langsung membatalkan perbandingan antar-kecamatan di tabel.
  const [kodeFokus, setKodeFokus] = useState<string | null>(null);

  const filter = useMemo(() => ({ ...keFilterSKDR(f), kodeKecamatan: null }), [f]);

  const semuaStatus = useMemo(() => statusKecamatan(filter, f.jenis), [filter, f.jenis]);
  const status = useMemo(
    () => (f.kodeKecamatan ? semuaStatus.filter((s) => s.kode === f.kodeKecamatan) : semuaStatus),
    [semuaStatus, f.kodeKecamatan],
  );

  const r = useMemo(() => ringkasan(filter, f.jenis), [filter, f.jenis]);
  const ambang = AMBANG[f.penyakit];
  const fokus = KECAMATAN.find((k) => k.kode === kodeFokus) ?? null;
  const statusFokus = fokus ? semuaStatus.find((s) => s.kode === fokus.kode) : null;

  const urut = useMemo(() => [...semuaStatus].sort((a, b) => b.jumlah - a.jumlah), [semuaStatus]);
  const klb = semuaStatus.filter((s) => s.level === "KLB");
  const waspada = semuaStatus.filter((s) => s.level === "Waspada");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Peta sebaran & ambang KLB</h1>
        <p className="mt-2 max-w-3xl text-justify text-sm text-muted-foreground">
          Peta choropleth {KABUPATEN} dengan batas kecamatan asli (GADM 4.1). Warna menunjukkan
          seberapa dekat sebuah kecamatan dengan ambang KLB penyakit yang dipilih (DBD, Diare,
          Chikungunya, atau Hepatitis A). Intensitas warna menggambarkan kedekatan kecamatan dengan
          ambang KLB, warna yang lebih tua menandakan risiko yang lebih tinggi. Klik satu kecamatan
          untuk memperbesar dan melihat titik kasus simulasi.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <FilterSKDRBar nilai={f} onUbah={setF} />

        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kartu
              label={f.jenis === "meninggal" ? "Total kematian" : `Total kasus ${f.penyakit}`}
              nilai={nf.format(f.jenis === "meninggal" ? r.meninggal : r.total)}
              keterangan={
                f.kodeKecamatan
                  ? (fokus?.nama ?? "Kecamatan terpilih")
                  : `${KECAMATAN.length} kecamatan, ${nf.format(TOTAL_PENDUDUK)} jiwa`
              }
            />
            <Kartu
              label="Insidensi"
              nilai={r.insidensi.toFixed(1)}
              satuan="/100k/mgg"
              keterangan={`Ambang KLB ${ambang.insidensiMin}. ${klb.length} kecamatan KLB, ${waspada.length} waspada.`}
              nada={klb.length > 0 ? "bahaya" : waspada.length > 0 ? "waspada" : "baik"}
            />
            <Kartu
              label="Minggu berstatus KLB"
              nilai={nf.format(r.mingguKLB)}
              keterangan={
                r.mingguKLB > 0
                  ? "Minggu dengan setidaknya satu kecamatan berstatus KLB."
                  : "Tidak ada minggu yang menyentuh ambang KLB pada periode ini."
              }
              nada={r.mingguKLB > 0 ? "bahaya" : "baik"}
            />
            <Kartu
              label="Kecamatan tertinggi"
              nilai={r.tertinggi?.nama ?? "-"}
              keterangan={
                r.tertinggi
                  ? `${nf.format(r.tertinggi.jumlah)} kasus, insidensi ${r.tertinggi.insidensi.toFixed(1)}/100k/mgg`
                  : "Tidak ada kasus pada periode ini."
              }
            />
          </section>

          {r.tertinggi ? (
            <div className="panel flex flex-wrap items-center gap-3 border-l-4 border-l-destructive p-4">
              <TrendingUp className="size-5 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm">
                <span className="font-semibold">Wilayah tertinggi: {r.tertinggi.nama}</span> dengan{" "}
                {nf.format(r.tertinggi.jumlah)} kasus {f.penyakit} pada minggu {f.mingguDari}&ndash;
                {f.mingguSampai} {f.tahun}, setara{" "}
                <strong>{r.tertinggi.insidensi.toFixed(1)}</strong> per 100.000 penduduk per minggu
                dari penduduk kecamatan {nf.format(r.tertinggi.penduduk)} jiwa.
              </p>
              <button
                type="button"
                className="ml-auto text-sm font-medium text-link underline underline-offset-4 hover:no-underline"
                onClick={() => setKodeFokus(r.tertinggi!.kode)}
              >
                Lihat di peta
              </button>
            </div>
          ) : null}

          <section className="panel p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Layers className="size-4 text-primary" aria-hidden />
                Peta {fokus ? fokus.nama : KABUPATEN}
              </h2>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => v && setMode(v as ModePeta)}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                <ToggleGroupItem value="insidensi">Insidensi</ToggleGroupItem>
                <ToggleGroupItem value="status">Status KLB</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <PetaSKDR
              status={semuaStatus}
              penyakit={f.penyakit}
              kodeFokus={kodeFokus}
              onFokus={setKodeFokus}
              mode={mode}
              jenis={f.jenis}
              kunciTitik={`${f.tahun}|${f.mingguDari}|${f.mingguSampai}|${f.penyakit}|${f.jenis}`}
            />
          </section>

          {statusFokus ? <RincianKecamatan s={statusFokus} f={f} /> : null}

          <section className="panel p-5">
            <AlatTabel
              baris={urut}
              nama={`status-kecamatan-${f.penyakit.toLowerCase()}-${f.tahun}-m${f.mingguDari}-${f.mingguSampai}`}
              rowKey={(s) => s.kode}
              nomor
              sticky
              kelasBaris={(s) => (kodeFokus === s.kode ? "bg-primary/5" : undefined)}
              judul={<h2 className="text-base font-semibold">Tabel per kecamatan</h2>}
              keterangan={
                <p className="text-xs text-muted-foreground">
                  {urut.length} baris &middot; diurutkan dari jumlah kasus tertinggi &middot; minggu{" "}
                  {f.mingguDari}&ndash;{f.mingguSampai} {f.tahun}
                </p>
              }
              kolom={[
                {
                  kunci: "nama",
                  judul: "Kecamatan",
                  nilai: (s) => s.nama,
                  render: (s) => (
                    <button
                      type="button"
                      className="font-medium underline-offset-4 hover:text-primary hover:underline"
                      onClick={() => setKodeFokus(s.kode)}
                    >
                      {s.nama}
                    </button>
                  ),
                },
                {
                  kunci: "jumlah",
                  judul: "Kasus",
                  angka: true,
                  nilai: (s) => nf.format(s.jumlah),
                },
                {
                  kunci: "meninggal",
                  judul: "Meninggal",
                  angka: true,
                  nilai: (s) => nf.format(s.meninggal),
                  render: (s) =>
                    s.meninggal > 0 ? (
                      <span className="font-semibold text-destructive">
                        {nf.format(s.meninggal)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    ),
                },
                {
                  kunci: "insidensi",
                  judul: "Insidensi/100k",
                  angka: true,
                  nilai: (s) => s.insidensi.toFixed(1),
                },
                {
                  kunci: "baseline",
                  judul: "Baseline",
                  angka: true,
                  nilai: (s) => s.baseline.toFixed(1),
                },
                {
                  kunci: "rasio",
                  judul: "Rasio",
                  angka: true,
                  nilai: (s) => (s.rasio > 0 ? `${s.rasio.toFixed(1)}x` : "-"),
                },
                {
                  kunci: "level",
                  judul: "Status",
                  nilai: (s) => s.level,
                  render: (s) => <LevelBadge level={s.level} />,
                },
              ]}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function Kartu({
  label,
  nilai,
  satuan,
  keterangan,
  nada = "netral",
}: {
  label: string;
  nilai: string;
  satuan?: string;
  keterangan?: string;
  nada?: "netral" | "baik" | "waspada" | "bahaya";
}) {
  const garis =
    nada === "bahaya"
      ? "border-l-destructive"
      : nada === "waspada"
        ? "border-l-warning"
        : nada === "baik"
          ? "border-l-success"
          : "border-l-primary";
  return (
    <div className={cn("panel border-l-4 p-4", garis)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold leading-none">
        {nilai}
        {satuan && <span className="ml-1 text-xs font-medium text-muted-foreground">{satuan}</span>}
      </p>
      {keterangan && <p className="mt-2 text-xs text-muted-foreground">{keterangan}</p>}
    </div>
  );
}

function RincianKecamatan({ s, f }: { s: StatusKecamatan; f: FilterState }) {
  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="size-4 text-primary" aria-hidden />
            {s.nama}
          </h2>
          <p className="text-xs text-muted-foreground">
            penduduk kecamatan {nf.format(s.penduduk)} jiwa &middot; {nf.format(s.luasKm2)} km&sup2;{" "}
            (perkiraan dari poligon) &middot; minggu {f.mingguDari}&ndash;{f.mingguSampai} {f.tahun}{" "}
            &middot; {namaMinggu(f.tahun, f.mingguDari)}
          </p>
        </div>
        <LevelBadge level={s.level} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Info label="Kasus" nilai={nf.format(s.jumlah)} />
        <Info label="Per minggu" nilai={s.perMinggu.toFixed(1)} />
        <Info label="Insidensi/100k" nilai={s.insidensi.toFixed(1)} />
        <Info label="Rasio baseline" nilai={s.rasio > 0 ? `${s.rasio.toFixed(1)}x` : "-"} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{s.alasan}</p>
    </section>
  );
}

function Info({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold leading-none">{nilai}</p>
    </div>
  );
}
