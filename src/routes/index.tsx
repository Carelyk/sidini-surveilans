import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BellRing,
  ClipboardCheck,
  Clock,
  Info,
  Pause,
  Play,
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

import { AlatTabel } from "@/components/AlatTabel";
import { AlertBanner } from "@/components/AlertBanner";
import { LevelBadge } from "@/components/LevelBadge";
import { PanelDampak } from "@/components/PanelDampak";
import { StatCard } from "@/components/StatCard";
import { ATURAN_HARIAN, KASUS_MIN_WASPADA } from "@/data/ambang";
import { useSurveilans } from "@/lib/store";
import {
  formatInsidensi,
  hitungDalamRentang,
  kasusValid,
  perPenyakit,
  perUmurPenyakit,
  rataKeterlambatan,
  statusPerDesa,
  tren,
  type StatusDesa,
  type StatusPenyakitDesa,
} from "@/lib/analitik";
import { SEMU_KEJADIAN, TAHUN_SKDR } from "@/data/skdr";
import { PENYAKIT, TANGGAL_ACUAN } from "@/data/dataset";
import { formatTanggal, waktuPembaruan } from "@/data/kronologi";
import { KABUPATEN, KECAMATAN, PROVINSI, TOTAL_PENDUDUK } from "@/data/wilayah";
import {
  AMBANG,
  LABEL_RENTANG_SKDR,
  MINGGU_SKDR_TERAKHIR,
  bandingkanPenyakit,
  ringkasan,
  trenMingguan,
  type Penyakit,
} from "@/lib/skdr";

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
          "Pantau tren mingguan per penyakit, sebaran wilayah, dan ambang KLB yang bisa diaudit dalam satu layar.",
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

/**
 * Status penyakit yang menjelaskan level desa: penyakit dengan level
 * tertinggi. Kolom tabel (kasus, baseline, rasio, insidensi) memakai angka
 * penyakit INI, bukan gabungan semua penyakit, supaya tabel tidak pernah
 * menampilkan rasio gabungan yang tidak ada ambangnya.
 */
function pemicu(s: StatusDesa): StatusPenyakitDesa {
  const urut = { Aman: 0, Waspada: 1, Sinyal: 2 } as const;
  return s.perPenyakit.reduce((best, p) => (urut[p.level] > urut[best.level] ? p : best));
}

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
    const penyakit = perPenyakit(m1);
    const totalKasus = penyakit.reduce((m, p) => m + p.jumlah, 0);
    return {
      valid,
      m1,
      m0,
      delta: m0.length ? Math.round(((m1.length - m0.length) / m0.length) * 100) : 0,
      status: statusPerDesa(valid),
      tren28: tren(valid, 28),
      penyakit,
      komposisi: penyakit.map((p) => ({
        ...p,
        persen: Math.round((p.jumlah / Math.max(1, totalKasus)) * 100),
      })),
      umurPenyakit: perUmurPenyakit(m1),
      lag: rataKeterlambatan(hitungDalamRentang(valid, 14)),
      menunggu: kasus.filter(
        (k) => k.sumber === "Warga" && (k.status === "Baru" || k.status === "Investigasi"),
      ).length,
    };
  }, [kasus]);

  const jumlahSinyalDesa = d.status.filter((s) => s.level === "Sinyal").length;

  // --- Bagian 2: SKDR mingguan, SELALU dipisah per penyakit ------------------
  // Tiap penyakit punya kartu dan grafik sendiri. Jumlah kasus dari penyakit
  // berbeda tidak pernah dijumlahkan.
  // Deret dipotong di minggu data terakhir (lihat MINGGU_SKDR_TERAKHIR): minggu
  // setelahnya tidak punya laporan kasus sehingga tidak boleh tampil sebagai data.
  const perPenyakitSKDR = useMemo(() => bandingkanPenyakit(TAHUN, 1, MINGGU_SKDR_TERAKHIR), []);

  // Perbandingan antar tahun memakai rentang minggu yang sama persis untuk
  // kedua tahun, supaya 2026 tidak dibandingkan dengan 52 minggu sementara
  // 2025 hanya 39 minggu. Angka yang dibandingkan adalah hasil simulasi
  // yang sama, bukan dua sumber data berbeda.
  const bandingTahun = useMemo(
    () =>
      TAHUN_SKDR.slice(-2).map((tahun) => ({
        tahun,
        perPenyakit: bandingkanPenyakit(tahun, 1, MINGGU_SKDR_TERAKHIR),
      })),
    [],
  );

  const trenPerPenyakit = useMemo(
    () =>
      (["DBD", "Diare", "Chikungunya", "Hepatitis A"] as Penyakit[]).map((p) => ({
        penyakit: p,
        titik: trenMingguan({
          tahun: TAHUN,
          mingguDari: 1,
          mingguSampai: MINGGU_SKDR_TERAKHIR,
          penyakit: p,
        }),
      })),
    [],
  );

  // Baris tabel perbandingan antar tahun. Kedua tahun memakai rentang minggu
  // yang sama (lihat bandingTahun di atas), jadi selisihnya benar-benar
  // mencerminkan jumlah kasus, bukan panjang rentang yang berbeda.
  const barisBandingTahun = useMemo(() => {
    const baru = bandingTahun[bandingTahun.length - 1];
    const lama = bandingTahun[bandingTahun.length - 2];
    const lamaP = lama?.perPenyakit ?? [];
    if (!baru || !lama) return [];
    return baru.perPenyakit.map((p) => {
      const s = lamaP.find((x) => x.penyakit === p.penyakit);
      return {
        penyakit: p.penyakit,
        kasusBaru: p.total,
        kasusLama: s?.total ?? 0,
        selisih: p.total - (s?.total ?? 0),
        mingguKLBBaru: p.mingguKLB,
        mingguKLBLama: s?.mingguKLB ?? 0,
      };
    });
  }, [bandingTahun]);

  // --- Grafik dinamis: tren harian dibuka hari per hari -----------------------
  // Tombol Putar menampilkan 7 hari pertama, lalu menambah satu hari
  // sampai ke-28. Berhenti sendiri setelah hari terakhir, atau bisa dijeda.
  const totalHari = d.tren28.length;
  const [terlihat, setTerlihat] = useState(totalHari);
  const [bermain, setBermain] = useState(false);

  useEffect(() => {
    if (!bermain) return;
    const id = window.setInterval(() => {
      setTerlihat((v) => Math.min(v + 1, totalHari));
    }, 180);
    return () => window.clearInterval(id);
  }, [bermain, totalHari]);

  useEffect(() => {
    if (bermain && terlihat >= totalHari) setBermain(false);
  }, [bermain, terlihat, totalHari]);

  const trenTampil = useMemo(() => d.tren28.slice(0, terlihat), [d.tren28, terlihat]);

  const klikPutar = () => {
    if (bermain) {
      setBermain(false);
      return;
    }
    // Kalau animasi sudah tamat, mulai lagi dari awal; kalau dijeda, lanjutkan.
    if (terlihat >= totalHari) setTerlihat(Math.min(7, totalHari));
    setBermain(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="pulse-dot size-1.5 rounded-full bg-primary" />
          {PROVINSI} &middot; {KABUPATEN} &middot; {nf.format(TOTAL_PENDUDUK)} jiwa
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
          Surveilans terpadu untuk <span className="text-gradient">deteksi dini KLB</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          <strong className="text-foreground">Pelaporan kasus harian</strong> mempercepat respons
          petugas lapangan. <strong className="text-foreground">Rekapitulasi SKDR mingguan</strong>{" "}
          dari puskesmas digunakan untuk menilai status KLB berdasarkan ambang yang berlaku.
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
            <Sparkles className="size-4 text-primary" /> Tanya AI
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
            7 hari terakhir, s.d. {formatTanggal(TANGGAL_ACUAN)} &middot; data diperbarui{" "}
            {waktuPembaruan()} &middot; sumber: laporan puskesmas &amp; warga
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
            label="Desa berstatus sinyal"
            nilai={jumlahSinyalDesa}
            satuan={`/ ${d.status.length} desa`}
            keterangan={
              jumlahSinyalDesa
                ? "Dugaan KLB per penyakit, belum status KLB resmi"
                : "Tidak ada ambang terlampaui"
            }
            nada={jumlahSinyalDesa ? "bahaya" : "baik"}
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

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            Lapis ini menghitung <strong className="font-semibold">sinyal harian</strong> per
            penyakit dari kasus individu 7 hari. Kata &ldquo;KLB&rdquo; sebagai status resmi hanya
            dipakai di lapis SKDR mingguan di bawah, yang datanya agregat per kecamatan per minggu.
            Sinyal di sini berarti kecurigaan lapangan yang perlu ditindaklanjuti, bukan penetapan
            status KLB.
          </span>
        </p>

        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <BellRing className="size-3.5 text-primary" aria-hidden /> Syarat kasus minimum
            (pembatas alert fatigue)
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              <strong className="text-foreground">Sinyal</strong>: rasio minimal 2x baseline dengan
              minimal {ATURAN_HARIAN.kasusMinSinyal} kasus penyakit itu dalam 7 hari, atau insidensi
              melewati ambang penyakit.
            </li>
            <li>
              <strong className="text-foreground">Waspada</strong>: rasio minimal 1,5x baseline
              dengan minimal {KASUS_MIN_WASPADA} kasus penyakit itu dalam 7 hari. Angka yang sama
              berlaku di lapis SKDR mingguan per kecamatan, jadi tidak ada syarat yang berbeda antara
              lapis harian dan mingguan.
            </li>
            <li>
              Rasio di bawah jumlah kasus minimum itu{" "}
              <strong className="text-foreground">tidak</strong> menaikkan status, dan alasannya
              ditulis di tabel status. Ini mencegah desa kecil dengan 1 kasus dan baseline 0
              terlihat selalu naik (rasio 99).
            </li>
            <li>
              Ambang rasio 1,5x dan 2x tidak diubah; yang ditambahkan hanya syarat kasus minimum.
            </li>
          </ul>
        </div>

        <div className="grid gap-4">
          <div className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Tren kasus harian (28 hari)</h3>
              <button
                type="button"
                onClick={klikPutar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {bermain ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {bermain ? "Berhenti" : "Putar animasi"}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Berdasarkan tanggal onset gejala; hanya kasus terverifikasi/terkonfirmasi. Area teal
              adalah total kasus, tiap garis warna satu penyakit. Tekan Putar animasi untuk melihat
              hari demi hari.
            </p>
            <div className="mt-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trenTampil}>
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
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h3 className="text-base font-semibold">Komposisi penyakit (7 hari)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Pembagian kasus 7 hari terakhir menurut jenis penyakitnya, yaitu berapa persen dari
              seluruh pelaporan yang berasal dari tiap penyakit.
            </p>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.komposisi}
                    dataKey="jumlah"
                    nameKey="penyakit"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    labelLine={false}
                    label={(props) => {
                      const persen = props.payload?.persen ?? 0;
                      return persen >= 6 ? `${persen}%` : "";
                    }}
                  >
                    {d.komposisi.map((p) => (
                      <Cell key={p.penyakit} fill={WARNA_PENYAKIT[p.penyakit]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TIP}
                    formatter={(value, name, item) => [
                      `${(item.payload as { persen?: number } | undefined)?.persen ?? 0}%`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {d.komposisi.map((p) => (
                <li key={p.penyakit} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: WARNA_PENYAKIT[p.penyakit] }}
                  />
                  <span>{p.penyakit}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.persen}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Users className="size-4 text-primary" /> Kelompok umur (7 hari)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Sebaran kasus 7 hari terakhir menurut rentang usia, dipecah per penyakit. Terlihat
              kelompok yang paling banyak terkena dan penyakit apa yang dominan di setiap kelompok.
            </p>
            <div className="mt-2 h-56">
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
                      {...(i === PENYAKIT.length - 1
                        ? { radius: [6, 6, 0, 0] as [number, number, number, number] }
                        : {})}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <LegendaSeri items={PENYAKIT.map((p) => ({ label: p, warna: WARNA_PENYAKIT[p] }))} />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel p-5">
            <AlatTabel
              baris={d.status}
              nama="status-desa-7-hari"
              rowKey={(s) => s.kode}
              judul={<h3 className="text-base font-semibold">Status per desa (7 hari terakhir)</h3>}
              keterangan={
                <p className="text-xs text-muted-foreground">
                  Status dihitung per penyakit memakai ambang penyakit itu sendiri (tabel
                  &ldquo;Sumber acuan ambang&rdquo; di bawah). Angka gabungan semua penyakit hanya
                  informasi konteks, bukan penentu status. Insidensi hanya dihitung bila jumlah
                  penduduk desa tersedia.
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
                  kunci: "pemicu",
                  judul: "Penyakit pemicu",
                  cari: (s) => s.penyakitPemicu ?? "",
                  nilai: (s) => s.penyakitPemicu ?? "-",
                },
                {
                  kunci: "kasus",
                  judul: "Kasus (penyakit pemicu)",
                  angka: true,
                  nilai: (s) => String(pemicu(s).mingguIni),
                },
                {
                  kunci: "baseline",
                  judul: "Baseline",
                  angka: true,
                  nilai: (s) => pemicu(s).rataBaseline.toFixed(1),
                },
                {
                  kunci: "rasio",
                  judul: "Rasio",
                  angka: true,
                  nilai: (s) => `${pemicu(s).rasio.toFixed(2)}x`,
                },
                {
                  kunci: "insidensi",
                  judul: "Insidensi/100k",
                  nilai: (s) => formatInsidensi(pemicu(s).insidensi),
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

      {/* ============ PANEL DAMPAK: KECEPATAN DETEKSI ============ */}
      <section className="space-y-4">
        <PanelDampak kasus={kasus} />
      </section>

      {/* ============ LAPIS 2: SKDR MINGGUAN PER PENYAKIT ============ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <h2 className="text-lg font-semibold">Agregat SKDR mingguan {TAHUN}</h2>
          <p className="text-xs text-muted-foreground">
            Satu kartu per penyakit &middot; {KECAMATAN.length} kecamatan &middot;{" "}
            {MINGGU_SKDR_TERAKHIR} minggu pertama (label &ldquo;{LABEL_RENTANG_SKDR}&rdquo;)
            &middot; angka antarpenyakit tidak dijumlahkan
          </p>
        </div>

        <div className="panel space-y-2 p-4">
          <p className="text-xs font-semibold">
            Cara membaca &ldquo;Mgg KLB&rdquo; dan &ldquo;Mgg Waspada&rdquo;
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[11px] text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Mgg KLB</span>: jumlah minggu dengan
              setidaknya satu kecamatan berstatus KLB.
            </li>
            <li>
              <span className="font-medium text-foreground">Mgg Waspada</span>: jumlah minggu dengan
              setidaknya satu kecamatan Waspada <strong>tidak ada</strong> kecamatan KLB di minggu
              yang sama.
            </li>
            <li>
              Karena itu keduanya tidak tumpang tindih, dan jumlah keduanya tidak pernah melebihi
              jumlah minggu dalam rentang. Di level kecamatan, status Waspada dan KLB tetap boleh
              berdampingan.
            </li>
            <li>
              <span className="font-medium text-foreground">Kec. KLB</span>: jumlah kecamatan yang
              menyentuh KLB di minggu mana pun dalam rentang {LABEL_RENTANG_SKDR}.
            </li>
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {perPenyakitSKDR.map((p) => (
            <KartuPenyakit key={p.penyakit} {...p} />
          ))}
        </div>

        <div className="panel p-5">
          <h3 className="text-base font-semibold">Perbandingan antar tahun, rentang minggu sama</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Kedua tahun dibandingkan pada minggu 1&ndash;{MINGGU_SKDR_TERAKHIR} saja. Kalau 2026
            dipakai 52 minggu sementara 2025 hanya 39, angka 2026 terlihat naik bukan karena ada
            epidemi, melainkan karena minggu yang dihitung lebih banyak.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Penyakit
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Kasus {TAHUN_SKDR[TAHUN_SKDR.length - 1]}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Kasus {TAHUN_SKDR[0]}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Selisih
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Mgg KLB
                  </th>
                </tr>
              </thead>
              <tbody>
                {barisBandingTahun.map((b) => (
                  <tr key={b.penyakit} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground">
                      {b.penyakit}
                    </th>
                    <td className="py-2 pr-3 text-right tabular-nums">{nf.format(b.kasusBaru)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                      {nf.format(b.kasusLama)}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums ${
                        b.selisih > 0
                          ? "text-destructive"
                          : b.selisih < 0
                            ? "text-success-text"
                            : "text-muted-foreground"
                      }`}
                    >
                      {b.selisih > 0 ? "+" : ""}
                      {nf.format(b.selisih)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {b.mingguKLBBaru} vs {b.mingguKLBLama}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kedua tahun berasal dari simulasi yang sama (src/data/skdr.ts), bukan dua sumber data
            berbeda. Angka kasus dan &ldquo;Mgg KLB&rdquo; sudah dipotong di minggu{" "}
            {MINGGU_SKDR_TERAKHIR} untuk kedua tahun.
          </p>
        </div>

        <div className="panel p-5">
          <h3 className="text-base font-semibold">Tren mingguan per penyakit</h3>
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
  /** minggu yang punya setidaknya satu kecamatan Waspada tanpa kecamatan KLB */
  mingguWaspada: number;
  /** kasus tertinggi dalam satu minggu, beserta kecamatan dan nomor mingguanya */
  puncak: { minggu: number; nama: string; jumlah: number; insidensi: number } | null;
  tertinggi: { nama: string; jumlah: number } | null;
}) {
  const a = AMBANG[penyakit];

  /** Skenario outbreak yang dirancang untuk penyakit ini, agar "Mgg KLB" berarti sesuatu. */
  const pekanOutbreak = SEMU_KEJADIAN.filter((x) => x.penyakit === penyakit && x.tahun === TAHUN)
    .map((x) => `${x.mingguDari}-${x.mingguSampai}`)
    .join(", ");
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
          <span className="ml-1 text-xs font-medium text-muted-foreground">
            kasus {LABEL_RENTANG_SKDR}
          </span>
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
          Puncak mingguan (per kecamatan):{" "}
          <span className="font-medium text-foreground">{nf.format(puncak.jumlah)} kasus</span> di{" "}
          {puncak.nama}, minggu {puncak.minggu} ({puncak.insidensi.toFixed(0)}/100k/mgg)
        </p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Status dinilai per minggu, bukan dari rata-rata setahun. Rata-rata
        {` ${insidensi.toFixed(1)}`}/100k/mgg sengaja tidak dipakai untuk menetapkan KLB.
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Angka {penyakit} di kartu ini hasil simulasi, bukan laporan. Puncaknya berasal dari skenario
        outbreak yang memang dirancang agar ambang terlihat bekerja
        {pekanOutbreak ? ` (minggu ${pekanOutbreak})` : ""}; minggu lain sengaja dibuat tenang
        supaya &ldquo;Mgg KLB&rdquo; berarti sesuatu.
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

/** Legenda titik warna kecil yang dipakai di bawah grafik tren dan umur.
 *  Rata kiri dan sejajar dengan area plot grafik supaya enak dibaca. */
function LegendaSeri({ items }: { items: { label: string; warna: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 pl-[65px]">
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
        <p className="text-[11px] text-muted-foreground">Kasus per minggu, total kabupaten</p>
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
      <p className="mt-1 pl-[42px] text-[11px] text-muted-foreground">
        Grafik: total kasus seluruh kecamatan (kabupaten). Status:{" "}
        {titik.filter((t) => t.level === "KLB").length} minggu dengan minimal satu kecamatan
        berstatus KLB
        {a.insidensiMin > 0 ? ` (${a.insidensiMin}/100k/mgg per kecamatan)` : ""} &middot; puncak
        mingguan kabupaten {nf.format(titik.reduce((m, t) => Math.max(m, t.jumlah), 0))} kasus
      </p>
    </div>
  );
}

// Dipakai ulang supaya halaman ringkasan statistik bisa memanggilnya tanpa
// menyalin rumus ringkasan ke route lain.
export { ringkasan };
