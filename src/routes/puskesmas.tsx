import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Stethoscope, Timer, Zap } from "lucide-react";
import { toast } from "sonner";

import { useSurveilans } from "@/lib/store";
import {
  DESA,
  KELOMPOK_UMUR,
  PENYAKIT,
  TANGGAL_ACUAN,
  type KelompokUmur,
  type Penyakit,
} from "@/data/dataset";
import { formatTanggal } from "@/data/kronologi";
import { hitungDalamRentang, kasusValid } from "@/lib/analitik";
import {
  BATAS_JUMLAH_KASUS,
  jumlahKasusTersimpan,
  onsetTerawal,
  validasiOnset,
} from "@/lib/formulir";

export const Route = createFileRoute("/puskesmas")({
  head: () => ({
    meta: [
      { title: "Input Kasus Puskesmas (Real-time) | SIDINI" },
      {
        name: "description",
        content:
          "Form input kasus terkonfirmasi puskesmas dengan 6 kolom minimum agar laporan cepat namun tetap berguna secara spasial.",
      },
      { property: "og:title", content: "Input Kasus Puskesmas (Real-time) | SIDINI" },
      {
        property: "og:description",
        content: "Pelaporan kasus terkonfirmasi kurang dari 30 detik, langsung masuk dashboard.",
      },
    ],
  }),
  component: InputPuskesmas,
});

function InputPuskesmas() {
  const { kasus, tambah } = useSurveilans();
  const [penyakit, setPenyakit] = useState<Penyakit>("DBD");
  const [kodeDesa, setKodeDesa] = useState(DESA[0]!.kode);
  const [onset, setOnset] = useState(TANGGAL_ACUAN);
  const [umur, setUmur] = useState<KelompokUmur>("5-14");
  const [jk, setJk] = useState<"L" | "P">("L");
  const [jumlah, setJumlah] = useState(1);

  const hariIni = useMemo(() => hitungDalamRentang(kasusValid(kasus), 1).length, [kasus]);

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    const desa = DESA.find((d) => d.kode === kodeDesa)!;
    const onsetValidasi = validasiOnset(onset);
    if (!onsetValidasi.ok) {
      toast.error(onsetValidasi.pesan);
      return;
    }
    // Angka yang dipakai untuk menyimpan sekaligus untuk pesan toast. Kalau
    // toast memakai nilai mentah dari input, petugas bisa melihat "50 kasus
    // masuk" padahal yang tersimpan hanya 20.
    const tersimpan = jumlahKasusTersimpan(jumlah);
    for (let i = 0; i < tersimpan; i++) {
      tambah({
        penyakit,
        tanggalOnset: onset,
        tanggalLapor: TANGGAL_ACUAN,
        puskesmas: desa.puskesmas,
        kodeDesa: desa.kode,
        desa: desa.nama,
        kecamatan: desa.kecamatan,
        kelompokUmur: umur,
        jenisKelamin: jk,
        status: "Terverifikasi",
        sumber: "Puskesmas",
        gejala: [],
      });
    }
    toast.success(`${tersimpan} kasus ${penyakit} di Desa ${desa.nama} masuk dashboard seketika.`);
    setJumlah(1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Kanal fasilitas
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Input kasus terkonfirmasi</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Hanya 6 kolom minimum: penyakit, desa (kode wilayah), tanggal onset, kelompok umur, jenis
          kelamin, dan jumlah kasus. Cukup singkat untuk diisi petugas di tengah pelayanan, tapi
          sudah memadai untuk analisis spasial dan tren.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Mini
          icon={Zap}
          label={`Kasus pada ${formatTanggal(TANGGAL_ACUAN)}`}
          nilai={String(hariIni)}
        />
        <Mini icon={Timer} label="Target waktu isi" nilai="< 30 detik" />
        <Mini
          icon={Stethoscope}
          label="Total data di sistem"
          nilai={kasus.length.toLocaleString("id-ID")}
        />
      </div>

      <form onSubmit={kirim} className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Penyakit">
          <select
            value={penyakit}
            onChange={(e) => setPenyakit(e.target.value as Penyakit)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {PENYAKIT.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Desa (kode wilayah)">
          <select
            value={kodeDesa}
            onChange={(e) => setKodeDesa(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {DESA.map((d) => (
              <option key={d.kode} value={d.kode}>
                {d.kode} · {d.nama}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tanggal onset gejala">
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
            Wajib diisi, antara {formatTanggal(onsetTerawal())} dan {formatTanggal(TANGGAL_ACUAN)}{" "}
            (rentang observasi data).
          </p>
        </Field>

        <Field label="Kelompok umur">
          <select
            value={umur}
            onChange={(e) => setUmur(e.target.value as KelompokUmur)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {KELOMPOK_UMUR.map((u) => (
              <option key={u} value={u}>
                {u} tahun
              </option>
            ))}
          </select>
        </Field>

        <Field label="Jenis kelamin">
          <div className="flex gap-2">
            {(["L", "P"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setJk(v)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  jk === v
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {v === "L" ? "Laki-laki" : "Perempuan"}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label={`Jumlah kasus (entri massal, ${BATAS_JUMLAH_KASUS.min}-${BATAS_JUMLAH_KASUS.max})`}
        >
          <input
            type="number"
            min={BATAS_JUMLAH_KASUS.min}
            max={BATAS_JUMLAH_KASUS.max}
            value={jumlah}
            onChange={(e) => setJumlah(Number(e.target.value))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kirim ke dashboard sekarang
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Integrasi: data ini dirancang mengikuti variabel SKDR/e-Puskesmas sehingga bisa
            disinkronkan (bukan diketik ulang) lewat pertukaran data harian, dan tetap dapat
            disimpan lokal saat jaringan terputus.
          </p>
        </div>
      </form>
    </div>
  );
}

function Mini({ icon: Icon, label, nilai }: { icon: typeof Zap; label: string; nilai: string }) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="font-display text-lg font-bold leading-none">{nilai}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
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
