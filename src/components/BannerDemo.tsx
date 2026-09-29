import { Clock, FlaskConical, ShieldAlert } from "lucide-react";

import { labelSnapshot, waktuPembaruan } from "@/data/kronologi";

/**
 * Banner demo global.
 *
 * Dua hal yang harus selalu terlihat di setiap halaman:
 *  1) Bahwa seluruh angka adalah simulasi, bukan laporan kasus nyata.
 *  2) Kapan data terakhir diperbarui, dan bahwa setelah tanggal itu
 *     tidak ada data baru.
 *
 * PENTING: banner ini tidak lagi menampilkan peringatan "data
 * kedaluwarsa". Sebelumnya, begitu jam sistem melewati batas 24 jam,
 * banner menampilkan tanda bahaya "Data lebih dari 24 jam sejak
 * pembaruan" -- padahal prototipe ini tidak punya jadwal unggah sama
 * sekali. Peringatan itu akan menyala setiap hari tanpa ada yang bisa
 * diperbaiki, sehingga pembaca belajar mengabaikannya. Nilai yang
 * sebenarnya dibaca bukan "data ini basi" tapi "prototipe ini memang
 * statis". Sekarang yang ditampilkan adalah label tetap: "snapshot
 * simulasi per 25 Sep 2026".
 *
 * Fungsi dataKedaluwarsa() dan BATAS_KEDALUWARSA_JAM tetap ada di
 * src/data/kronologi.ts; hanya pemakaiannya di sini yang dihapus.
 * Saat prototipe dihubungkan ke sumber data nyata, penanda
 * kedaluwarsa justru dibutuhkan.
 *
 * Karena label dan waktu pembaruan keduanya konstan, komponen ini
 * tidak lagi memakai useState/useEffect: render di server dan di
 * peramban selalu sama tanpa menunggu mount.
 */
export function BannerDemo() {
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
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          {`Data demo ini adalah ${labelSnapshot()}, diambil terakhir ${waktuPembaruan()}. `}
          Tidak ada pembaruan setelah tanggal itu. Jumlah penduduk desa, ambang KLB, dan data kasus
          di prototipe ini belum diverifikasi sebagai angka Dinkes.
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
          Tanpa autentikasi: semua peran dapat membuka semua halaman.
        </span>
      </div>
    </div>
  );
}
