import { useCallback, useEffect, useState } from "react";

/**
 * Sesi petugas untuk prototipe - BUKAN autentikasi.
 *
 * Yang dilakukan modul ini hanya satu: menahan isi dua halaman antar-petugas
 * dari warga, yaitu formulir input puskesmas dan antrean verifikasi.
 * Kredensialnya tertulis di dalam berkas dan diperiksa di peramban, jadi
 * siapa pun yang membuka devtools bisa membacanya. Itu disengaja supaya
 * kejujuran prototipe tidak berubah jadi klaim keamanan yang salah.
 *
 * Yang belum ada, dan harus tetap disebut begitu saat presentasi:
 *   - tidak ada server yang memeriksa kredensial;
 *   - tidak ada basis data pengguna, hashing sandi, maupun pencadangan;
 *   - sesi disimpan di localStorage peramban, jadi bisa dihapus sewaktu-waktu
 *     dari panel penyimpanan;
 *   - pemeriksaan peran di sisi peramban selalu bisa dilewati. Batas
 *     sesungguhnya hanya ada kalau pemeriksaan itu dilakukan di server.
 */

const KUNCI_SESI = "sidini.sesi.petugas.v1";

/**
 * Satu akun contoh untuk semua peran petugas.
 *
 * Prototipe ini tidak sengaja memisahkan akun per peran. Yang diuji di sini
 * adalah pemisahan warga versus petugas, bukan hierarki antar-petugas, dan
 * menambah akun semu tidak menambah apa yang terbukti.
 */
export const AKUN_CONTOH = {
  nama: "petugas.surveilans",
  sandi: "SIDINI-2026",
} as const;

export interface SesiPetugas {
  nama: string;
  masukPada: string;
}

function bacaSesi(): SesiPetugas | null {
  try {
    const mentah = localStorage.getItem(KUNCI_SESI);
    if (!mentah) return null;
    const parsed = JSON.parse(mentah) as Partial<SesiPetugas>;
    if (typeof parsed.nama !== "string" || typeof parsed.masukPada !== "string") return null;
    return { nama: parsed.nama, masukPada: parsed.masukPada };
  } catch {
    // localStorage bisa tidak tersedia (mode privat) atau isinya rusak.
    // Apa pun sebabnya, artinya sama: dianggap belum masuk, lalu kartu
    // login yang menampilkannya.
    return null;
  }
}

/**
 * Sesi bertahan setelah halaman dimuat ulang dan hilang begitu localStorage
 * dibersihkan atau peramban diganti profil. "Stay login" dipilih supaya
 * presentasi tidak terputus di tengah jalan oleh refresh halaman.
 */
export function useSesiPetugas() {
  const [sesi, setSesi] = useState<SesiPetugas | null>(null);

  useEffect(() => {
    setSesi(bacaSesi());
  }, []);

  const masuk = useCallback((nama: string, sandi: string): boolean => {
    const benar = nama.trim() === AKUN_CONTOH.nama && sandi === AKUN_CONTOH.sandi;
    if (!benar) return false;
    const baru: SesiPetugas = {
      nama: AKUN_CONTOH.nama,
      masukPada: new Date().toISOString(),
    };
    try {
      localStorage.setItem(KUNCI_SESI, JSON.stringify(baru));
    } catch {
      // Kalau penyimpanan tidak bisa dipakai, sesi tetap berlaku untuk
      // halaman yang sedang terbuka saja.
    }
    setSesi(baru);
    return true;
  }, []);

  const keluar = useCallback(() => {
    try {
      localStorage.removeItem(KUNCI_SESI);
    } catch {
      // Kegagalan membersihkan penyimpanan tidak boleh menggagalkan keluar.
    }
    setSesi(null);
  }, []);

  return { sesi, masuk, keluar };
}
