import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ClipboardCopy,
  HeartPulse,
  Info,
  Loader2,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/StatCard";
import type { Kasus } from "@/data/dataset";
import { useSurveilans } from "@/lib/store";
import { analisisNaratif, tanyaKesehatan, type ModeAnalisis } from "@/lib/ai.functions";
import { ringkasanUntukAI } from "@/lib/analitik";

export const Route = createFileRoute("/analisis")({
  head: () => ({
    meta: [
      { title: "Tanya AI | SIDINI" },
      {
        name: "description",
        content:
          "Tanyakan hal apa pun soal kondisi kesehatan masyarakat atau data surveilans Kabupaten Bandung, dan dapatkan jawaban dari data terbaru.",
      },
      { property: "og:title", content: "Tanya AI | SIDINI" },
      {
        property: "og:description",
        content:
          "AI menjawab pertanyaan Anda berdasarkan ringkasan data surveilans terbaru, dengan bahasa yang mudah dipahami.",
      },
    ],
  }),
  component: Analisis,
});

const MODE: Record<
  ModeAnalisis,
  { label: string; ikon: typeof Users; ringkas: string; detail: string }
> = {
  warga: {
    label: "Warga",
    ikon: Users,
    ringkas: "Bahasa sehari-hari",
    detail:
      "Tanpa istilah teknis. Angka ditulis sebagai perbandingan yang mudah dipahami, misalnya “tiga kali lipat dari minggu biasa”, bukan “rasio 3,0x baseline”.",
  },
  petugas: {
    label: "Petugas",
    ikon: Stethoscope,
    ringkas: "Istilah epidemiologi",
    detail:
      "Untuk petugas surveilans dan Dinkes. Memakai istilah resmi seperti baseline, insidensi per 100.000 penduduk, dan rekomendasi aksi 72 jam.",
  },
};

const CONTOH: Record<ModeAnalisis, string[]> = {
  warga: [
    "Apa yang terjadi di desa saya?",
    "Apakah aman untuk anak-anak?",
    "Apa yang harus saya lakukan sekarang?",
    "Mengapa jumlah kasus naik?",
  ],
  petugas: [
    "Desa mana yang perlu intervensi 72 jam ke depan?",
    "Apa indikasi penyebab lonjakan kasus?",
    "Bagaimana tren insidensi dibanding minggu sebelumnya?",
    "Desa mana yang paling perlu diwaspadai?",
  ],
};

/** `kasusDipakai` = berapa kasus dari peramban yang dipakai server. */
type Hasil = {
  teks: string;
  model: string;
  mode: ModeAnalisis;
  kasusDipakai?: number;
};

function Analisis() {
  const { kasus } = useSurveilans();
  const [mode, setMode] = useState<ModeAnalisis>("warga");
  const [pertanyaan, setPertanyaan] = useState("");
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  const ringkasan = useMemo(() => ringkasanUntukAI(kasus), [kasus]);

  const pilihMode = (m: ModeAnalisis) => {
    setMode(m);
    setHasil(null);
    setGalat(null);
  };

  const jalankan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMemuat(true);
    setGalat(null);
    try {
      // Yang dikirim ke server hanya kasus yang ditambahkan di peramban ini
      // (prefiks BB-U). Dataset bawaan (BB-00001) sudah ada di server, jadi
      // tidak perlu dikirim dua kali.
      //
      // Server menghitung ulang ringkasannya sendiri. Sebelumnya peramban
      // mengirim ringkasan siap pakai sebagai teks, sehingga angka di prompt
      // tidak bisa diverifikasi dan teks peramban punya jalur langsung ke
      // prompt model.
      const tambahan = kasus.filter((k) => k.id.startsWith("BB-U"));
      const data: {
        kasusTambahan: Kasus[];
        pertanyaan?: string;
        mode: ModeAnalisis;
      } = { kasusTambahan: tambahan, mode };
      const tanya = pertanyaan.trim();
      if (tanya) data.pertanyaan = tanya;

      const res = await analisisNaratif({ data });
      if (res.ok) {
        setHasil({
          teks: res.teks,
          model: res.model,
          mode,
          kasusDipakai: res.kasusDipakai,
        });
      } else {
        setGalat(res.error);
        setHasil(null);
      }
    } catch (err) {
      setGalat(
        err instanceof Error
          ? `Tidak dapat menghubungi server analisis: ${err.message}`
          : "Tidak dapat menghubungi server analisis.",
      );
      setHasil(null);
    } finally {
      setMemuat(false);
    }
  };

  const salin = async () => {
    if (!hasil) return;
    try {
      await navigator.clipboard.writeText(hasil.teks);
      toast.success("Analisis disalin ke papan klip.");
    } catch {
      toast.error("Peramban menolak akses papan klip.");
    }
  };

  const delta = ringkasan.kasus7HariSebelumnya
    ? Math.round(
        ((ringkasan.kasus7HariTerakhir - ringkasan.kasus7HariSebelumnya) /
          ringkasan.kasus7HariSebelumnya) *
          100,
      )
    : 0;
  const jumlahSinyal = ringkasan.statusDesa.filter((d) => d.level === "Sinyal").length;
  const jumlahWaspada = ringkasan.statusDesa.filter((d) => d.level === "Waspada").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Tanya AI</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          Tanyakan, jawabannya dari data surveilans
        </h1>
        <p className="mt-2 max-w-3xl text-justify text-sm text-muted-foreground">
          Data dashboard sulit dipahami? Ajukan pertanyaan langsung, seperti desa yang perlu
          diwaspadai atau penyebab kasus naik. AI menjawab dengan data surveilans terbaru. Pilih
          mode pembaca agar gaya bahasanya sesuai dengan kebutuhan Anda.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Kasus 7 hari terakhir"
          nilai={ringkasan.kasus7HariTerakhir}
          keterangan={`${delta >= 0 ? "+" : ""}${delta}% dibanding 7 hari sebelumnya (${ringkasan.kasus7HariSebelumnya} kasus)`}
          nada={delta > 25 ? "bahaya" : delta > 0 ? "waspada" : "baik"}
        />
        <StatCard
          icon={ShieldCheck}
          label="Desa berstatus sinyal"
          nilai={jumlahSinyal}
          satuan={`/ ${ringkasan.statusDesa.length} desa`}
          keterangan={
            jumlahSinyal ? "Dugaan KLB, perlu tindakan segera" : "Tidak ada ambang terlampaui"
          }
          nada={jumlahSinyal ? "bahaya" : "baik"}
        />
        <StatCard
          icon={Info}
          label="Desa waspada"
          nilai={jumlahWaspada}
          keterangan="Kenaikan kasus, belum melewati ambang bahaya"
          nada={jumlahWaspada ? "waspada" : "baik"}
        />
        <StatCard
          icon={MessageCircleQuestion}
          label="Laporan warga menunggu"
          nilai={ringkasan.laporanWargaMenungguVerifikasi}
          keterangan="Belum dihitung sebagai kasus resmi"
          nada={ringkasan.laporanWargaMenungguVerifikasi > 20 ? "waspada" : "netral"}
        />
      </div>

      <section className="panel space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">1. Pilih mode pembaca</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mode menentukan kosakata AI, bukan datanya. Angka yang dianalisis sama persis.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(MODE) as ModeAnalisis[]).map((m) => {
            const cfg = MODE[m];
            const Ikon = cfg.ikon;
            const aktif = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => pilihMode(m)}
                aria-pressed={aktif}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  aktif ? "border-primary bg-primary/15" : "border-border hover:bg-secondary"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    aktif ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Ikon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold">{cfg.label}</span>
                    <span className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {cfg.ringkas}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{cfg.detail}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="pertanyaan" className="mb-2 block text-sm font-medium">
            2. Pertanyaan khusus (opsional)
          </label>
          <textarea
            id="pertanyaan"
            value={pertanyaan}
            maxLength={500}
            onChange={(e) => setPertanyaan(e.target.value)}
            rows={3}
            placeholder={
              mode === "warga"
                ? "Contoh: Apakah anak saya boleh tetap sekolah seperti biasa?"
                : "Contoh: Desa mana yang perlu respons lapangan dalam 24 jam ke depan?"
            }
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {CONTOH[mode].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPertanyaan(c)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {c}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{pertanyaan.length}/500</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void jalankan()}
            disabled={memuat}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {memuat ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {memuat ? "AI sedang menjawab…" : "Tanyakan"}
          </button>
        </div>
      </section>

      {galat && (
        <div className="panel border-destructive/50 bg-destructive/10 p-4 sm:p-5" role="alert">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-destructive">
            Analisis gagal
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{galat}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Untuk mode demo lokal, isi kunci API di berkas <code className="font-mono">.env</code>{" "}
            lalu jalankan ulang server:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background/50 p-3 font-mono text-[11px] text-muted-foreground">
            {`GROQ_API_KEY=gsk_...\nGROQ_MODEL=openai/gpt-oss-120b`}
          </pre>
        </div>
      )}

      {memuat && !hasil && (
        <div className="panel space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Menyusun jawaban untuk mode {MODE[mode].label} dari data {ringkasan.statusDesa.length}{" "}
            desa…
          </div>
          {[70, 45, 90, 35].map((w, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-secondary" />
              <div className="h-3 animate-pulse rounded bg-secondary" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}

      {hasil && !memuat && (
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-secondary/40 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <h2 className="font-display text-base font-bold">Jawaban</h2>
              <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                Mode {MODE[hasil.mode].label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{hasil.model}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void salin()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <ClipboardCopy className="size-3.5" /> Salin
              </button>
              <button
                type="button"
                onClick={() => void jalankan()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
              >
                <Sparkles className="size-3.5" /> Buat ulang
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <Narasi teks={hasil.teks} />
          </div>

          <p className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
            Narasi ini dibuat AI dan perlu diverifikasi petugas sebelum dipakai sebagai dasar
            keputusan. Ringkasan yang dibaca model dihitung ulang di server dari kasus yang
            divalidasi
            {hasil.kasusDipakai
              ? ` (${hasil.kasusDipakai} kasus tambahan dari peramban ini ikut dihitung)`
              : ""}
            , bukan teks yang dikirim peramban, sehingga angka di dalam narasi tidak bisa diubah
            dari sisi peramban.
          </p>
        </section>
      )}

      <KotakTanyaKesehatan />
    </div>
  );
}

const CONTOH_TANYA = [
  "Anak saya demam tiga hari, tidak mau makan. Kira-kira kenapa ya?",
  "Batuk anak saya sudah seminggu, kadang ada sesak napas. Perlu ke dokter?",
  "Ibu saya pusing, mual, dan berat badan turun cepat.",
  "Anak saya demam dan ada ruam merah. Apakah ini bahaya?",
];

const BATAS_PANJANG = 1000;

/**
 * Kotak tanya kesehatan. Sengaja dipisah dari analisis surveilans di atas:
 * Pertanyaannya berbeda jenis -- satu soal orang, satu soal wilayah -- dan
 * keduanya memakai prompt yang berbeda di server.
 *
 * Yang ditonjolkan di sini adalah batasnya, bukan fiturnya. Jawaban AI
 * tentang kesehatan tidak boleh diperlakukan sebagai diagnosis, jadi
 * peringatan untuk berobat ke fasilitas kesehatan ditampilkan selalu, bukan
 * hanya kalau AI kebetulan menyebutkannya.
 */
function KotakTanyaKesehatan() {
  const [pertanyaan, setPertanyaan] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ teks: string; model: string } | null>(null);

  const kirim = async () => {
    const t = pertanyaan.trim();
    if (t.length < 3) {
      setGalat("Tuliskan keluhan lebih dulu, minimal tiga huruf.");
      return;
    }
    setMemuat(true);
    setGalat(null);
    setHasil(null);
    try {
      const res = await tanyaKesehatan({ data: { pertanyaan: t } });
      if (res.ok) setHasil({ teks: res.teks, model: res.model });
      else setGalat(res.error);
    } catch {
      setGalat("Tidak bisa menghubungi server. Coba lagi sebentar.");
    } finally {
      setMemuat(false);
    }
  };

  return (
    <section className="panel space-y-4 p-5 sm:p-6" aria-label="Tanya kesehatan">
      <div className="flex items-start gap-3">
        <HeartPulse className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Tanya soal kesehatan</h2>
          <div className="mt-1 space-y-1 text-justify text-xs text-muted-foreground">
            <p>
              Tuliskan keluhan orang yang Anda pedulikan, lalu AI akan menjelaskan tanda bahaya yang
              perlu diperhatikan, apa yang bisa dilakukan di rumah, dan ke mana harus pergi.
            </p>
            <p>Bahasa sehari-hari, tanpa istilah medis.</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-warning-text">Ini bukan diagnosa.</span>
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="tanya-kesehatan" className="block text-sm font-medium">
          Keluhan
        </label>
        <textarea
          id="tanya-kesehatan"
          value={pertanyaan}
          onChange={(e) => setPertanyaan(e.target.value.slice(0, BATAS_PANJANG))}
          rows={3}
          placeholder="Contoh: anak saya demam tiga hari, tidak mau makan. Kira-kira kenapa ya?"
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {CONTOH_TANYA.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPertanyaan(c)}
                className="max-w-full truncate rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {pertanyaan.length}/{BATAS_PANJANG}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void kirim()}
          disabled={memuat}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {memuat ? <Loader2 className="size-4 animate-spin" /> : <HeartPulse className="size-4" />}
          {memuat ? "AI sedang menjawab…" : "Tanyakan"}
        </button>
        <p className="text-xs text-muted-foreground">
          Hanya keluhan yang Anda ketik yang dikirim. Jangan sertakan nama, alamat, atau nomor
          telepon.
        </p>
      </div>

      {galat ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3" role="alert">
          <p className="text-sm font-semibold text-destructive">Gagal menjawab</p>
          <p className="mt-1 text-xs text-muted-foreground">{galat}</p>
        </div>
      ) : null}

      {memuat ? (
        <div className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Menyusun jawaban…
        </div>
      ) : null}

      {hasil ? (
        <section className="overflow-hidden rounded-xl border border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-secondary/40 px-4 py-3">
            <BookOpen className="size-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Penjelasan</h3>
            <span className="font-mono text-[10px] text-muted-foreground">{hasil.model}</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(hasil.teks)
                  .then(() => toast.success("Tersalin"))
                  .catch(() => toast.error("Tidak bisa menyalin"));
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-secondary"
            >
              <ClipboardCopy className="size-3.5" aria-hidden /> Salin
            </button>
          </div>
          <div className="p-4">
            <Narasi teks={hasil.teks} />
          </div>
          <p className="border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
            Penjelasan ini dibuat AI dan bukan hasil pemeriksaan dokter. Yang menentukan tindakan
            berikutnya adalah petugas puskesmas yang memeriksa langsung.
          </p>
        </section>
      ) : null}
    </section>
  );
}
/**
 * Render markdown sederhana (judul tebal, daftar bernomor, paragraf) tanpa
 * dependensi tambahan. Teks tetap keluar sebagai elemen React, jadi tidak ada
 * HTML mentah dari LLM yang dieksekusi.
 */
function Narasi({ teks }: { teks: string }) {
  const blok = teks
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.split("\n").filter((x) => x.trim().length > 0))
    .filter((b) => b.length > 0);

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {blok.flatMap((baris, bi) =>
        tokenisasi(baris).map((tk, ti) => <Potongan key={`${bi}-${ti}`} tk={tk} />),
      )}
    </div>
  );
}

type Token =
  | { t: "judul"; s: string }
  | { t: "paragraf"; s: string }
  | { t: "butir"; items: string[] }
  | { t: "nomor"; items: string[] };

/**
 * Ubah satu blok baris markdown menjadi daftar token. Menangani judul `**tebal**`
 * (dapat diikuti teks pada baris yang sama), daftar berpoin `-` / `*` / `•`, daftar
 * bernomor `1.`, dan paragraf biasa.
 */
function tokenisasi(baris: string[]): Token[] {
  const out: Token[] = [];
  let paragraf: string[] = [];
  let butir: string[] = [];
  let nomor: string[] = [];

  const flushParagraf = () => {
    if (paragraf.length) out.push({ t: "paragraf", s: paragraf.join(" ") });
    paragraf = [];
  };
  const flushButir = () => {
    if (butir.length) out.push({ t: "butir", items: butir });
    butir = [];
  };
  const flushNomor = () => {
    if (nomor.length) out.push({ t: "nomor", items: nomor });
    nomor = [];
  };
  const flushSemua = () => {
    flushParagraf();
    flushButir();
    flushNomor();
  };

  for (const asli of baris) {
    const x = asli.trim();

    const judul = /^\*\*(.+?)\*\*\s*(.*)$/.exec(x);
    if (judul) {
      flushSemua();
      out.push({ t: "judul", s: (judul[1] ?? "").trim() });
      const sisa = (judul[2] ?? "").trim();
      if (sisa) paragraf.push(sisa);
      continue;
    }

    const mButir = /^[-*•]\s+(.*)$/.exec(x);
    if (mButir) {
      flushParagraf();
      flushNomor();
      butir.push(mButir[1] ?? "");
      continue;
    }

    const mNomor = /^\d+[.)]\s+(.*)$/.exec(x);
    if (mNomor) {
      flushParagraf();
      flushButir();
      nomor.push(mNomor[1] ?? "");
      continue;
    }

    flushButir();
    flushNomor();
    paragraf.push(x);
  }

  flushSemua();
  return out;
}

function Potongan({ tk }: { tk: Token }) {
  if (tk.t === "judul") {
    return <h3 className="pt-1 text-base font-semibold text-foreground">{tebal(tk.s, "h")}</h3>;
  }

  if (tk.t === "paragraf") {
    return <p className="text-muted-foreground">{tebal(tk.s, "p")}</p>;
  }

  if (tk.t === "butir") {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
        {tk.items.map((item, i) => (
          <li key={i}>{tebal(item, `b${i}`)}</li>
        ))}
      </ul>
    );
  }

  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
      {tk.items.map((item, i) => (
        <li key={i}>{tebal(item, `n${i}`)}</li>
      ))}
    </ol>
  );
}

/** Pecah **tebal** menjadi elemen <strong>. */
function tebal(teks: string, kunci: string) {
  return teks
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((bagian) => bagian.length > 0)
    .map((bagian, i) => {
      if (bagian.startsWith("**") && bagian.endsWith("**") && bagian.length > 4) {
        return (
          <strong key={`${kunci}-${i}`} className="font-semibold text-foreground">
            {bagian.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${kunci}-${i}`}>{bagian}</span>;
    });
}
