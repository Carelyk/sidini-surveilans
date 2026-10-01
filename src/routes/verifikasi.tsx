import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";

import { DialogKonfirmasi } from "@/components/DialogKonfirmasi";
import { ChipPetugas, PintuPetugas } from "@/components/PintuPetugas";
import { NAMA_KELOMPOK_UMUR, type Kasus } from "@/data/dataset";
import { useSurveilans } from "@/lib/store";

/** Jumlah laporan per halaman pada antrean verifikasi. */
const UKUR_HALAMAN = 10;

/** Aksi triase yang sedang menunggu konfirmasi petugas. */
type Aksi = "sahkan" | "tolak" | "investigasi" | null;

/**
 * Kalimat konfirmasi per aksi.
 *
 * Setiap aksi punya akibat berbeda terhadap angka dashboard, jadi kalimatnya
 * menjelaskan akibat itu, bukan hanya mengulang label tombol. Aksi "tolak"
 * memakai nada bahaya karena laporan yang ditolak keluar dari antrean dan
 * tidak bisa dikembalikan dari halaman mana pun di prototipe ini.
 */
const AKSI_DIALOG: Record<
  Exclude<Aksi, null>,
  {
    nada: "sukses" | "bahaya" | "info";
    judul: string;
    konfirmasi: string;
    pesan: (k: Kasus) => string;
  }
> = {
  sahkan: {
    nada: "sukses",
    judul: "Yakin sahkan laporan ini?",
    konfirmasi: "Ya, sahkan",
    pesan: (k) =>
      `Laporan ${k.id} · Dugaan ${k.penyakit} di Desa ${k.desa} akan dihitung sebagai kasus resmi dan langsung masuk ke angka dashboard.`,
  },
  investigasi: {
    nada: "info",
    judul: "Tandai perlu investigasi lapangan?",
    konfirmasi: "Ya, tandai investigasi",
    pesan: (k) =>
      `Laporan ${k.id} tetap menunggu di antrean dan BELUM dihitung sebagai kasus. Statusnya berubah menjadi Investigasi dan pencatatan petugas berikutnya belum ada di prototipe ini.`,
  },
  tolak: {
    nada: "bahaya",
    judul: "Yakin tolak laporan ini?",
    konfirmasi: "Ya, tolak",
    pesan: (k) =>
      `Laporan ${k.id} akan dikeluarkan dari antrean verifikasi dan tidak dihitung sebagai kasus. Tindakan ini tidak dapat dibatalkan dari halaman mana pun, jadi pastikan alasan penolakan sudah tercatat manual.`,
  },
};

export const Route = createFileRoute("/verifikasi")({
  head: () => ({
    meta: [
      { title: "Verifikasi Laporan Warga | SIDINI" },
      {
        name: "description",
        content:
          "Triase laporan gejala warga. Laporan yang belum diverifikasi tidak dihitung sebagai kasus. Prototipe tidak mendeteksi duplikat secara otomatis.",
      },
      { property: "og:title", content: "Verifikasi Laporan Warga | SIDINI" },
      {
        property: "og:description",
        content:
          "Alur triase laporan komunitas sebelum dihitung sebagai kasus resmi. Halaman khusus petugas.",
      },
    ],
  }),
  component: VerifikasiTerpantau,
});

/**
 * Antrean verifikasi hanya dirender setelah login petugas, supaya isi halaman
 * ini tidak pernah muncul di peramban yang belum masuk.
 */
function VerifikasiTerpantau() {
  return (
    <PintuPetugas
      judul="Halaman petugas"
      keterangan="Verifikasi laporan warga hanya untuk petugas surveilans. Warga sendiri mengirim laporan tanpa perlu login."
    >
      <Verifikasi />
    </PintuPetugas>
  );
}

function Verifikasi() {
  const { kasus, ubahStatus } = useSurveilans();
  const [cari, setCari] = useState("");
  const [halaman, setHalaman] = useState(1);

  /**
   * Antrean TIDAK dipotong lagi. Sebelumnya hanya 40 laporan pertama yang
   * pernah tampil, padahal ada 94 laporan menunggu verifikasi, jadi 54 laporan
   * tidak pernah bisa ditangani petugas tanpa mengubah kode.
   */
  const semua = useMemo(
    () =>
      kasus
        .filter((k) => k.sumber === "Warga" && (k.status === "Baru" || k.status === "Investigasi"))
        .filter(
          (k) =>
            !cari ||
            k.desa.toLowerCase().includes(cari.toLowerCase()) ||
            k.id.toLowerCase().includes(cari.toLowerCase()),
        )
        .sort((a, b) => (a.tanggalLapor < b.tanggalLapor ? 1 : -1)),
    [kasus, cari],
  );

  const totalHalaman = Math.max(1, Math.ceil(semua.length / UKUR_HALAMAN));
  // Pencarian atau tindakan yang mengubah jumlah antrean bisa membuat halaman
  // aktif kosong; diklem ke rentang yang benar.
  const halamanAman = Math.min(halaman, totalHalaman);
  const mulai = (halamanAman - 1) * UKUR_HALAMAN;
  const antrean = semua.slice(mulai, mulai + UKUR_HALAMAN);

  const skorPrioritas = (gejalaJumlah: number, kluster: boolean) =>
    (kluster ? 2 : 0) + (gejalaJumlah >= 3 ? 2 : 1);

  // Aksi tidak dijalankan langsung saat tombol ditekan: nama laporan yang
  // dipilih disimpan dulu, lalu DialogKonfirmasi menanyakan akibatnya. Setelah
  // petugas mengonfirmasi, barulah ubahStatus dipanggil.
  const [aksi, setAksi] = useState<Aksi>(null);
  const [dipilih, setDipilih] = useState<Kasus | null>(null);

  const mintaKonfirmasi = (a: Aksi, k: Kasus) => {
    setDipilih(k);
    setAksi(a);
  };

  const jalankan = () => {
    if (!dipilih || !aksi) return;
    if (aksi === "sahkan") {
      ubahStatus(dipilih.id, "Terverifikasi");
      toast.success(`${dipilih.id} disahkan sebagai kasus dan masuk hitungan dashboard.`);
      return;
    }
    if (aksi === "tolak") {
      ubahStatus(dipilih.id, "Ditolak");
      toast(
        "Laporan ditolak. Prototipe tidak mendeteksi duplikat, jadi alasan penolakan dicatat manual petugas.",
      );
      return;
    }
    ubahStatus(dipilih.id, "Investigasi");
    toast("Ditandai berstatus Investigasi. Belum ada petugas yang ditugaskan.");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Triase</p>
        <ChipPetugas />
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Verifikasi laporan warga</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Laporan warga tidak langsung menjadi kasus. Petugas memutuskan: sahkan, investigasi, atau
          tolak. Antrean diurutkan dari tanggal lapor terbaru, bukan dari skor.
        </p>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Yang belum ada di prototipe: pendeteksian laporan duplikat otomatis, penugasan petugas,
          dan pemeriksaan peran di server. Akses ke halaman ini dijaga di sisi peramban.
        </p>
      </header>

      <div className="panel flex items-center gap-2 p-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={cari}
          onChange={(e) => {
            setCari(e.target.value);
            setHalaman(1);
          }}
          placeholder="Cari nomor laporan atau desa…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{semua.length} menunggu</span>
      </div>

      <div className="space-y-3">
        {antrean.length === 0 && (
          <p className="panel p-6 text-sm text-muted-foreground">
            Tidak ada laporan warga yang menunggu verifikasi.
          </p>
        )}

        {antrean.map((k) => {
          const kluster = (k.catatan ?? "").includes("keluhan sama");
          const skor = skorPrioritas(k.gejala.length, kluster);
          return (
            <article key={k.id} className="panel flex flex-wrap items-start gap-4 p-4">
              <div className="min-w-[13rem] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{k.id}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      skor >= 4
                        ? "border-destructive/40 bg-destructive/15 text-destructive"
                        : skor === 3
                          ? "border-warning/40 bg-warning/15 text-warning-text"
                          : "border-border bg-secondary text-muted-foreground"
                    }`}
                  >
                    Skor gejala {skor}/4
                  </span>
                  {kluster && (
                    <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
                      Kluster keluarga
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-medium">
                  Dugaan {k.penyakit} · Desa {k.desa}, Kec. {k.kecamatan}
                </p>
                <p className="text-xs text-muted-foreground">
                  Onset {k.tanggalOnset} · dilaporkan {k.tanggalLapor} ·{" "}
                  {NAMA_KELOMPOK_UMUR[k.kelompokUmur]} · {k.puskesmas}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Gejala: {k.gejala.length ? k.gejala.join(", ") : "tidak dirinci"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Skor {skor} dari 4 dihitung dari jumlah gejala (2 poin bila minimal 3 gejala) dan
                  penanda kluster keluarga (2 poin). Skor ini hanya label pada baris ini, tidak
                  dipakai mengurutkan antrean, dan bukan penilaian klinis.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => mintaKonfirmasi("sahkan", k)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-success/20 px-3 py-2 text-sm font-semibold text-success-text transition-colors hover:bg-success/30"
                >
                  <Check className="size-4" /> Sahkan
                </button>
                <button
                  onClick={() => mintaKonfirmasi("investigasi", k)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  Investigasi
                </button>
                <button
                  onClick={() => mintaKonfirmasi("tolak", k)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <X className="size-4" /> Tolak
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <DialogKonfirmasi
        terbuka={aksi !== null}
        tutup={() => {
          setAksi(null);
          setDipilih(null);
        }}
        nada={AKSI_DIALOG[aksi ?? "sahkan"].nada}
        judul={AKSI_DIALOG[aksi ?? "sahkan"].judul}
        pesan={dipilih ? AKSI_DIALOG[aksi ?? "sahkan"].pesan(dipilih) : ""}
        aksi={
          aksi === null
            ? []
            : [
                {
                  label: AKSI_DIALOG[aksi].konfirmasi,
                  nada: AKSI_DIALOG[aksi].nada,
                  jalankan: jalankan,
                },
              ]
        }
      />

      {semua.length > UKUR_HALAMAN && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Menampilkan {mulai + 1}&ndash;{Math.min(mulai + UKUR_HALAMAN, semua.length)} dari{" "}
            {semua.length} laporan
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHalaman(halamanAman - 1)}
              disabled={halamanAman <= 1}
              className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="tabular-nums">
              Halaman {halamanAman} / {totalHalaman}
            </span>
            <button
              type="button"
              onClick={() => setHalaman(halamanAman + 1)}
              disabled={halamanAman >= totalHalaman}
              className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
