/**
 * Status tutup banner demo, disimpan di sessionStorage.
 *
 * Tugas: tombol tutup (X) pada banner, dan status itu bertahan selama tab
 * yang sama -- berpindah halaman maupun reload. sessionStorage dipilih,
 * bukan localStorage, karena banner harus muncul lagi di tab atau sesi
 * peramban yang baru.
 *
 * Seluruh akses penyimpanan dibungkus try/catch: bila storage gagal dibaca
 * atau ditulis (misalnya mode privat yang menolak akses), fungsi ini diam
 * dan banner tetap tampil seperti seharusnya.
 */

/** Kunci sessionStorage untuk status "banner demo ditutup". */
export const KUNCI_BANNER_DEMO = "sidini:banner-demo:tertutup";

/** Bentuk storage yang dipakai komponen; kompatibel dengan sessionStorage. */
export interface PenyimpananSesi {
  getItem(kunci: string): string | null;
  setItem(kunci: string, nilai: string): void;
}

export type PenyimpananSesiOpsi = PenyimpananSesi | null | undefined;

/**
 * Baca status tertutup. Bila storage tidak tersedia atau melempar galat,
 * hasilnya false -- banner tetap tampil.
 */
export function bacaStatusTertutup(storage: PenyimpananSesiOpsi): boolean {
  try {
    return storage?.getItem(KUNCI_BANNER_DEMO) === "1";
  } catch {
    return false;
  }
}

/**
 * Simpan status tertutup. Gagal menulis tidak dianggap kegagalan: banner
 * hanya muncul lagi di kunjungan berikutnya.
 */
export function tulisStatusTertutup(storage: PenyimpananSesiOpsi): void {
  try {
    storage?.setItem(KUNCI_BANNER_DEMO, "1");
  } catch {
    // diam: storage tidak tersedia; banner tetap tampil.
  }
}

/**
 * Keputusan render banner: hanya tampil setelah status storage terbaca dan
 * belum ditutup. Sebelum terbaca, banner tidak dirender supaya tidak ada
 * kedipan saat hidrasi memutuskan harus tertutup.
 */
export function haruskahTampil(terbaca: boolean, tertutup: boolean): boolean {
  return terbaca && !tertutup;
}
