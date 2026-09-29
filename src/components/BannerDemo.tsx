import { AlertTriangle, FlaskConical, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { BATAS_KEDALUWARSA_JAM, dataKedaluwarsa, usiaData, waktuPembaruan } from "@/data/kronologi";

/**
 * Banner demo global.
 *
 * Dua hal yang harus selalu terlihat di setiap halaman:
 *  1) Bahwa seluruh angka adalah simulasi, bukan laporan kasus nyata.
 *  2) Kapan data terakhir diperbarui, dan apakah sudah melewati batas
 *     kedaluwarsa yang dikonfigurasi (src/data/kronologi.ts).
 *
 * Umur data dihitung setelah komponen ter-mount supaya hasil render di server
 * dan di peramban sama; sebelum itu hanya waktu pembaruan tetap yang tampil.
 */
export function BannerDemo() {
  const [umur, setUmur] = useState<string | null>(null);
  const [basi, setBasi] = useState(false);

  useEffect(() => {
    setUmur(usiaData());
    setBasi(dataKedaluwarsa());
  }, []);

  return (
    <div
      className="border-b border-warning/40 bg-warning/10"
      role="note"
      aria-label="Pemberitahuan data simulasi"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[11px] leading-snug">
        <span className="inline-flex items-center gap-1.5 font-bold text-warning-text">
          <FlaskConical className="size-3.5 shrink-0" aria-hidden />
          DEMO &mdash; data simulasi, bukan laporan kasus sebenarnya.
        </span>
        <span className="text-muted-foreground">
          Terakhir diperbarui {waktuPembaruan()}
          {umur ? ` (${umur})` : ""}. Jumlah penduduk desa, ambang KLB, dan data kasus di prototipe
          ini belum diverifikasi sebagai angka Dinkes.
        </span>
        {basi ? (
          <span className="inline-flex items-center gap-1 font-semibold text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            Data lebih dari {BATAS_KEDALUWARSA_JAM} jam sejak pembaruan.
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
          Tanpa autentikasi: semua peran dapat membuka semua halaman.
        </span>
      </div>
    </div>
  );
}
