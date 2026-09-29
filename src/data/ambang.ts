/**
 * Ambang peringatan dini SKDR — konfigurasi tunggal sebagai sumber kebenaran (SSOT).
 *
 * Prinsip: TIDAK mengubah angka ambang yang ada. Hanya memindahkan nilai ke
 * konfigurasi terpusat lengkap dengan kolom sumber acuan dan status verifikasi.
 * Semua perubahan angka wajib persetujuan eksplisit.
 */
import type { Penyakit } from "@/data/skdr";

export type StatusSumberAmbang = "tercatat" | "perlu verifikasi acuan Dinkes";

export interface AmbangSKDR {
  /**
   * Kasus absolut minimum per minggu agar KABUPATEN yang dihitung dari
   * KRITERIA RASIO boleh naik status, baik ke Waspada maupun ke KLB
   * (pencegahan alert fatigue di kecamatan kecil).
   *
   * Angka ini sudah ada sebelumnya dan tidak diubah. Yang berubah pada
   * adalah cakupannya: tadinya hanya dipakai untuk KLB, sekarang juga untuk
   * Waspada.
   */
  kasusMin: number;
  /** Insidensi minimum per 100.000 penduduk per minggu */
  insidensiMin: number;
  /** Rasio terhadap baseline sendiri yang mencurigai kenaikan */
  rasioWaspada: number;
  rasioKLB: number;
  /** Satu kematian pada penyakit ini langsung menaikkan status */
  kematianEskalasi: boolean;
  /** Penjelasan teknis untuk UI */
  dasar: string;
  /** Acuan sumber (mis. Pedoman Kemenkes, tinjauan teknis Dinkes) */
  sumber: string;
  /** Status pencatatan sumber acuan */
  statusSumber: StatusSumberAmbang;
}

export const AMBANG_SKDR: Record<Penyakit, AmbangSKDR> = {
  DBD: {
    kasusMin: 5,
    insidensiMin: 50,
    rasioWaspada: 1.5,
    rasioKLB: 2,
    kematianEskalasi: true,
    dasar:
      "KLB bila insidensi >= 50 per 100.000 per minggu, ATAU >= 2x baseline " +
      "mingguan sendiri dengan minimal 5 kasus, ATAU ada 2 kematian dalam " +
      "satu minggu. Kematian tunggal tidak otomatis memicu KLB karena " +
      "kematian dengue di Jawa Barat sudah menjadi latar endemik tahunan; " +
      "satu kematian tetap menaikkan status minimal ke Waspada. Kedua " +
      "kriteria rasio hanya dibaca bila kasus minggu itu mencapai minimal 5 " +
      "kasus; kriteria insidensi dan kematian tidak memerlukan syarat itu. " +
      "Acuan: Pedoman Penanganan Kejadian Luar Biasa Kemenkes.",
    sumber: "Pedoman Penanganan Kejadian Luar Biasa Kemenkes RI.",
    statusSumber: "perlu verifikasi acuan Dinkes",
  },
  Diare: {
    kasusMin: 40,
    insidensiMin: 100,
    rasioWaspada: 1.5,
    rasioKLB: 2,
    kematianEskalasi: false,
    dasar:
      "Diare tidak punya kriteria KLB nasional tunggal, jadi ambangnya dibuat " +
      "relatif terhadap baseline kecamatan itu sendiri (>= 2x selama 2 minggu) " +
      "ditambah lantai insidensi, supaya wilayah besar tidak memicu alarm palsu. " +
      "Kedua kriteria rasio hanya dibaca bila kasus minggu itu mencapai minimal " +
      "40 kasus; kriteria insidensi tidak memerlukan syarat itu.",
    sumber: "Belum tercatat dalam pedoman nasional tunggal (ambang operasional).",
    statusSumber: "perlu verifikasi acuan Dinkes",
  },
  Chikungunya: {
    kasusMin: 3,
    insidensiMin: 15,
    rasioWaspada: 1.5,
    rasioKLB: 2,
    kematianEskalasi: false,
    dasar:
      "Chikungunya berbagi vektor nyamuk dengan dengue, jadi ambangnya dibuat " +
      "lebih rendah: penyakit ini bisa meledak cepat pada musim hujan. Kedua " +
      "kriteria rasio hanya dibaca bila kasus minggu itu mencapai minimal 3 kasus; " +
      "kriteria insidensi tidak memerlukan syarat itu.",
    sumber: "Belum tercatat dalam pedoman nasional tunggal (ambang operasional).",
    statusSumber: "perlu verifikasi acuan Dinkes",
  },
  "Hepatitis A": {
    kasusMin: 3,
    insidensiMin: 15,
    rasioWaspada: 1.5,
    rasioKLB: 2,
    kematianEskalasi: false,
    dasar:
      "Hepatitis A menular lewat makanan dan air, sehingga ledakannya biasanya " +
      "muncul di klaster padat. Ambang diuji dari baseline sendiri dengan " +
      "lantai absolut agar klaster kecil di daerah padat tetap terlihat. Kedua " +
      "kriteria rasio hanya dibaca bila kasus minggu itu mencapai minimal 3 kasus; " +
      "tanpa syarat itu satu kasus di tengah baseline pecahan memberi rasio besar " +
      "yang tidak bermakna. Kriteria insidensi tidak memerlukan syarat itu.",
    sumber: "Belum tercatat dalam pedoman nasional tunggal (ambang operasional).",
    statusSumber: "perlu verifikasi acuan Dinkes",
  },
};

export type Ambang = AmbangSKDR;
export const AMBANG = AMBANG_SKDR; // alias backward compatible

/* ============================================================================
 * SYARAT KASUS MINIMUM UNTUK LAPIS HARIAN (per desa)
 * ============================================================================
 *
 * Ini BUKAN pengulangan `kasusMin` di atas. Bedanya:
 *  - `kasusMin` di atas dipakai lapis SKDR MINGGUAN, nilainya per penyakit
 *    (5 / 40 / 3 / 3).
 *  - Dua konstanta di bawah dipakai lapis HARIAN, dan sama untuk semua
 *    penyakit, supaya desa kecil tidak memicu peringatan palsu.
 *
 * Alasan (alert fatigue): tanpa syarat jumlah kasus, rasio pada desa kecil
 * tidak bermakna. Contoh nyata pada data prototipe: Hepatitis A dengan 1
 * kasus dan baseline 0 menghasilkan rasio 99, sehingga desa yang hanya punya
 * 1 kasus langsung naik ke "Waspada". Ambang rasio 1,5x dan 2x tidak
 * diubah; yang ditambahkan hanya syarat kasus minimum sebagai penjaga.
 *
 * Angka 10 untuk Sinyal bukan angka baru: itu syarat yang sudah tampil di
 * situs sejak awal ("kasus 7 hari >= 2x baseline dan >= 10 kasus").
 *
 * Status sumber: perlu verifikasi acuan Dinkes. Angka ini adalah nilai
 * simulasi prototipe, belum ditetapkan bersama Dinkes.
 * ========================================================================== */

/** Kasus minimum (7 hari, per penyakit) agar rasio boleh menaikkan status Sinyal. */
export const KASUS_MIN_SINYAL_HARIAN = 10;

/**
 * Kasus minimum (7 hari, per penyakit) agar rasio boleh menaikkan status
 * Waspada. Tanpa ini, desa dengan 1 kasus dan baseline 0 akan selalu
 * terlihat "naik".
 */
export const KASUS_MIN_WASPADA_HARIAN = 3;

/** Ringkasan aturan lapis harian untuk ditampilkan di UI dan di halaman Konsep. */
export const ATURAN_HARIAN = {
  kasusMinSinyal: KASUS_MIN_SINYAL_HARIAN,
  kasusMinWaspada: KASUS_MIN_WASPADA_HARIAN,
  alasan:
    "Ambang rasio hanya dibaca bila jumlah kasus penyakit itu di desa tersebut " +
    "mencapai minimal 3 kasus (Waspada) atau 10 kasus (Sinyal) dalam 7 hari. " +
    "Tanpa syarat ini, desa kecil dengan 1 kasus dan baseline 0 terlihat selalu " +
    "naik (rasio 99), dan petugas kewalahan palsu (alert fatigue).",
} as const;
