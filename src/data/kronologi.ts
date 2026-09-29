/**
 * Kronologi data: satu sumber tunggal untuk "kapan data terakhir diperbarui".
 *
 * Audit menemukan tanggal yang ditulis mati di beberapa halaman ("per
 * 2026-09-25", "hari ini") tanpa ada penanda kapan angka itu sebenarnya
 * berasal.Akibatnya pembaca tidak bisa menilai apakah angka di layar masih
 * relevan.
 *
 * Aturan main:
 *  - `TANGGAL_ACUAN` di src/data/dataset.ts tetap acuan AKHIR data kasus
 *    (hari terakhir yang punya kasus). Tidak diubah di sini.
 *  - `PEMBARUAN_TERAKHIR` adalah waktu unggah data, dipakai untuk teks
 *    "diperbarui" dan penanda kedaluwarsa.
 *  - Nomor minggu untuk preset SKDR dihitung dari `PEMBARUAN_TERAKHIR`,
 *    bukan ditulis mati, supaya preset "seminggu terakhir" tidak lagi berarti
 *    minggu 46-52 padahal data terakhirnya minggu 39.
 *
 * KONVENSI: waktu pembaruan ditulis dalam zona WIB (UTC+7) karena data
 * surveilans Kabupaten Bandung dilaporkan hari kerja lokal. Nilai ini
 * sengaja konstan agar demo bisa diulang, bukan diambil dari jam sistem.
 */

/** Waktu data terakhir diunggah, WIB. */
export const PEMBARUAN_TERAKHIR = "2026-09-25T16:30:00+07:00";

/**
 * Batas kedaluwarsa data dalam jam, dapat dikonfigurasi.
 *
 * PENTING: nilai ini tidak lagi dipakai untuk menampilkan peringatan di
 * banner demo. Data prototipe ini statis -- tidak ada unggah otomatis --
 * sehingga setelah 24 jam penanda "kedaluwarsa" akan menyala terus
 * walaupun tidak ada yang perlu diperbarui. Peringatan yang selalu menyala
 * membuat pembaca mengira ada masalah, padahal yang ada hanya ketiadaan
 * data baru. Banner sekarang memakai label tetap
 * `labelSnapshot()` yang menyebut tanggal snapshot secara terbuka.
 *
 * Fungsi dan konstanta ini tetap ada karena dua alasan: (1) test masih
 * memverifikasi perhitungan batasnya, (2) saat prototipe dihubungkan ke
 * sumber data nyata, penanda kedaluwarsa yang seperti ini justru
 * diperlukan. Yang berubah hanya pemakaiannya di UI.
 */
export const BATAS_KEDALUWARSA_JAM = 24;

/** Tanggal (YYYY-MM-DD) dari waktu pembaruan, zona WIB. */
export const TANGGAL_PEMBARUAN = PEMBARUAN_TERAKHIR.slice(0, 10);

/** Jam sejak `PEMBARUAN_TERAKHIR`, pecahan. Negatif bila waktu sistem masih sebelum data. */
export function jamSejakPembaruan(sekarang: Date = new Date()): number {
  const pembaruan = new Date(PEMBARUAN_TERAKHIR).getTime();
  return (sekarang.getTime() - pembaruan) / 3_600_000;
}

/** true bila data melewati batas kedaluwarsa yang dikonfigurasi. */
export function dataKedaluwarsa(sekarang: Date = new Date()): boolean {
  return jamSejakPembaruan(sekarang) >= BATAS_KEDALUWARSA_JAM;
}

/**
 * Label snapshot untuk banner demo: "snapshot simulasi per 25 Sep 2026".
 *
 * Menggantikan penanda "data kedaluwarsa", dan alasannya bukan estetika.
 * Penanda kedaluwarsa mengukur jarak antara waktu unggah dan jam sistem,
 * sedangkan demo ini tidak punya unggah sama sekali. Kalau yang ditunjuk
 * adalah jam sistem yang berjalan terus, bunyi labelnya berubah setiap hari
 * tanpa ada yang diperbarui -- pembaca tidak bisa membedakan "data lama"
 * dengan "data salah".
 *
 * Yang jujur untuk demo statis adalah menyebut tanggal snapshot-nya secara
 * langsung, dan menyatakan bahwa setelah tanggal itu tidak ada data baru.
 */
export function labelSnapshot(): string {
  return `snapshot simulasi per ${formatTanggal(TANGGAL_PEMBARUAN)}`;
}

/** "25 Sep 2026, 16.30 WIB" -- format tetap, sama di server dan peramban. */
export function waktuPembaruan(): string {
  const d = new Date(PEMBARUAN_TERAKHIR);
  const tanggal = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const jam = `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
  return `${tanggal}, ${jam} WIB`;
}

/** Usia data dalam bahasa manusia: "baru saja", "3 jam lalu", "2 hari lalu". */
export function usiaData(sekarang: Date = new Date()): string {
  const jam = jamSejakPembaruan(sekarang);
  if (jam < 1) return "baru saja";
  if (jam < 24) return `${Math.floor(jam)} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

/**
 * Nomor minggu ISO-8601 dari tanggal YYYY-MM-DD.
 *
 * Mengikuti aturan ISO: minggu 1 adalah minggu yang memuat 4 Januari, dan
 * minggu berjalan Senin-Minggu. Ini konvensi yang sama dengan
 * `namaMinggu` di src/components/FilterSKDRBar.tsx.
 */
export function mingguISO(tanggal: string): number {
  const d = new Date(tanggal + "T00:00:00Z");
  const hariKe = (d.getUTCDay() + 6) % 7; // 0 = Senin
  const kamis = new Date(d);
  kamis.setUTCDate(kamis.getUTCDate() - hariKe + 3); // Kamis minggu yang sama
  const awalTahun = new Date(Date.UTC(kamis.getUTCFullYear(), 0, 4));
  const hariKeAwal = (awalTahun.getUTCDay() + 6) % 7;
  const minggu1Senin = new Date(awalTahun);
  minggu1Senin.setUTCDate(minggu1Senin.getUTCDate() - hariKeAwal);
  return Math.round((kamis.getTime() - minggu1Senin.getTime()) / (7 * 86_400_000)) + 1;
}

/** Nomor minggu SKDR tempat data terakhir berada (2026-09-25 = minggu 39). */
export const MINGGU_DATA_TERAKHIR = mingguISO(TANGGAL_PEMBARUAN);

/** Tahun SKDR yang dipakai untuk preset mingguan. */
export const TAHUN_DATA_TERAKHIR = Number(TANGGAL_PEMBARUAN.slice(0, 4));

/**
 * Format tanggal YYYY-MM-DD menjadi "25 Sep 2026".
 *
 * Sengaja memakai timeZone "UTC" supaya hasil render sama persis di server dan
 * peramban. Tanpa itu, tanggal bisa bergeser satu hari dan memicu perbedaan
 * markup.
 */
export function formatTanggal(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
