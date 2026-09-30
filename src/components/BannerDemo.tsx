import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { labelSnapshot } from "@/data/kronologi";
import { bacaStatusTertutup, haruskahTampil, tulisStatusTertutup } from "@/lib/banner-demo-session";

/**
 * Banner demo global.
 *
 * Teksnya satu baris pendek: menyebut bahwa seluruh angka adalah simulasi,
 * tanggal snapshot, dan tidak ada login. "Selengkapnya" menuju bagian Konsep
 * yang memuat catatan bahwa penduduk desa, ambang KLB, dan data kasus belum
 * diverifikasi sebagai angka Dinkes.
 *
 * Banner bisa ditutup lewat tombol X. Status tutup disimpan di sessionStorage
 * lewat src/lib/banner-demo-session.ts, sehingga bertahan selama tab yang
 * sama (pindah halaman maupun reload) dan muncul lagi di tab baru.
 *
 * Render menunggu status storage terbaca (useEffect) supaya tidak terjadi
 * kedipan saat hidrasi: di server dan render awal banner tidak tampil, lalu
 * muncul hanya bila belum ditutup. Akses storage dibungkus try/catch di modul
 * penyimpanan; bila gagal, banner tetap tampil.
 */
export function BannerDemo() {
  const [terbaca, setTerbaca] = useState(false);
  const [tertutup, setTertutup] = useState(false);

  useEffect(() => {
    const storage = typeof sessionStorage === "undefined" ? null : sessionStorage;
    setTertutup(bacaStatusTertutup(storage));
    setTerbaca(true);
  }, []);

  const tutup = () => {
    const storage = typeof sessionStorage === "undefined" ? null : sessionStorage;
    tulisStatusTertutup(storage);
    setTertutup(true);
  };

  // Jangan render sampai status storage terbaca; lalu tampil hanya bila belum
  // ditutup. Sebelum terbaca banner tidak dirender sama sekali.
  if (!haruskahTampil(terbaca, tertutup)) {
    return null;
  }

  return (
    <div
      className="border-b border-warning/40 bg-warning/10"
      role="note"
      aria-label="Pemberitahuan data simulasi"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-[11px] leading-snug">
        <span className="min-w-0 flex-1">
          DEMO &middot; data simulasi, bukan laporan kasus sebenarnya &middot; {labelSnapshot()}{" "}
          &middot; tanpa login (semua peran dapat membuka semua halaman){" "}
          <Link
            to="/tentang"
            hash="acuan-belum-diverifikasi"
            className="whitespace-nowrap font-semibold text-warning-text underline underline-offset-2 hover:text-foreground"
          >
            Selengkapnya
          </Link>
        </span>
        <button
          type="button"
          onClick={tutup}
          aria-label="Tutup pemberitahuan demo"
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-warning/20 hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
