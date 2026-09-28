import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Clock,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AlertBanner } from "@/components/AlertBanner";
import { AlatTabel } from "@/components/AlatTabel";
import { LevelBadge } from "@/components/LevelBadge";
import { StatCard } from "@/components/StatCard";
import { useSurveilans } from "@/lib/store";
import {
  hitungDalamRentang,
  kasusValid,
  perPenyakit,
  perUmurPenyakit,
  rataKeterlambatan,
  statusPerDesa,
  tren,
} from "@/lib/analitik";
import { TAHUN_SKDR } from "@/data/skdr";
import { PENYAKIT, TANGGAL_ACUAN } from "@/data/dataset";
import { KABUPATEN, KECAMATAN, PROVINSI, TOTAL_PENDUDUK } from "@/data/wilayah";
import { AMBANG, bandingkanPenyakit, ringkasan, trenMingguan, type Penyakit } from "@/lib/skdr";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Surveilans | SIDINI" },
      {
        name: "description",
        content: `Skrining mingguan SKDR ${PROVINSI} per penyakit di ${KABUPATEN}, dengan ambang KLB yang bisa diaudit.`,
      },
      { property: "og:title", content: "Dashboard Surveilans | SIDINI" },
      {
        property: "og:description",
        content:
          "Pantau tren mingguan per penyakit, sebaran wilayah, dan ambang KLB otomatis dalam satu layar.",
      },
    ],
  }),
  component: Dashboard,
});

/** Warna konsisten per penyakit di semua grafik dashboard, supaya legenda
 *  selalu bisa dibaca (misal hijau selalu DBD). */
const WARNA_PENYAKIT: Record<Penyakit, string> = {
  DBD: "var(--color-chart-5)", // hijau
  Diare: "var(--color-chart-2)", // kuning
  Chikungunya: "var(--color-chart-4)", // biru
  "Hepatitis A": "var(--color-chart-3)", // merah
};
/** Warna total kasus (area teal), dipakai di tren harian 28 hari. */
const WARNA_TOTAL = "var(--color-chart-1)";

const nf = new Intl.NumberFormat("id-ID");
const TAHUN = TAHUN_SKDR[TAHUN_SKDR.length - 1] ?? 2026;

const TIP = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

function Dashboard() {
  const { kasus } = useSurveilans();

  // --- Bagian 1: pelaporan kasus harian (42 hari terakhir) -----------------
  const d = useMemo(() => {
    const valid = kasusValid(kasus);
    const m1 = hitungDalamRentang(valid, 7);
    const m0 = hitungDalamRentang(valid, 7, 7);
    return {
      valid,
      m1,
      m0,
      delta: m0.length ? Math.round(((m1.length - m0.length) / m0.length) * 100) : 0,
      status: statusPerDesa(valid),
      tren28: tren(valid, 28),
      penyakit: perPenyakit(m1),
      umurPenyakit: perUmurPenyakit(m1),
      lag: rataKeterlambatan(hitungDalamRentang(valid, 14)),
      menunggu: kasus.filter(
        (k) => k.sumber === "Warga" && (k.status === "Baru" || k.status === "Investigasi"),
      ).length,
    };
  }, [kasus]);

  const jumlahKLBDesa = d.status.filter((s) => s.level === "KLB").length;

  // --- Bagian 2: SKDR mingguan, SELALU dipisah per penyakit ------------------
  // Tiap penyakit punya kartu dan grafik sendiri. Jumlah kasus dari penyakit
  // berbeda tidak pernah dijumlahkan.
  const perPenyakitSKDR = useMemo(() => bandingkanPenyakit(TAHUN, 1, 52), []);

  const trenPerPenyakit = useMemo(
    () =>
      (["DBD", "Diare", "Chikungunya", "Hepatitis A"] as Penyakit[]).map((p) => ({
        penyakit: p,
        titik: trenMingguan({ tahun: TAHUN, mingguDari: 1, mingguSampai: 52, penyakit: p }),
      })),
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="pulse-dot size-1.5 rounded-full bg-primary" />
          {PROVINSI} &middot; {KABUPATEN} &middot; {nf.format(TOTAL_PENDUDUK)} jiwa
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
          Dari pelaporan reaktif menjadi{" "}
          <span className="text-gradient">peringatan dini wabah</span> di {KABUPATEN}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Dua lapis data, satu untuk setiap pertanyaan. Lapis pertama{" "}
          <strong className="text-foreground">pelaporan kasus individu</strong> per hari untuk
          operasional lapangan. Lapis kedua{" "}
          <strong className="text-foreground">agregat SKDR per minggu</strong> untuk status KLB,
          karena itulah formulir yang diisi puskesmas dan acuan ambangnya.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/peta"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Peta & ambang KLB <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/analisis"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary/70"
          >
            <Sparkles className="size-4 text-primary" /> Analisis naratif AI
          </Link>
          <Link
            to="/lapor"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            Warga lapor gejala
          </Link>
        </div>
      </section>

      {/* ============ LAPIS 1: PELAPORAN HARIAN ============ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <h2 className="text-lg font-semibold">Pelaporan kasus individu</h2>
          <p className="text-xs text-muted-foreground">
            7 hari terakhir, per {TANGGAL_ACUAN} &middot; sumber: laporan puskesmas &amp; warga
          </p>
        </div>

        <AlertBanner status={d.status} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Activity}
            label="Kasus 7 hari terakhir"
            nilai={d.m1.length}
            keterangan={`${d.delta >= 0 ? "+" : ""}${d.delta}% dibanding 7 hari sebelumnya (${d.m0.length} kasus)`}
            nada={d.delta > 25 ? "bahaya" : d.delta > 0 ? "waspada" : "baik"}
          />
          <StatCard
            icon={TrendingUp}
            label="Desa status KLB"
            nilai={jumlahKLBDesa}
            satuan={`/ ${d.status.length} desa`}
            keterangan={
              jumlahKLBDesa ? "Alert otomatis sudah terkirim" : "Tidak ada ambang terlampaui"
            }
            nada={jumlahKLBDesa ? "bahaya" : "baik"}
          />
          <StatCard
            icon={Clock}
            label="Rata-rata keterlambatan lapor"
            nilai={d.lag}
            satuan="hari"
            keterangan="Selisih tanggal onset ke tanggal lapor (14 hari terakhir)"
            nada={d.lag <= 1 ? "baik" : "waspada"}
          />
          <StatCard
            icon={ClipboardCheck}
            label="Laporan warga menunggu verifikasi"
            nilai={d.menunggu}
            keterangan="Belum dihitung sebagai kasus sampai diverifikasi petugas"
            nada={d.menunggu > 20 ? "waspada" : "netral"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <h3 className="text-base font-semibold">Tren kasus harian (28 hari)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Berdasarkan tanggal onset gejala; hanya kasus terverifikasi/terkonfirmasi. Tiap garis
              warna mewakili satu penyakit (hijau DBD, kuning Diare, biru Chikungunya, merah
              Hepatitis A), sedangkan area teal adalah total kasus.
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.tren28}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={WARNA_TOTAL} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={WARNA_TOTAL} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={TIP} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total kasus"
                    stroke={WARNA_TOTAL}
                    strokeWidth={2}
                    fill="url(#gTotal)"
                  />
                  {PENYAKIT.map((p) => (
                    <Area
                      key={p}
                      type="monotone"
                      dataKey={p}
                      name={p}
                      stroke={WARNA_PENYAKIT[p]}
                      strokeWidth={1.5}
                      fill="transparent"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <LegendaSeri
              items={[
                { label: "Total kasus", warna: WARNA_TOTAL },
                ...PENYAKIT.map((p) => ({ label: p, warna: WARNA_PENYAKIT[p] })),
              ]}
            />
          </div>

          <div className="panel p-5">
            <h3 className="text-base font-semibold">Komposisi penyakit (7 hari)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Hanya untuk melihat apakah satu penyakit mendominasi pelaporan. Panjang slice tidak
              boleh dijumlahkan menjadi "total kasus".
            </p>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.penyakit}
                    dataKey="jumlah"
                    nameKey="penyakit"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {d.penyakit.map((p) => (
                      <Cell key={p.penyakit} fill={WARNA_PENYAKIT[p.penyakit]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {d.penyakit.map((p) => (
                <li key={p.penyakit} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: WARNA_PENYAKIT[p.penyakit] }}
                  />
                  <span className="flex-1">{p.penyakit}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.jumlah}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Users className="size-4 text-primary" /> Kelompok umur (7 hari)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tinggi kolom = jumlah kasus di kelompok umur itu, dipecah per penyakit. Jadi terlihat
              kelompok umur yang sakit apa, bukan sekadar akumulasi.
            </p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.umurPenyakit}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="kelompok"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={TIP} />
                  {PENYAKIT.map((p, i) => (
                    <Bar
                      key={p}
                      dataKey={p}
                      name={p}
                      stackId="umur"
                      fill={WARNA_PENYAKIT[p]}
                      radius={i === PENYAKIT.length - 1 ? [6, 6, 0, 0] : 0}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <LegendaSeri items={PENYAKIT.map((p) => ({ label: p, warna: WARNA_PENYAKIT[p] }))} />
          </div>

          <div className="panel p-5 lg:col-span-2">
            <AlatTabel
              baris={d.status}
              nama="status-desa-7-hari"
              rowKey={(s) => s.kode}
              judul={<h3 className="text-base font-semibold">Status per desa (7 hari terakhir)</h3>}
              keterangan={
                <p className="text-xs text-muted-foreground">
                  Ambang: KLB bila rasio &ge; 2x baseline dengan minimal 10 kasus, atau insidensi
                  &ge; 50 per 100.000 per minggu.
                </p>
              }
              kolom={[
                {
                  kunci: "desa",
                  judul: "Desa",
                  cari: (s) => `${s.desa} ${s.kecamatan} ${s.puskesmas}`,
                  nilai: (s) => s.desa,
                  render: (s) => (
                    <>
                      <span className="font-medium">{s.desa}</span>
                      <span className="block text-xs text-muted-foreground">{s.kecamatan}</span>
                    </>
                  ),
                },
                {
                  kunci: "kasus",
                  judul: "Kasus",
                  angka: true,
                  nilai: (s) => String(s.mingguIni),
                },
                {
                  kunci: "baseline",
                  judul: "Baseline",
                  angka: true,
                  nilai: (s) => s.rataBaseline.toFixed(1),
                },
                {
                  kunci: "rasio",
                  judul: "Rasio",
                  angka: true,
                  nilai: (s) => `${s.rasio.toFixed(2)}x`,
                },
                {
                  kunci: "insidensi",
                  judul: "Insidensi/100k",
                  angka: true,
                  nilai: (s) => s.insidensi.toFixed(1),
                },
                {
                  kunci: "status",
                  judul: "Status",
                  nilai: (s) => s.level,
                  render: (s) => <LevelBadge level={s.level} />,
                },
                {
                  kunci: "alasan",
                  judul: "Alasan",
                  nilai: (s) => s.alasan,
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ============ LAPIS 2: SKDR MINGGUAN PER PENYAKIT ============ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <h2 className="text-lg font-semibold">Agregat SKDR mingguan {TAHUN}</h2>
          <p className="text-xs text-muted-foreground">
            Satu kartu per penyakit &middot; {KECAMATAN.length} kecamatan &middot; minggu 1&ndash;52
            &middot; angka antarpenyakit tidak dijumlahkan
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {perPenyakitSKDR.map((p) => (
            <KartuPenyakit key={p.penyakit} {...p} />
          ))}
        </div>

        <div className="panel p-5">
          <h3 className="text-base font-semibold">Tren mingguan per penyakit</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Masing-masing penyakit punya sumbu nilai sendiri, karena orange magnitudenya berbeda
            beberapa orde. Menumpuknya di satu grafik akan membuat DBD (ratusan per minggu) menutupi
            Hepatitis A (satu-digit).
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {trenPerPenyakit.map((tp) => (
              <GrafikPenyakit key={tp.penyakit} {...tp} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function KartuPenyakit({
  penyakit,
  total,
  meninggal,
  insidensi,
  kecamatanKLB,
  mingguKLB,
  mingguWaspada,
  puncak,
  tertinggi,
}: {
  penyakit: Penyakit;
  total: number;
  meninggal: number;
  insidensi: number;
  /** kecamatan yang menyentuh KLB di satu minggu mana pun dalam setahun */
  kecamatanKLB: number;
  /** minggu yang punya setidaknya satu kecamatan KLB */
  mingguKLB: number;
  /** minggu yang punya setidaknya satu kecamatan berstatus Waspada */
  mingguWaspada: number;
  /** kasus tertinggi dalam satu minggu, beserta kecamatan dan nomor mingguanya */
  puncak: { minggu: number; nama: string; jumlah: number; insidensi: number } | null;
  tertinggi: { nama: string; jumlah: number } | null;
}) {
  const a = AMBANG[penyakit];
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold">{penyakit}</p>
          <p className="text-[11px] text-muted-foreground">Ambang KLB {a.insidensiMin}/100k/mgg</p>
        </div>
        {/* Badge mengikuti puncak MINGGUAN, bukan rata-rata setahun. Kalau
            memakai rata-rata, DBD akan selalu hijau: 2,7 per 100.000 per
            minggu jauh di bawah ambang 50, padahal ada 6 minggu yang
            benar-benar berstatus KLB. */}
        <LevelBadge level={mingguKLB > 0 ? "KLB" : mingguWaspada > 0 ? "Waspada" : "Aman"} />
      </div>

      <div>
        <p className="font-display text-2xl font-bold leading-none">
          {nf.format(total)}
          <span className="ml-1 text-xs font-medium text-muted-foreground">kasus/tahun</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {nf.format(meninggal)} kematian &middot; rata-rata {insidensi.toFixed(1)}/100k/mgg
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
        <Angka
          label="Mgg KLB"
          nilai={mingguKLB}
          warna={mingguKLB > 0 ? "text-destructive" : undefined}
        />
        <Angka
          label="Kec. KLB"
          nilai={kecamatanKLB}
          warna={kecamatanKLB > 0 ? "text-destructive" : undefined}
        />
        <Angka
          label="Mgg Waspada"
          nilai={mingguWaspada}
          warna={mingguWaspada > 0 ? "text-warning-text" : undefined}
        />
      </dl>

      {puncak ? (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Puncak mingguan:{" "}
          <span className="font-medium text-foreground">{nf.format(puncak.jumlah)} kasus</span> di{" "}
          {puncak.nama}, minggu {puncak.minggu} ({puncak.insidensi.toFixed(0)}/100k/mgg)
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Status dinilai per minggu, bukan dari rata-rata setahun. Rata-rata
        {` ${insidensi.toFixed(1)}`}/100k/mgg sengaja tidak dipakai untuk menetapkan KLB.
      </p>
    </div>
  );
}

function Angka({
  label,
  nilai,
  warna,
}: {
  label: string;
  nilai: number;
  warna?: string | undefined;
}) {
  return (
    <div>
      <dd className={`font-display text-lg font-bold leading-none ${warna ?? ""}`}>{nilai}</dd>
      <dt className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
    </div>
  );
}

/** Legenda titik warna kecil yang dipakai di bawah grafik tren dan umur,
 *  supaya tiap warna penyakit selalu bisa dikenali. */
function LegendaSeri({ items }: { items: { label: string; warna: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ background: it.warna }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function GrafikPenyakit({
  penyakit,
  titik,
}: {
  penyakit: Penyakit;
  titik: { minggu: number; label: string; jumlah: number; level: string }[];
}) {
  const a = AMBANG[penyakit];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{penyakit}</p>
        <p className="text-[11px] text-muted-foreground">Kasus per minggu</p>
      </div>
      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={titik} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="minggu"
              tick={{ fontSize: 10 }}
              stroke="var(--color-muted-foreground)"
              interval={12}
            />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={TIP}
              labelFormatter={(v) => `Minggu ${v}`}
              formatter={(v) => [nf.format(Number(v ?? 0)), "Kasus"]}
            />
            <Area
              type="monotone"
              dataKey="jumlah"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              fill="var(--color-chart-1)"
              fillOpacity={0.12}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {titik.filter((t) => t.level === "KLB").length} minggu menyentuh ambang KLB
        {a.insidensiMin > 0 ? ` (${a.insidensiMin}/100k/mgg)` : ""} &middot;{" "}
        {titik.reduce((m, t) => Math.max(m, t.jumlah), 0)} kasus puncak mingguan
      </p>
    </div>
  );
}

// Dipakai ulang supaya halaman ringkasan statistik bisa memanggilnya tanpa
// menyalin rumus ringkasan ke route lain.
export { ringkasan };
