import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Minus, Plus, RotateCcw } from "lucide-react";

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
 * Di kedua tingkat ada zoom (roda tetikus atau tombol) dan geser (tarik).
 * Tanpa ini, titik kasus radius 2,6 satuan viewBox hanya berukuran couple
 * piksel di layar sehingga sebarannya tidak terbaca.
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
/** Batas atas titik yang digambar sekaligus, supaya tidak melambat. */
const MAKS_TITIK = 400;
/** 1x sampai 14x. Di atas ini titik individual tidak lagi menambah informasi. */
const ZOOM_MAKS = 14;

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

/** Skala warna untuk kasus meninggal: jumlah kematian, bukan insidensi. */
const BATAS_MINGGAL: readonly number[] = [0, 1, 2, 3, 5];

function kelasDari(nilai: number, batas: readonly number[]): number {
  for (let i = batas.length - 1; i >= 0; i--) {
    if (nilai >= batas[i]!) return i;
  }
  return 0;
}

const nf = new Intl.NumberFormat("id-ID");

/** Kotak pandang dalam satuan viewBox. */
interface Kotak {
  x: number;
  y: number;
  w: number;
  h: number;
}

const KOTAK_AWAL: Kotak = { x: 0, y: 0, w: LEBAR, h: TINGGI };

/**
 * Cegah pandangan keluar dari peta sepenuhnya. Sisakan satu layar di
 * setiap sisi supaya tidak pernah kehilangan lokasi sepenuhnya.
 */
function jepit(k: Kotak): Kotak {
  const sisaX = k.w * 0.5;
  const sisaY = k.h * 0.5;
  return {
    x: Math.min(LEBAR - k.w + sisaX, Math.max(-sisaX, k.x)),
    y: Math.min(TINGGI - k.h + sisaY, Math.max(-sisaY, k.y)),
    w: k.w,
    h: k.h,
  };
}

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
  /**
   * Kematian tidak punya ambang insidensi yang bermakna, jadi warnanya
   * memakai skala jumlah kematian tetap. Nilai ini tidak bergantung pada
   * apa pun, dipindah ke luar komponen supaya identitasnya stabil.
   */
  const batasMeninggal = BATAS_MINGGAL;

  // --- Zoom & geser ----------------------------------------------------------
  const [kotak, setKotak] = useState<Kotak>(KOTAK_AWAL);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const seret = useRef<{ clientX: number; clientY: number; kotak: Kotak; jarak: number } | null>(
    null,
  );

  // Ganti tingkat atau ganti penyakit -> pandangan kembali penuh. Tanpa ini
  // kotak lama akan tetap berlaku padahal isi peta sudah berbeda.
  useEffect(() => {
    setKotak(KOTAK_AWAL);
  }, [fokus, penyakit, mode, jenis]);

  const zoom = LEBAR / kotak.w;

  /**
   * Perbesar atau kecilkan sebesar `faktor`. Titik acuan (fx, fy) dalam
   * fraksi 0..1 menentukan posisi yang harus tetap diam -- kursor tetikus.
   */
  const ubahZoom = useCallback((faktor: number, fx = 0.5, fy = 0.5) => {
    setKotak((k) => {
      const wBaru = Math.min(LEBAR, Math.max(LEBAR / ZOOM_MAKS, k.w / faktor));
      if (Math.abs(wBaru - k.w) < 0.01) return k;
      const hBaru = (wBaru * TINGGI) / LEBAR;
      return jepit({
        x: k.x + (k.w - wBaru) * fx,
        y: k.y + (k.h - hBaru) * fy,
        w: wBaru,
        h: hBaru,
      });
    });
  }, []);

  // Roda tetikus dipasang manual dengan { passive: false } supaya
  // preventDefault() benar-benar mencegah halaman ikut menggulir.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onRoda = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      ubahZoom(
        e.deltaY < 0 ? 1.2 : 1 / 1.2,
        (e.clientX - r.left) / r.width,
        (e.clientY - r.top) / r.height,
      );
    };
    svg.addEventListener("wheel", onRoda, { passive: false });
    return () => svg.removeEventListener("wheel", onRoda);
  }, [ubahZoom]);

  const geserKe = (clientX: number, clientY: number) => {
    const s = seret.current;
    const r = svgRef.current?.getBoundingClientRect();
    if (!s || !r || !r.width || !r.height) return;
    const dx = ((clientX - s.clientX) / r.width) * s.kotak.w;
    const dy = ((clientY - s.clientY) / r.height) * s.kotak.h;
    // Jarak dihitung dalam piksel layar, bukan satuan viewBox, supaya
    // ambang "ini geser, bukan klik" tetap terasa sama di setiap tingkat zoom.
    s.jarak = Math.max(s.jarak, Math.hypot(clientX - s.clientX, clientY - s.clientY));
    setKotak(jepit({ ...s.kotak, x: s.kotak.x - dx, y: s.kotak.y - dy }));
  };

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

      // Luas kotak pembatas dalam satuan viewBox. Dipakai untuk menahan
      // nama kecamatan yang terlalu kecil supaya teksnya tidak bertabrakan.
      const cincin = k.ring[0] ?? [];
      let minX = Infinity;
      let minY = Infinity;
      let maksX = -Infinity;
      let maksY = -Infinity;
      for (const titik of cincin) {
        const lon = titik[0];
        const lat = titik[1];
        if (lon === undefined || lat === undefined) continue;
        const [x, y] = proyeksi.keLayar(lon, lat);
        if (x < minX) minX = x;
        if (x > maksX) maksX = x;
        if (y < minY) minY = y;
        if (y > maksY) maksY = y;
      }
      const lebar = Number.isFinite(minX) ? maksX - minX : 0;
      const tinggi = Number.isFinite(minY) ? maksY - minY : 0;
      return {
        k,
        d: kePath(k.ring, proyeksi),
        warna,
        jumlah,
        meninggal,
        nilai,
        status: s,
        tx,
        ty,
        luas: lebar * tinggi,
      };
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
              Tingkat 2 dari 2: <span className="font-medium text-foreground">{fokus.nama}</span> ·{" "}
              {fokus.desa.length} desa/kelurahan
            </>
          ) : (
            <>
              Tingkat 1 dari 2: seluruh {KECAMATAN.length} kecamatan di {KABUPATEN}. Klik satu warna
              untuk memperbesar.
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          Gulir untuk memperbesar &middot; tarik untuk menggeser
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/40">
        <svg
          ref={svgRef}
          viewBox={`${kotak.x} ${kotak.y} ${kotak.w} ${kotak.h}`}
          className={cn(
            "h-auto w-full touch-none select-none",
            // Saat sudah diperbesar, kursor jadi tangan untuk menggeser.
            zoom > 1.02 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
          )}
          role="img"
          aria-label={
            fokus ? `Peta titik kasus ${fokus.nama}` : `Peta choropleth ${KABUPATEN} per kecamatan`
          }
          onPointerDown={(e) => {
            if (zoom <= 1.02) return;
            (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
            seret.current = { clientX: e.clientX, clientY: e.clientY, kotak, jarak: 0 };
          }}
          onPointerMove={(e) => geserKe(e.clientX, e.clientY)}
          onPointerUp={() => {
            seret.current = null;
          }}
          onPointerCancel={() => {
            seret.current = null;
          }}
        >
          <g>
            {poligon.map(({ k, d, warna, status: s, jumlah, meninggal, tx, ty, luas }) => {
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
                      "transition-opacity outline-none",
                      // Peta di tingkat 1 bisa diklik untuk masuk ke titik kasus.
                      // `seret.current` sengaja tidak dipakai di sini: ref tidak
                      // memicu render, jadi kelas kursor tidak akan pernah
                      // ikut berubah. Penekanan klik ada di onClick.
                      !fokus && "cursor-pointer",
                      "hover:opacity-80 focus-visible:opacity-80",
                      "focus-visible:[stroke:var(--color-primary)]",
                      "focus-visible:[stroke-width:3]",
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label={label}
                    onClick={() => {
                      // Geser 5 piksel atau lebih dihitung gesture, bukan klik,
                      // supaya menggeser peta tidak pernah membuka kecamatan
                      // yang kebetulan berada di bawah kursor.
                      if (fokus || (seret.current?.jarak ?? 0) > 5) return;
                      onFokus(k.kode);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      if (!fokus) onFokus(k.kode);
                    }}
                  >
                    <title>{label}</title>
                  </path>
                  {!fokus && luas > 1900 ? (
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      className="pointer-events-none select-none fill-foreground text-[9px] font-medium"
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

        <KontrolZoom
          zoom={zoom}
          onPerbesar={() => ubahZoom(1.35)}
          onPerkecil={() => ubahZoom(1 / 1.35)}
          onReset={() => setKotak(KOTAK_AWAL)}
        />

        <Legenda
          mode={mode}
          batas={batas}
          penyakit={penyakit}
          jumlahTitik={titik.length}
          totalTitik={totalTitikAsli}
          fokus={fokus}
        />
      </div>
    </div>
  );
}

function KontrolZoom({
  zoom,
  onPerbesar,
  onPerkecil,
  onReset,
}: {
  zoom: number;
  onPerbesar: () => void;
  onPerkecil: () => void;
  onReset: () => void;
}) {
  const tombol =
    "flex size-8 items-center justify-center rounded-md bg-surface/95 text-foreground shadow-sm ring-1 ring-border transition hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1.5">
      <button type="button" className={tombol} onClick={onPerbesar} aria-label="Perbesar">
        <Plus className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={tombol}
        onClick={onPerkecil}
        disabled={zoom <= 1.02}
        aria-label="Perkecil"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <button type="button" className={tombol} onClick={onReset} aria-label="Tampilkan penuh">
        <RotateCcw className="size-3.5" aria-hidden />
      </button>
      <span className="rounded-md bg-surface/95 px-1.5 py-0.5 text-center text-[10px] font-medium tabular-nums text-muted-foreground ring-1 ring-border">
        {zoom.toFixed(1)}x
      </span>
    </div>
  );
}

/**
 * Legenda mengambang di pojok peta. Baris skala warna selalu terlihat karena
 * itu yang dipakai membaca peta; penjelasan panjang bisa disembunyikan supaya
 * tidak menutupi peta.
 */
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
  const [buka, setBuka] = useState(false);
  const atas = batas[batas.length - 1]!;
  const tengah = batas[batas.length - 2]!;
  const angka = (b: number) => (b < 10 ? b.toFixed(1) : Math.round(b));

  return (
    <div className="absolute bottom-3 left-3 max-w-[min(22rem,calc(100%-1.5rem))] rounded-lg bg-surface/95 shadow-sm ring-1 ring-border backdrop-blur-sm">
      <div className="flex items-start gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          {mode === "status" ? (
            <p className="text-[11px] font-medium text-foreground">Status</p>
          ) : (
            <>
              <p className="text-[11px] font-medium text-foreground">
                Insidensi per 100.000/minggu
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] tabular-nums text-muted-foreground">
                <span>0</span>
                {batas.slice(1).map((b, i) => (
                  <span key={b} className="inline-flex items-center gap-1">
                    <span
                      className="size-3 rounded-sm ring-1 ring-border"
                      style={{ background: WARNA_RAMP[i + 1] }}
                    />
                    <span className={b === tengah ? "font-semibold text-foreground" : ""}>
                      {angka(b)}
                    </span>
                  </span>
                ))}
                <span>atau lebih</span>
              </div>
            </>
          )}

          {mode === "status" ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {(["Aman", "Waspada", "KLB"] as Level[]).map((lv) => (
                <span key={lv} className="inline-flex items-center gap-1">
                  <span
                    className="size-3 rounded-sm ring-1 ring-border"
                    style={{ background: WARNA_STATUS[lv] }}
                  />
                  {lv}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setBuka((v) => !v)}
          aria-expanded={buka}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={buka ? "Sembunyikan penjelasan legenda" : "Tampilkan penjelasan legenda"}
        >
          {/* Panah menunjuk ke arah isi yang akan muncul, bukan ke arah tutup. */}
          {buka ? (
            <ChevronUp className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </button>
      </div>

      {buka ? (
        <div className="space-y-1.5 border-t border-border px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {mode === "status" ? (
            <p>
              Amber sudah naik 1,5x dari baseline sendiri. Merah melewati ambang KLB {penyakit} (
              {AMBANG[penyakit].insidensiMin} per 100.000 per minggu).
            </p>
          ) : (
            <p>
              Warna diukur relatif terhadap ambang KLB {penyakit} ({AMBANG[penyakit].insidensiMin}{" "}
              per 100.000 per minggu), jadi warna mudah dibaca sebagai "seberapa dekat dengan
              ambang". Warna paling pekat mulai di angka{" "}
              <span className="font-medium text-foreground">{angka(atas)}</span>.
            </p>
          )}

          {fokus ? (
            jumlahTitik < totalTitik ? (
              <p>
                {nf.format(jumlahTitik)} titik digambar, {nf.format(totalTitik)} kasus tercatat,
                jadi {nf.format(totalTitik - jumlahTitik)} kasus tidak dilukiskan agar titik tidak
                bertumpuk menjadi satu gumpalan. Titik hanya mewakili sebaran dalam batas kecamatan;
                koordinat asli pasien individual tidak ada di sumber publik.
              </p>
            ) : (
              <p>Satu titik = satu kasus.</p>
            )
          ) : (
            <p>Klik satu kecamatan untuk masuk ke titik kasus, atau gulir untuk memperbesar.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
