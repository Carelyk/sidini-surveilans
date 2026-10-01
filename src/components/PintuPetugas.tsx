import { useState, type ReactNode } from "react";
import { KeyRound, LogOut, ShieldAlert, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AKUN_CONTOH, useSesiPetugas } from "@/lib/sesi-petugas";

/**
 * Gerbang halaman petugas.
 *
 * Hanya membungkus dua halaman: input puskesmas dan verifikasi. Halaman lain
 * tetap terbuka untuk semua orang karena isinya agregat, bukan data per kasus.
 *
 * Kotak nama dan sandi sudah terisi begitu halaman dibuka. Ini bukan
 * kelalaian mengisi form: login prototipe sengaja dibuat satu-klik supaya
 * presentasi tidak tertahan di halaman login. Isian tetap bisa diketik ulang
 * seperti biasa bila perlu.
 */
export function PintuPetugas({
  children,
  judul,
  keterangan,
}: {
  children: ReactNode;
  judul: string;
  keterangan: string;
}) {
  const { sesi, masuk } = useSesiPetugas();
  const [nama, setNama] = useState<string>(AKUN_CONTOH.nama);
  const [sandi, setSandi] = useState<string>(AKUN_CONTOH.sandi);
  const [galat, setGalat] = useState<string | null>(null);

  if (sesi) return <>{children}</>;

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masuk(nama, sandi)) {
      setGalat("Nama atau sandi tidak cocok dengan akun contoh prototipe.");
      return;
    }
    setGalat(null);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="panel p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{judul}</h1>
            <p className="mt-1 text-justify text-sm text-muted-foreground">{keterangan}</p>
          </div>
        </div>

        <form onSubmit={kirim} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nama-petugas">Nama pengguna</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="nama-petugas"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="pl-9"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sandi-petugas">Sandi</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sandi-petugas"
                type="password"
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                className="pl-9"
                autoComplete="current-password"
              />
            </div>
          </div>

          {galat && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {galat}
            </p>
          )}

          <Button type="submit" className="w-full">
            Masuk
          </Button>
        </form>

        <p className="mt-4 text-justify text-xs text-muted-foreground">
          Akun contoh sudah terisi di atas, jadi cukup klik <strong>Masuk</strong>. Ini batas akses
          antarmuka pada prototipe: kredensial diperiksa di peramban, bukan di server, dan tidak ada
          basis data pengguna. Pada sistem sungguhan pemeriksaan peran harus dilakukan di server.
        </p>
      </div>
    </div>
  );
}

/**
 * Penanda sesi aktif di header halaman petugas, sekaligus tombol keluar.
 * Dipakai supaya reviewer bisa menunjukkan batas halaman itu sendiri: begitu
 * keluar, isi halaman hilang sampai login lagi.
 */
export function ChipPetugas() {
  const { sesi, keluar } = useSesiPetugas();
  if (!sesi) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <span>
        Masuk sebagai <strong className="text-foreground">{sesi.nama}</strong>
      </span>
      <button
        type="button"
        onClick={keluar}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 font-medium transition-colors hover:bg-secondary"
      >
        <LogOut className="size-3.5" /> Keluar
      </button>
    </div>
  );
}
