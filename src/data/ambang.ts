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
   * KRITERIA RASIO boleh naik ke status KLB.
   *
   * Field ini HANYA dipakai untuk KLB. Status Waspada memakai satu konstanta
   * bersama untuk semua penyakit, yaitu KASUS_MIN_WASPADA (lihat bawah),
   * karena angka per penyakit di sini terlalu besar untuk dipakai di
   * Waspada: 40 kasus per minggu untuk diare sudah melampaui ambang insidensi
   * di kecamatan mana pun.
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
      "kematian dengue di Jawa Barat sudah menjadi latar endemik tahunan, " +
      "satu kematian tetap menaikkan status minimal ke Waspada. Kriteria rasio " +
      "untuk Waspada memerlukan minimal 3 kasus dalam minggu itu, sama untuk " +
      "semua penyakit, kriteria insidensi dan kematian tidak memakai syarat " +
      "itu. Acuan: Pedoman Penanganan Kejadian Luar Biasa Kemenkes.",
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
      "Kriteria rasio untuk Waspada memerlukan minimal 3 kasus dalam minggu " +
      "itu, sama untuk semua penyakit, kriteria insidensi tidak memakai syarat itu.",
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
      "lebih rendah: penyakit ini bisa meledak cepat pada musim hujan. Kriteria " +
      "rasio untuk Waspada memerlukan minimal 3 kasus dalam minggu itu, sama " +
      "untuk semua penyakit, kriteria insidensi tidak memakai syarat itu.",
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
      "lantai absolut agar klaster kecil di daerah padat tetap terlihat. Kriteria " +
      "rasio untuk Waspada memerlukan minimal 3 kasus dalam minggu itu, sama " +
      "untuk semua penyakit. Tanpa syarat itu satu kasus di tengah baseline " +
      "pecahan memberi rasio besar yang tidak bermakna. Kriteria insidensi " +
      "tidak memakai syarat itu.",
    sumber: "Belum tercatat dalam pedoman nasional tunggal (ambang operasional).",
    statusSumber: "perlu verifikasi acuan Dinkes",
  },
};

export type Ambang = AmbangSKDR;
export const AMBANG = AMBANG_SKDR; // alias backward compatible

/* ============================================================================
 * SYARAT KASUS MINIMUM UNTUK STATUS SINYAL DAN WASPADA
 * ============================================================================
 *
 * Ini BUKAN pengulangan `kasusMin` di atas. Bedanya:
 *  - `kasusMin` di atas hanya dipakai untuk kriteria rasio pada status KLB
 *    di lapis SKDR mingguan, dan nilainya berbeda per penyakit
 *    (5 / 40 / 3 / 3).
 *  - Konstanta di bawah dipakai untuk status Waspada, dan SAMA untuk semua
 *    penyakit, di kedua lapis: harian per desa dan SKDR mingguan per
 *    kecamatan. Satu aturan dan satu angka, supaya tidak dibaca berbeda
 *    tergantung penyakit.
 *
 * Alasan (alert fatigue): tanpa syarat jumlah kasus, rasio pada wilayah
 * kecil tidak bermakna. Contoh nyata pada data prototipe: Hepatitis A di
 * lapis harian dengan 1 kasus dan baseline 0 menghasilkan rasio 99, dan di
 * lapis mingguan 1 kasus melawan baseline 0,33 menghasilkan rasio 3,0.
 * Keduanya menyalakan peringatan tanpa informasi. Ambang rasio 1,5x dan 2x
 * tidak diubah; yang ditambahkan hanya syarat kasus minimum sebagai penjaga.
 *
 * Angka 10 untuk Sinyal bukan angka baru: itu syarat yang sudah tampil di
 * situs sejak awal ("kasus 7 hari >= 2x baseline dan >= 10 kasus").
 *
 * Konsekuensi yang harus dibaca: pada data simulasi sekarang, Hepatitis A
 * dan Chikungunya jarang sekali berstatus Waspada di rekap mingguan, karena
 * kasus per kecamatan per minggunya kecil (median 0, maksimum 1 dan 3).
 * Itu konsekuensi volume kasus simulasi, bukan ambang yang terlalu tinggi.
 *
 * Status sumber: perlu verifikasi acuan Dinkes. Angka ini adalah nilai
 * simulasi prototipe, belum ditetapkan bersama Dinkes.
 * ========================================================================== */

/**
 * SATU konstanta bersama untuk status Waspada, di lapis harian maupun lapis
 * SKDR mingguan. Nilainya 3.
 */
export const KASUS_MIN_WASPADA = 3;

/** Kasus minimum (7 hari, per penyakit) agar rasio boleh menaikkan status Sinyal. */
export const KASUS_MIN_SINYAL_HARIAN = 10;

/**
 * Kasus minimum (7 hari, per penyakit) agar rasio boleh menaikkan status
 * Waspada. Tanpa ini, desa dengan 1 kasus dan baseline 0 akan selalu
 * terlihat "naik". Nilai ini diambil dari konstanta bersama di atas.
 */
export const KASUS_MIN_WASPADA_HARIAN = KASUS_MIN_WASPADA;

/**
 * Kasus minimum (1 minggu, per penyakit) agar rasio boleh menaikkan status
 * Waspada di rekap SKDR mingguan. Sama dengan KASUS_MIN_WASPADA, dan sengaja
 * TIDAK memakai `kasusMin` per penyakit, karena angka itu untuk kriteria KLB
 * (5 / 40 / 3 / 3) dan nilainya terlalu besar untuk diare.
 */
export const KASUS_MIN_WASPADA_SKDR = KASUS_MIN_WASPADA;

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

/** Ringkasan aturan yang berlaku di kedua lapis, untuk UI dan halaman Konsep. */
export const ATURAN_WASPADA = {
  kasusMin: KASUS_MIN_WASPADA,
  alasan:
    "Status Waspada memerlukan minimal 3 kasus penyakit itu dalam periode yang " +
    "dinilai, dan berlaku sama di lapis harian (7 hari per desa) maupun lapis " +
    "SKDR (1 minggu per kecamatan). Satu angka untuk semua penyakit. Tanpa " +
    "syarat ini, 1 kasus melawan baseline yang kecil menghasilkan rasio besar " +
    "yang tidak bermakna, dan peringatan menyala berulang tanpa informasi baru.",
} as const;
