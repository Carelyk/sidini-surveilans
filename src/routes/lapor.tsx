import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Lock, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { useSurveilans } from "@/lib/store";
import {
  DESA,
  GEJALA_UMUM,
  KELOMPOK_UMUR,
  NAMA_KELOMPOK_UMUR,
  TANGGAL_ACUAN,
  type KelompokUmur,
} from "@/data/dataset";
import { formatTanggal } from "@/data/kronologi";
import { onsetTerawal, validasiOnset } from "@/lib/formulir";

export const Route = createFileRoute("/lapor")({
  head: () => ({
    meta: [
      { title: "Lapor Gejala (Kanal Warga) | SIDINI" },
      {
        name: "description",
        content:
          "Formulir contoh pelaporan gejala warga: singkat, tanpa nama, dan diverifikasi petugas sebelum dihitung sebagai kasus. Pada prototipe laporan hanya tersimpan di peramban.",
      },
      { property: "og:title", content: "Lapor Gejala (Kanal Warga) | SIDINI" },
      {
        property: "og:description",
        content: "Laporkan demam, diare, atau kluster keluhan di keluarga Anda dalam 1 menit.",
      },
    ],
  }),
  component: LaporWarga,
});

function LaporWarga() {
  const { tambah } = useSurveilans();
  const [kodeDesa, setKodeDesa] = useState(DESA[0]!.kode);
  const [umur, setUmur] = useState<KelompokUmur>("10-18");
  const [gejala, setGejala] = useState<string[]>([]);
  const [onset, setOnset] = useState(TANGGAL_ACUAN);
  const [kluster, setKluster] = useState(false);
  const [kontak, setKontak] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [terkirim, setTerkirim] = useState<string | null>(null);

  const toggle = (g: string) =>
    setGejala((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    if (gejala.length === 0) {
      toast.error("Pilih minimal satu gejala yang dirasakan.");
      return;
    }
    if (!setuju) {
      toast.error("Mohon setujui pemberitahuan privasi terlebih dahulu.");
      return;
    }
    const onsetValidasi = validasiOnset(onset);
    if (!onsetValidasi.ok) {
      toast.error(onsetValidasi.pesan);
      return;
    }
    const desa = DESA.find((d) => d.kode === kodeDesa)!;
    const dugaan = gejala.includes("Mata kuning")
      ? "Hepatitis A"
      : gejala.includes("Nyeri sendi")
        ? "Chikungunya"
        : gejala.includes("Diare")
          ? "Diare"
          : "DBD";

    const baru = tambah({
      penyakit: dugaan,
      tanggalOnset: onset,
      tanggalLapor: TANGGAL_ACUAN,
      puskesmas: desa.puskesmas,
      kodeDesa: desa.kode,
      desa: desa.nama,
      kecamatan: desa.kecamatan,
      kelompokUmur: umur,
      jenisKelamin: "P",
      status: "Baru",
      sumber: "Warga",
      gejala,
      catatan: [
        kluster ? "Ada anggota keluarga lain dengan keluhan sama" : "",
        kontak ? "Kontak tersedia" : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
    setTerkirim(baru.id);
    toast.success("Terima kasih sudah mengirim laporan.");
    setGejala([]);
    setKluster(false);
    setKontak("");
    setSetuju(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Kanal warga</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Lapor gejala dari rumah</h1>
        <p className="mt-2 max-w-2xl text-justify text-sm text-muted-foreground">
          Formulir contoh untuk prototipe: laporan yang Anda kirim hanya tersimpan di peramban
          perangkat ini, bukan terkirim ke puskesmas mana pun.
        </p>
        <p className="mt-2 max-w-2xl text-justify text-sm text-muted-foreground">
          Cukup 5 pertanyaan, tanpa perlu menyebut nama. Laporan Anda masuk ke antrean verifikasi
          petugas puskesmas dan baru dihitung sebagai kasus setelah diverifikasi, sehingga laporan
          yang belum diperiksa tidak ikut terhitung di dashboard.
        </p>
      </header>

      {terkirim && (
        <div className="panel flex items-start gap-3 border-success/40 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 text-success-text" />
          <div className="text-sm">
            <p className="font-semibold text-success-text">
              Terima kasih, laporan Anda sudah kami terima.
            </p>
            <p className="text-justify text-muted-foreground">
              Laporan sedang menunggu verifikasi petugas puskesmas. Statusnya{" "}
              <strong>Menunggu verifikasi</strong> dan belum dihitung sebagai kasus, sehingga
              laporan yang belum diperiksa tidak ikut masuk ke dashboard. Jika diperlukan, petugas
              akan menghubungi Anda.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={kirim} className="panel space-y-5 p-5 sm:p-6">
          <Field label="1. Desa / kelurahan tempat tinggal">
            <select
              value={kodeDesa}
              onChange={(e) => setKodeDesa(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {DESA.map((d) => (
                <option key={d.kode} value={d.kode}>
                  {d.nama} · Kec. {d.kecamatan}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Kami hanya menyimpan kode desa, bukan alamat lengkap Anda.
            </p>
          </Field>

          <Field label="2. Gejala yang dirasakan (boleh lebih dari satu)">
            <div className="flex flex-wrap gap-2">
              {GEJALA_UMUM.map((g) => {
                const aktif = gejala.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggle(g)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      aktif
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="3. Sejak tanggal berapa?">
              <input
                type="date"
                value={onset}
                required
                min={onsetTerawal()}
                max={TANGGAL_ACUAN}
                onChange={(e) => setOnset(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Wajib diisi, antara {formatTanggal(onsetTerawal())} dan{" "}
                {formatTanggal(TANGGAL_ACUAN)}.
              </p>
            </Field>
            <Field label="4. Kelompok umur penderita">
              <select
                value={umur}
                onChange={(e) => setUmur(e.target.value as KelompokUmur)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {KELOMPOK_UMUR.map((u) => (
                  <option key={u} value={u}>
                    {NAMA_KELOMPOK_UMUR[u]} · {u === "60+" ? "60 tahun ke atas" : `${u} tahun`}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="5. Apakah ada anggota keluarga/tetangga dengan keluhan yang sama?">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={kluster}
                onChange={(e) => setKluster(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              Ya, ada lebih dari satu orang dengan keluhan serupa
            </label>
          </Field>

          <Field label="Nomor WhatsApp (opsional) - tidak disimpan (simulasi)">
            <input
              value={kontak}
              onChange={(e) => setKontak(e.target.value)}
              placeholder='08xx - prototipe hanya menyimpan penanda "kontak tersedia"'
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-justify text-[11px] text-muted-foreground">
              Nomor yang diketik tidak disimpan, laporan hanya diberi catatan &quot;kontak
              tersedia&quot;. Pada sistem sungguhan nomor kontak adalah data pribadi spesifik yang
              perlu dasar hukum, enkripsi saat transit, dan penghapusan setelah verifikasi selesai.
            </p>
          </Field>

          <label className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={setuju}
              onChange={(e) => setSetuju(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-primary)]"
            />
            <span className="text-justify">
              Saya memahami data kesehatan ini bersifat pribadi spesifik dan dalam sistem sungguhan
              hanya digunakan petugas surveilans untuk verifikasi serta respons wabah, sesuai UU PDP
              No. 27/2022. Pada prototipe ini laporan hanya tersimpan di peramban perangkat ini dan
              tidak dikirim ke server mana pun.
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kirim laporan
          </button>
        </form>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Lock className="size-4 text-primary" /> Privasi Anda
            </h2>
            <ul className="mt-3 space-y-2 text-justify text-sm text-muted-foreground">
              <li>Nama tidak pernah diminta dalam formulir ini.</li>
              <li>
                Nomor kontak bersifat opsional, tetapi prototipe tidak menyimpannya: laporan hanya
                diberi penanda &quot;kontak tersedia&quot;.
              </li>
              <li>
                Laporan menyimpan kode desa, bukan alamat lengkap atau titik GPS pelapor. Peta
                memakai titik tengah desa.
              </li>
              <li>
                Rincian per kasus dapat dibuka siapa pun: prototipe tidak memakai autentikasi maupun
                peran pengguna. Grafik dan peta hanya menampilkan agregat per desa.
              </li>
            </ul>
          </div>

          <div className="panel p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <WifiOff className="size-4 text-warning-text" /> Sinyal lemah?
            </h2>
            <p className="mt-2 text-justify text-sm text-muted-foreground">
              Pada prototipe ini laporan langsung tersimpan di penyimpanan peramban perangkat Anda
              setelah tombol ditekan. Belum ada mode luring, draf otomatis, maupun pengiriman ulang
              saat jaringan kembali, dan belum ada alternatif SMS/USSD. Untuk sistem sungguhan, PWA
              dan antrean pengiriman per perangkat adalah pekerjaan terpisah.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}
