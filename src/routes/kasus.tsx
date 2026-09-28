import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, Lock, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/StatCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSurveilans } from "@/lib/store";
import { kasusValid, rataKeterlambatan } from "@/lib/analitik";
import { DESA, PENYAKIT, TANGGAL_ACUAN, type Kasus } from "@/data/dataset";

export const Route = createFileRoute("/kasus")({
  head: () => ({
    meta: [
      { title: "Data Kasus | SIDINI" },
      {
        name: "description",
        content:
          "Daftar kasus individual hasil pelaporan Puskesmas dan warga, dengan penyaring wilayah, penyakit, status, dan sumber.",
      },
      { property: "og:title", content: "Data Kasus | SIDINI" },
      {
        property: "og:description",
        content: "Daftar kasus individual dengan penyaring dan paginasi.",
      },
    ],
  }),
  component: DataKasus,
});

const STATUS: Kasus["status"][] = ["Baru", "Investigasi", "Terverifikasi", "Selesai", "Ditolak"];
const PER_HALAMAN = 25;

function DataKasus() {
  const { kasus, reset, adaTambahan } = useSurveilans();
  const [cari, setCari] = useState("");
  const [desa, setDesa] = useState("all");
  const [penyakit, setPenyakit] = useState("all");
  const [status, setStatus] = useState("all");
  const [sumber, setSumber] = useState("all");
  const [halaman, setHalaman] = useState(0);

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return kasus
      .filter((k) => (desa === "all" ? true : k.desa === desa))
      .filter((k) => (penyakit === "all" ? true : k.penyakit === penyakit))
      .filter((k) => (status === "all" ? true : k.status === status))
      .filter((k) => (sumber === "all" ? true : k.sumber === sumber))
      .filter(
        (k) =>
          !q ||
          k.id.toLowerCase().includes(q) ||
          k.desa.toLowerCase().includes(q) ||
          k.kecamatan.toLowerCase().includes(q) ||
          k.puskesmas.toLowerCase().includes(q),
      )
      .sort((a, b) => (a.tanggalOnset < b.tanggalOnset ? 1 : -1));
  }, [kasus, cari, desa, penyakit, status, sumber]);

  const totalHal = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const halAman = Math.min(halaman, totalHal - 1);
  const awal = halAman * PER_HALAMAN;
  const potong = hasil.slice(awal, awal + PER_HALAMAN);

  const kosongkan = (fn: () => void) => {
    fn();
    setHalaman(0);
  };

  const valid = kasusValid(kasus).length;
  const menunggu = kasus.filter(
    (k) => k.sumber === "Warga" && (k.status === "Baru" || k.status === "Investigasi"),
  ).length;
  const ditolak = kasus.filter((k) => k.status === "Ditolak").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Data individual
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Data kasus</h1>
          {adaTambahan && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" /> Reset ke data awal
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kembalikan data ke kondisi awal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Semua kasus yang Anda tambahkan atau ubah statusnya (termasuk laporan warga
                    hasil demo) akan dihapus dan diganti dataset bawaan. Tindakan ini tidak bisa
                    dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      reset();
                      toast.success("Data dikembalikan ke dataset awal.");
                    }}
                  >
                    Ya, reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Daftar kasus dari pelaporan Puskesmas dan laporan warga per {TANGGAL_ACUAN}. Baris yang
          masih berstatus Baru atau Investigasi belum dihitung sebagai kasus resmi di dashboard.
          Data kasus yang Anda tambahkan tersimpan di peramban ini dan tetap ada setelah halaman
          dimuat ulang.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Total kasus tercatat"
          nilai={kasus.length}
          keterangan="Semua sumber dan status"
        />
        <StatCard
          icon={ClipboardList}
          label="Kasus sah (dihitung)"
          nilai={valid}
          keterangan="Ditolak dan belum terverifikasi tidak masuk hitungan"
          nada="baik"
        />
        <StatCard
          icon={ClipboardList}
          label="Menunggu verifikasi"
          nilai={menunggu}
          keterangan="Laporan warga yang belum disahkan petugas"
          nada={menunggu > 20 ? "waspada" : "netral"}
        />
        <StatCard
          icon={ClipboardList}
          label="Rata-rata keterlambatan"
          nilai={rataKeterlambatan(kasusValid(kasus))}
          satuan="hari"
          keterangan="Selisih tanggal onset ke tanggal lapor"
          nada={rataKeterlambatan(kasusValid(kasus)) <= 1 ? "baik" : "waspada"}
        />
      </div>

      <div className="panel flex items-start gap-2 p-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Halaman ini berisi data tingkat individual untuk keperluan petugas. Identitas pelapor
          tidak pernah disimpan. Tampilan publik (dashboard, peta, analisis AI) hanya memakai angka
          agregat.
        </p>
      </div>

      <section className="panel space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={cari}
            onChange={(e) => kosongkan(() => setCari(e.target.value))}
            placeholder="Cari nomor kasus, desa, kecamatan, atau Puskesmas…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter
            label="Desa"
            value={desa}
            onChange={(v) => kosongkan(() => setDesa(v))}
            opsi={[{ v: "all", l: "Semua desa" }, ...DESA.map((d) => ({ v: d.nama, l: d.nama }))]}
          />
          <Filter
            label="Penyakit"
            value={penyakit}
            onChange={(v) => kosongkan(() => setPenyakit(v))}
            opsi={[{ v: "all", l: "Semua penyakit" }, ...PENYAKIT.map((p) => ({ v: p, l: p }))]}
          />
          <Filter
            label="Status"
            value={status}
            onChange={(v) => kosongkan(() => setStatus(v))}
            opsi={[{ v: "all", l: "Semua status" }, ...STATUS.map((s) => ({ v: s, l: s }))]}
          />
          <Filter
            label="Sumber"
            value={sumber}
            onChange={(v) => kosongkan(() => setSumber(v))}
            opsi={[
              { v: "all", l: "Semua sumber" },
              { v: "Puskesmas", l: "Puskesmas" },
              { v: "Warga", l: "Warga" },
            ]}
          />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2.5 pr-3 pl-5">Nomor</th>
                <th className="py-2.5 pr-3">Penyakit</th>
                <th className="py-2.5 pr-3">Wilayah</th>
                <th className="py-2.5 pr-3">Onset</th>
                <th className="py-2.5 pr-3">Lapor</th>
                <th className="py-2.5 pr-3">Umur</th>
                <th className="py-2.5 pr-3">JK</th>
                <th className="py-2.5 pr-3">Sumber</th>
                <th className="py-2.5 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {potong.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-6 text-sm text-muted-foreground">
                    Tidak ada kasus yang cocok dengan filter.
                  </td>
                </tr>
              )}
              {potong.map((k) => (
                <tr key={k.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-3 pl-5 font-mono text-xs text-muted-foreground">
                    {k.id}
                  </td>
                  <td className="py-2.5 pr-3 font-medium">{k.penyakit}</td>
                  <td className="py-2.5 pr-3">
                    <span>{k.desa}</span>
                    <span className="block text-xs text-muted-foreground">Kec. {k.kecamatan}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{k.tanggalOnset}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">
                    {k.tanggalLapor}
                  </td>
                  <td className="py-2.5 pr-3">{k.kelompokUmur}</td>
                  <td className="py-2.5 pr-3">{k.jenisKelamin}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{k.sumber}</td>
                  <td className="py-2.5 pr-5">
                    <BadgeStatus status={k.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
          <span>
            Menampilkan {hasil.length === 0 ? 0 : awal + 1}–
            {Math.min(awal + PER_HALAMAN, hasil.length)} dari {hasil.length} kasus ({ditolak}{" "}
            ditolak)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.max(0, h - 1))}
              disabled={halAman === 0}
              className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="font-mono">
              {halAman + 1} / {totalHal}
            </span>
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.min(totalHal - 1, h + 1))}
              disabled={halAman >= totalHal - 1}
              className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  opsi,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opsi: { v: string; l: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {opsi.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}

function BadgeStatus({ status }: { status: Kasus["status"] }) {
  const kelas =
    status === "Ditolak"
      ? "border-border bg-secondary text-muted-foreground"
      : status === "Baru"
        ? "border-primary/40 bg-primary/15 text-primary"
        : status === "Investigasi"
          ? "border-warning/40 bg-warning/15 text-warning-text"
          : "border-success/40 bg-success/15 text-success-text";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kelas}`}
    >
      {status}
    </span>
  );
}
