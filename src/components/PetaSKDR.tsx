import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";

import { KABUPATEN, KECAMATAN, type Kecamatan } from "@/data/wilayah";
import {
  AMBANG,
  type JenisKasus,
  type Level,
  type Penyakit,
  type StatusKecamatan,
} from "@/lib/skdr";
import { buatProyeksi, kePath, sebarTitik, titikDalam } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * Peta choropleth Kabupaten Bandung, digambar sendiri sebagai SVG.
 *
 * Dua tingkat, mengikuti alur filter Dinkes:
 *   1. wilayah  -> 31 kecamatan, diwarnai menurut insidensi
 *   2. kecamatan -> satu kecamatan diperbesar, ditambah titik kasus
 *
 * PEWARNAAN
 *   - Gradien: satu hue merah, makin pekat = makin banyak kasus. Sengaja
 *     tidak hijau: brand sistem ini hijau, jadi ramp hijau akan dibaca
 *     "makin pekat = makin aman" -- terbalik dari maksudnya.
 *   - Ambang warnanya diambil dari ambang KLB penyakit yang sedang
 *     difilter, jadi warna peta langsung bisa dibaca sebagai "seberapa dekat
 *     dengan ambang", bukan sekadar "mana yang lebih tinggi".
 *   - Status: hijau/amber/merah mengikuti level Aman/Waspada/KLB.
 */

const LEBAR = 900;
const TINGGI = 640;
const MAKS_TITIK = 400;

export type ModePeta = "insidensi" | "status";

export interface PropsPeta {
  status: StatusKecamatan[];
  penyakit: Penyakit;
  /** Kode kecamatan yang sedang difokuskan, null = tampilan kabupaten */
  kodeFokus: string | null;
  onFokus: (kode: string | null) => void;
  mode: ModePeta;
  jenis: JenisKasus;
  /** Kunci untuk membuat sebaran titik stabil antar render */
  kunciTitik: string;
}

const WARNA_RAMP = [
  "var(--color-peta-0)",
  "var(--color-peta-1)",
  "var(--color-peta-2)",
  "var(--color-peta-3)",
  "var(--color-peta-4)",
  "var(--color-peta-5)",
  "var(--color-peta-6)",
] as const;

const WARNA_STATUS: Record<Level, string> = {
  Aman: "oklch(0.88 0.09 150)",
  Waspada: "var(--color-warning)",
  KLB: "var(--color-destructive)",
};

/** Batas atas tiap kelas insidensi, diturunkan dari ambang KLB penyakit. */
function batasKelas(penyakit: Penyakit): number[] {
  const t = AMBANG[penyakit].insidensiMin;
  return [0, t * 0.2, t * 0.4, t * 0.6, t * 0.8, t, t * 2];
}

function kelasDari(nilai: number, batas: number[]): number {
  for (let i = batas.length - 1; i >= 0; i--) {
    if (nilai >= batas[i]!) return i;
  }
  return 0;
}

const nf = new Intl.NumberFormat("id-ID");

export function PetaSKDR({
  status,
  penyakit,
  kodeFokus,
  onFokus,
  mode,
  jenis,
  kunciTitik,
}: PropsPeta) {
  const fokus = useMemo(
    () => (kodeFokus ? (KECAMATAN.find((k) => k.kode === kodeFokus) ?? null) : null),
    [kodeFokus],
  );

  const proyeksi = useMemo(
    () => buatProyeksi(LEBAR, TINGGI, fokus ? 26 : 8),
    // Proyeksi ikut berubah bentuk dasar supaya kecamatan yang difokuskan
    // memenuhi kanvas, bukan cuma memperbesar koordinat di tempat yang sama.
    [fokus],
  );

  const petaStatus = useMemo(() => new Map(status.map((s) => [s.kode, s])), [status]);

  const batas = useMemo(() => batasKelas(penyakit), [penyakit]);
  /** Kematian tidak punya ambang insidensi, jadi skalanya 0..4 kematian. */
  const batasMeninggal = [0, 1, 2, 3, 5];

  const poligon = useMemo(() => {
    const daftar = fokus ? [fokus] : KECAMATAN;
    return daftar.map((k) => {
      const s = petaStatus.get(k.kode);
      const jumlah = s?.jumlah ?? 0;
      const meninggal = s?.meninggal ?? 0;
      // Peta "meninggal" diwarnakan dari jumlah kematian, karena tidak
      // ada ambang insidensi yang bermakna untuk kasus meninggal.
      const nilai = jenis === "meninggal" ? meninggal : (s?.insidensi ?? 0);
      const kelas = kelasDari(nilai, jenis === "meninggal" ? batasMeninggal : batas);
      const warna =
        mode === "status" ? WARNA_STATUS[s?.level ?? "Aman"] : WARNA_RAMP[nilai === 0 ? 0 : kelas];
      const t = titikDalam(k);
      const [tx, ty] = proyeksi.keLayar(t.lon, t.lat);
      return { k, d: kePath(k.ring, proyeksi), warna, jumlah, meninggal, nilai, status: s, tx, ty };
    });
  }, [fokus, mode, jenis, batas, batasMeninggal, petaStatus, proyeksi]);

  const titik = useMemo(() => {
    if (!fokus) return [];
    const s = petaStatus.get(fokus.kode);
    const total = jenis === "meninggal" ? (s?.meninggal ?? 0) : (s?.jumlah ?? 0);
    const n = Math.min(total, MAKS_TITIK);
    return sebarTitik(fokus, n, `${kunciTitik}|${fokus.kode}`).map((p) => {
      const [x, y] = proyeksi.keLayar(p.lon, p.lat);
      return { x, y };
    });
  }, [fokus, jenis, petaStatus, proyeksi, kunciTitik]);

  const totalTitikAsli = fokus
    ? jenis === "meninggal"
      ? (petaStatus.get(fokus.kode)?.meninggal ?? 0)
      : (petaStatus.get(fokus.kode)?.jumlah ?? 0)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {fokus ? (
          <button
            type="button"
            onClick={() => onFokus(null)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Semua kecamatan
          </button>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {fokus ? (
            <>
              Tingkat 2 dari 2: <span className="font-medium text-foreground">{fokus.nama}</span> —{" "}
              {fokus.desa.length} desa/kelurahan
            </>
          ) : (
            <>
              Tingkat 1 dari 2: seluruh {KECAMATAN.length} kecamatan di {KABUPATEN}. Klik satu warna
              untuk memperbesar.
            </>
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-secondary/40">
        <svg
          viewBox={`0 0 ${LEBAR} ${TINGGI}`}
          className="h-auto w-full"
          role="img"
          aria-label={
            fokus ? `Peta titik kasus ${fokus.nama}` : `Peta choropleth ${KABUPATEN} per kecamatan`
          }
        >
          <g>
            {poligon.map(({ k, d, warna, status: s, jumlah, meninggal, tx, ty }) => {
              const label =
                mode === "status"
                  ? `${k.nama}: ${s?.level ?? "Aman"}`
                  : `${k.nama}: ${nf.format(jumlah)} kasus, ${nf.format(meninggal)} kematian, insidensi ${(s?.insidensi ?? 0).toFixed(1)} per 100.000 per minggu`;
              return (
                <g key={k.kode}>
                  <path
                    d={d}
                    fill={warna}
                    stroke="var(--color-surface)"
                    strokeWidth={fokus ? 1.5 : 2}
                    className={cn(
                      "cursor-pointer transition-opacity outline-none",
                      "hover:opacity-80 focus-visible:opacity-80",
                      "focus-visible:[stroke:var(--color-primary)]",
                      "focus-visible:[stroke-width:3]",
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label={label}
                    onClick={() => (fokus ? null : onFokus(k.kode))}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      if (!fokus) onFokus(k.kode);
                    }}
                  >
                    <title>{label}</title>
                  </path>
                  {!fokus ? (
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      className="pointer-events-none select-none fill-foreground text-[11px] font-medium"
                      stroke="var(--color-surface)"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                    >
                      {k.nama}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>

          {titik.length > 0 ? (
            <g>
              {titik.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={2.6}
                  fill="var(--color-foreground)"
                  fillOpacity={0.55}
                />
              ))}
            </g>
          ) : null}
        </svg>
      </div>

      <Legenda
        mode={mode}
        batas={batas}
        penyakit={penyakit}
        jumlahTitik={titik.length}
        totalTitik={totalTitikAsli}
        fokus={fokus}
      />
    </div>
  );
}

function Legenda({
  mode,
  batas,
  penyakit,
  jumlahTitik,
  totalTitik,
  fokus,
}: {
  mode: ModePeta;
  batas: number[];
  penyakit: Penyakit;
  jumlahTitik: number;
  totalTitik: number;
  fokus: Kecamatan | null;
}) {
  if (mode === "status") {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Keterangan warna:</span>
        {(["Aman", "Waspada", "KLB"] as Level[]).map((lv) => (
          <span key={lv} className="inline-flex items-center gap-1.5">
            <span
              className="size-3.5 rounded-sm border border-border"
              style={{ background: WARNA_STATUS[lv] }}
            />
            {lv}
          </span>
        ))}
        <span>
          Amber = sudah naik 1,5x baseline. Merah = melewati ambang KLB {penyakit} (
          {AMBANG[penyakit].insidensiMin} per 100.000 per minggu).
        </span>
      </div>
    );
  }

  const atas = batas[batas.length - 1]!;
  const tengah = batas[batas.length - 2]!;
  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">Insidensi per 100.000/minggu:</span>
        <span>0</span>
        {batas.slice(1).map((b, i) => (
          <span key={b} className="inline-flex items-center gap-1.5">
            <span
              className="size-4 rounded-sm border border-border"
              style={{ background: WARNA_RAMP[i + 1] }}
            />
            <span className={b === tengah ? "font-medium text-foreground" : ""}>
              {b < 10 ? b.toFixed(1) : Math.round(b)}
            </span>
          </span>
        ))}
        <span>atau lebih</span>
      </div>
      <p>
        Warna diukur relatif terhadap ambang KLB {penyakit} ({AMBANG[penyakit].insidensiMin} per
        100.000 per minggu), jadi warna mudah dibaca sebagai "seberapa dekat dengan ambang", bukan
        sekadar "mana yang angkanya lebih tinggi". Warna paling pekat mulai di angka{" "}
        <span className="font-medium text-foreground">{Math.round(atas)}</span>.
      </p>
      {fokus ? (
        <p>
          {nf.format(jumlahTitik)} titik digambar.{" "}
          {totalTitik > jumlahTitik ? (
            <>
              Total kasus {nf.format(totalTitik)}, jadi {nf.format(totalTitik - jumlahTitik)} kasus
              tidak dilukiskan agar titik tidak bertumpuk menjadi satu gumpalan. Titik hanya
              mewakili sebaran dalam batas kecamatan; koordinat asli pasien individual tidak ada di
              sumber publik.
            </>
          ) : (
            "Satu titik = satu kasus."
          )}
        </p>
      ) : null}
    </div>
  );
}
