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
  /** Kasus absolut minimum per minggu (mencegah alert fatigue di kecamatan kecil) */
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
      "satu kematian tetap menaikkan status minimal ke Waspada. Acuan: " +
      "Pedoman Penanganan Kejadian Luar Biasa Kemenkes.",
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
      "ditambah lantai insidensi, supaya wilayah besar tidak memicu alarm palsu.",
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
      "lebih rendah: penyakit ini bisa meledak cepat pada musim hujan.",
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
      "lantai absolut agar klaster kecil di daerah padat tetap terlihat.",
    sumber: "Belum tercatat dalam pedoman nasional tunggal (ambang operasional).",
    statusSumber: "perlu verifikasi acuan Dinkes",
  },
};

export type Ambang = AmbangSKDR;
export const AMBANG = AMBANG_SKDR; // alias backward compatible
