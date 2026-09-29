import { JUMLAH_HARI, TANGGAL_ACUAN } from "@/data/dataset";

/**
 * Validasi formulir pelaporan kasus (kanal puskesmas dan kanal warga).
 *
 * Dua aturan yang sebelumnya hanya ada di antarmuka (atribut min/max) tetapi
 * tidak diperiksa ulang saat submit:
 *
 *  1) Jumlah kasus dibatasi 1-20. Nilai di luar itu tetap tersimpan karena
 *     perulangan addition memakai clamp, tetapi toast menampilkan angka yang
 *     diketik lengkap. Akibatnya petugas melihat "50 kasus masuk" padahal
 *     yang tersimpan 20.
 *  2) Tanggal onset wajib diisi dan harus berada di dalam rentang observasi.
 *     Formulir bisa menerima onset kosong, yang membuat kasus tersimpan tanpa
 *     tanggal dan tidak pernah masuk perhitungan mana pun.
 *
 * Semua aturan di sini murni supaya bisa diuji tanpa merender formulir.
 */

/** Batas jumlah kasus yang diterima per entri massal. */
export const BATAS_JUMLAH_KASUS = { min: 1, max: 20 } as const;

/** Jumlah kasus yang benar-benar akan disimpan untuk nilai masukan tertentu. */
export function jumlahKasusTersimpan(masuk: number): number {
  // NaN terjadi saat kolom angka dikosongkan; dianggap 1. Infinity tetap
  // dijepit oleh batas maksimum di bawah.
  if (Number.isNaN(masuk)) return BATAS_JUMLAH_KASUS.min;
  return Math.min(BATAS_JUMLAH_KASUS.max, Math.max(BATAS_JUMLAH_KASUS.min, Math.trunc(masuk)));
}

/** Tanggal onset paling awal yang masih berada di dalam rentang observasi. */
export function onsetTerawal(acakuan: string = TANGGAL_ACUAN): string {
  const d = new Date(acakuan + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - (JUMLAH_HARI - 1));
  return d.toISOString().slice(0, 10);
}

export type HasilValidasi = { ok: true } | { ok: false; pesan: string };

/**
 * Periksa tanggal onset gejala.
 *
 * `acakuan` adalah tanggal akhir observasi (default TANGGAL_ACUAN), dipakai
 * supaya aturan ini bisa diuji tanpa bergantung pada jam sistem.
 */
export function validasiOnset(iso: string, acakuan: string = TANGGAL_ACUAN): HasilValidasi {
  if (!iso) {
    return { ok: false, pesan: "Tanggal onset gejala wajib diisi." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { ok: false, pesan: "Tanggal onset gejala tidak valid." };
  }
  if (iso > acakuan) {
    return {
      ok: false,
      pesan: `Tanggal onset tidak boleh melewati tanggal acuan data (${acakuan}).`,
    };
  }
  const terawal = onsetTerawal(acakuan);
  if (iso < terawal) {
    return {
      ok: false,
      pesan: `Tanggal onset lebih tua dari rentang observasi (${terawal} sampai ${acakuan}).`,
    };
  }
  return { ok: true };
}
