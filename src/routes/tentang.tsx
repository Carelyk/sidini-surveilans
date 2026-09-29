import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Cpu,
  Database,
  FileCode2,
  FlaskConical,
  Lock,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/tentang")({
  head: () => ({
    meta: [
      { title: "Konsep Sistem | SIDINI" },
      {
        name: "description",
        content:
          "Penjelasan konsep SIDINI: masalah, alur data, peran AI naratif, batas etika, dan cara menjalankan.",
      },
      { property: "og:title", content: "Konsep Sistem | SIDINI" },
      {
        property: "og:description",
        content: "Dari pelaporan reaktif menjadi peringatan dini:wabah.",
      },
    ],
  }),
  component: Tentang,
});

function Tentang() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Konsep</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          Dari pelaporan reaktif menjadi peringatan dini
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Prototipe sistem peringatan dini wabah untuk Kabupaten Bandung, Jawa Barat. Wilayah,
          batas, dan jumlah penduduk memakai data resmi; angka kasus penyakit tetap sintetis untuk
          keperluan studi kasus.
        </p>
      </header>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-warning-text" /> Masalah
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Pelaporan penyakit datang terlambat. Petugas baru tahu masalah ketika sudah banyak
            kasus.
          </li>
          <li>
            Data datang dari dua kanal dengan kualitas berbeda: puskesmas (terverifikasi) dan warga
            (banyak laporan palsu, dan duplikat).
          </li>
          <li>
            Petugas dan warga sama-sama kesulitan membaca angka surveilans. Angka mentah tidak
            otomatis menjadi keputusan.
          </li>
        </ul>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Network className="size-4 text-primary" /> Alur sistem
        </h2>
        <div className="mt-4 space-y-3">
          {[
            {
              n: "1",
              j: "Pelaporan",
              t: "Puskesmas mengirim kasus terkonfirmasi lewat form 6 kolom. Warga mengirim laporan gejala tanpa nama lewat kanal warga.",
            },
            {
              n: "2",
              j: "Verifikasi",
              t: "Laporan warga masuk antrean triase. Petugas menyetujui,yelidiki, atau menolak. Laporan yang belum terverifikasi tidak dihitung sebagai kasus.",
            },
            {
              n: "3",
              j: "Ambang otomatis",
              t: "Sistem menghitung baseline 3 minggu, rasio, dan insidensi per 100.000 penduduk. Desa yang melewati ambang ditandai KLB atau Waspada.",
            },
            {
              n: "4",
              j: "Narasi AI",
              t: "Angka agregat dikirim ke Groq LLM dan diubah menjadi penjelasan. Dua mode baca: warga (bahasa sehari-hari) dan petugas (istilah epidemiologi).",
            },
          ].map((s) => (
            <div key={s.n} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold">{s.j}</p>
                <p className="text-sm text-muted-foreground">{s.t}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Cpu className="size-4 text-primary" /> Peran AI
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-success/40 bg-success/10 p-4">
            <p className="text-sm font-semibold text-success-text">AI melakukan</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Mengubah angka tabel menjadi cerita yang bisa dibaca orang awam.</li>
              <li>Menyesuaikan tingkat bahasa sesuai pembaca (warga atau petugas).</li>
              <li>Merangkum rekomendasi tindakan 72 jam per desa.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">AI tidak melakukan</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Menentukan ambang KLB. Ambang dihitung sistem, bukan AI.</li>
              <li>Menggantikan verifikasi petugas.</li>
              <li>Menampilkan identitas individu.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Lock className="size-4 text-primary" /> Privasi dan batas
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">UU PDP No. 27/2022.</strong> Nama pelapor tidak
            diminta. Kanal warga hanya menyimpan kode desa, bukan alamat lengkap.
          </li>
          <li>
            <strong className="text-foreground">Agregat untuk publik.</strong> Dashboard, peta, dan
            analisis AI hanya memakai angka agregat per desa. Data individual hanya untuk petugas.
          </li>
          <li>
            <strong className="text-foreground">Jangan mengarang angka.</strong> Prompt AI melarang
            angka di luar data. Angka pada hasil narasi tetap merujuk ringkasan data.
          </li>
          <li>
            <strong className="text-foreground">Verifikasi manusia.</strong> Narasi AI adalah bahan
            awal; keputusan tetap diambil petugas.
          </li>
        </ul>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Database className="size-4 text-primary" /> Data
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Seluruh data di prototipe ini sintetis dan dibuat dengan PRNG deterministik (seed tetap)
          agar hasil demo konsisten. Struktur variabel meniru dataset surveilans Indonesia yang umum
          dipublikasikan, tetapi tidak ada baris yang berasal dari dataset Kaggle asli. Hanya
          tanggal acuan yang tetap sehingga tren 42 hari dapat direproduksi.
        </p>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FlaskConical className="size-4 text-primary" /> Menjalankan
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Salin berkas contoh env lalu isi kunci API Groq.</li>
          <li>Pasang dependensi dan jalankan server pengembangan.</li>
          <li>Buka halaman Tanya AI dan tekan tombol Tanyakan.</li>
        </ol>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background/50 p-3 font-mono text-[11px] text-muted-foreground">
          {`cp .env.example .env\nnpm install\nnpm run dev`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Tanpa kunci API, halaman lain tetap berfungsi. Hanya fitur analisis AI yang menampilkan
          pesan kunci belum tersedia.
        </p>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileCode2 className="size-4 text-primary" /> Teknologi
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            "TanStack Start (SSR + file routing)",
            "React 19",
            "TypeScript strict",
            "Tailwind CSS 4 (token oklch)",
            "Recharts",
            "Zod",
            "Groq LLM API",
            "Lucide icons",
          ].map((t) => (
            <li
              key={t}
              className="rounded-full border border-border bg-secondary px-3 py-1.5 text-muted-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-success-text" />
          Seluruh data kasus bersifat sintetis. Prototipe studi kasus.
        </div>
        <Link
          to="/analisis"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Users className="size-4" /> Coba analisis AI <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
