/**
 * Referensi jumlah penduduk per DESA/KELURAHAN — sumber acuan insidensi lapis harian.
 *
 * ANGGARAN DATA — penting untuk dibaca sebelum mengisi:
 *   Nilai `penduduk` di sini adalah PENYEBUT INSIDENSI per desa. Angka yang
 *   salah tidak hanya membuat kolom "Insidensi/100k" salah: angka itu ikut
 *   menentukan status desa.
 *
 *   POSISI SAAT INI (keputusan 1 Okt 2026): angka per desa DIISI dengan
 *   ALOKASI PROPORSIONAL dari penduduk kecamatan resmi BPS 2025 (penduduk
 *   kecamatan dibagi rata ke jumlah desanya). Ini PERKIRAAN prototipe, bukan
 *   angka resmi per desa: sumber ditulis "perkiraan, perlu verifikasi Dinkes"
 *   dan tidak boleh dibaca sebagai data BPS per desa. Saat ada angka resmi
 *   per desa (podides/Dinkes), ganti nilainya beserta sumber dan tahunnya.
 *
 *   SEBELUM fix ini, nilai penduduk desa di src/data/dataset.ts diambil dari
 *   angka PENDUDUK KECAMATAN lalu disalin ke tiap desa. Akibatnya satu
 *   kecamatan dengan 3 desa dihitung seolah 3x jumlah penduduknya (mis.
 *   Cimenyan 96.195 per desa dari kecamatan 113.982), sehingga insidensi
 *   desa jadi 3x terlalu kecil dan status desa bisa keliru. Angka itu sudah
 *   dihapus dan tidak boleh dipulihkan.
 *
 * VALIDASI (dijalankan otomatis oleh `npm test`):
 *   - jumlah penduduk desa dalam satu kecamatan tidak boleh melebihi
 *     penduduk kecamatan (angka BPS per kecamatan di src/data/wilayah.ts),
 *   - kodeDesa harus dikenal,
 *   - jumlah entri harus sama dengan jumlah desa di src/data/dataset.ts.
 *
 *   Karena kolom sudah terisi, status desa di src/lib/analitik.ts otomatis
 *   memakai aturan insidensi; sumber yang masih menyebut kata "perkiraan"
 *   dijaga oleh tes agar tidak diam-diam dibaca sebagai keputusan Dinkes.
 */
import { DESA } from "./dataset";
import { KECAMATAN_BY_KODE, type Kecamatan } from "./wilayah";

export interface EntriPopulasiDesa {
  /** Kode desa (kode wilayah asli, sama dengan dataset.ts) */
  kodeDesa: string;
  /** Nama desa, untuk-ui saja; tidak dipakai sebagai kunci */
  namaDesa: string;
  /** Kode kecamatan induk, format wilayah.ts (mis. "32.04.06") */
  kodeKecamatan: string;
  /**
   * Jumlah penduduk desa pada tahun acuan.
   * null = belum tersedia; insidensi tidak dihitung dan aturan insidensi
   * tidak dipakai untuk status desa ini.
   */
  penduduk: number | null;
  /** Sumber angka, mis. "BPS, Kecamatan Cimenyan Dalam Angka 2025" */
  sumber: string | null;
  /** Tahun angka penduduk, mis. 2025 */
  tahun: number | null;
}

/**
 * Tabel referensi. Semua nilai `penduduk` sengaja null: belum ada sumber
 * per-desa yang tercatat di repositori, dan angka tidak boleh ditebak.
 * Satu-satunya tugas sekarang: mengisi kolom `penduduk`, `sumber`, `tahun`
 * di bawah dengan angka resmi.
 */
export const POPULASI_DESA: EntriPopulasiDesa[] = [
  // Kecamatan Cimenyan — penduduk 113.982 ÷ 9 desa = 12.665
  {
    kodeDesa: "3204060001",
    namaDesa: "Cimenyan",
    kodeKecamatan: "32.04.06",
    penduduk: 12665,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cimenyan Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204060002",
    namaDesa: "Cikadut",
    kodeKecamatan: "32.04.06",
    penduduk: 12665,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cimenyan Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204060003",
    namaDesa: "Cibeunying",
    kodeKecamatan: "32.04.06",
    penduduk: 12665,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cimenyan Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  // Kecamatan Rancaekek — penduduk 192.921 ÷ 14 desa = 13.780
  {
    kodeDesa: "3204280004",
    namaDesa: "Rancaekek Kulon",
    kodeKecamatan: "32.04.28",
    penduduk: 13780,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Rancaekek Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204280005",
    namaDesa: "Rancaekek Wetan",
    kodeKecamatan: "32.04.28",
    penduduk: 13780,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Rancaekek Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204280006",
    namaDesa: "Bojongloa",
    kodeKecamatan: "32.04.28",
    penduduk: 13780,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Rancaekek Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  // Kecamatan Cileunyi — penduduk 184.397 ÷ 6 desa = 30.733
  {
    kodeDesa: "3204050007",
    namaDesa: "Cileunyi Kulon",
    kodeKecamatan: "32.04.05",
    penduduk: 30733,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cileunyi Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204050008",
    namaDesa: "Cileunyi Wetan",
    kodeKecamatan: "32.04.05",
    penduduk: 30733,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cileunyi Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204050009",
    namaDesa: "Cimekar",
    kodeKecamatan: "32.04.05",
    penduduk: 30733,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cileunyi Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  // Kecamatan Ciparay — penduduk 187.055 ÷ 14 desa = 13.361
  {
    kodeDesa: "3204290010",
    namaDesa: "Cikoneng",
    kodeKecamatan: "32.04.29",
    penduduk: 13361,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Ciparay Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204290011",
    namaDesa: "Mekarsari",
    kodeKecamatan: "32.04.29",
    penduduk: 13361,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Ciparay Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204290012",
    namaDesa: "Ciparay",
    kodeKecamatan: "32.04.29",
    penduduk: 13361,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Ciparay Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  // Kecamatan Ciwidey — penduduk 93.925 ÷ 7 desa = 13.418
  {
    kodeDesa: "3204390013",
    namaDesa: "Ciwidey",
    kodeKecamatan: "32.04.39",
    penduduk: 13418,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Ciwidey Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204390014",
    namaDesa: "Panundaan",
    kodeKecamatan: "32.04.39",
    penduduk: 13418,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Ciwidey Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204390015",
    namaDesa: "Panyocokan",
    kodeKecamatan: "32.04.39",
    penduduk: 13418,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Ciwidey Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  // Kecamatan Majalaya — penduduk 171.781 ÷ 11 desa = 15.616
  {
    kodeDesa: "3204330016",
    namaDesa: "Sukamaju",
    kodeKecamatan: "32.04.33",
    penduduk: 15616,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Majalaya Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204330017",
    namaDesa: "Majalaya",
    kodeKecamatan: "32.04.33",
    penduduk: 15616,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Majalaya Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  // Kecamatan Banjaran — penduduk 143.325 ÷ 11 desa = 13.030
  {
    kodeDesa: "3204130018",
    namaDesa: "Banjaran",
    kodeKecamatan: "32.04.13",
    penduduk: 13030,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Banjaran Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204130019",
    namaDesa: "Kamasan",
    kodeKecamatan: "32.04.13",
    penduduk: 13030,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Banjaran Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204130020",
    namaDesa: "Ciapus",
    kodeKecamatan: "32.04.13",
    penduduk: 13030,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Banjaran Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  // Kecamatan Cicalengka — penduduk 132.543 ÷ 12 desa = 11.045
  {
    kodeDesa: "3204250021",
    namaDesa: "Cicalengka Kulon",
    kodeKecamatan: "32.04.25",
    penduduk: 11045,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cicalengka Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204250022",
    namaDesa: "Cicalengka Wetan",
    kodeKecamatan: "32.04.25",
    penduduk: 11045,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cicalengka Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
  {
    kodeDesa: "3204250023",
    namaDesa: "Dampit",
    kodeKecamatan: "32.04.25",
    penduduk: 11045,
    sumber:
      "Alokasi proporsional dari BPS, Kecamatan Cicalengka Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)",
    tahun: 2025,
  },
];

const PETA_POPULASI = new Map(POPULASI_DESA.map((p) => [p.kodeDesa, p]));

/**
 * Penduduk desa, atau null bila belum tersedia.
 *
 * Mengembalikan null BUKAN 0: 0 akan membuat insidensi tak terhingga (atau
 * NaN), sedangkan null membuat pemanggil mematikan aturan insidensi dan
 * menampilkan "penduduk belum tersedia".
 */
export function pendudukDesa(kodeDesa: string): EntriPopulasiDesa | null {
  return PETA_POPULASI.get(kodeDesa) ?? null;
}

/** Convenience: angka penduduk atau null. */
export function jumlahPendudukDesa(kodeDesa: string): number | null {
  return PETA_POPULASI.get(kodeDesa)?.penduduk ?? null;
}

/** True bila seluruh isi tabel sudah terisi (penduduk + sumber + tahun). */
export function referensiDesaLengkap(): boolean {
  return POPULASI_DESA.every((p) => p.penduduk !== null && p.sumber !== null && p.tahun !== null);
}

export interface HasilValidasi {
  /** daftar pesan galat; array kosong = valid */
  galat: string[];
  /** daftar peringatan, mis. isian belum lengkap */
  peringatan: string[];
}

/**
 * Validasi referensi penduduk desa.
 *
 * Aturan wajib (dari permintaan): jumlah penduduk desa dalam satu kecamatan
 * tidak boleh melebihi penduduk kecamatan. Dua aturan tambahan yang
 * tidak bisa dilanggar kalau tabel ini dipakai sebagai penyebut insidensi:
 *   - kodeDesa harus dikenal (terdaftar di DESA),
 *   - jumlah entri harus sama dengan jumlah desa di src/data/dataset.ts
 *     supaya tidak ada desa yang diam-diam kehilangan penyebut.
 *
 * Parameter `isi` membuat aturan ini bisa diuji dengan data sementara tanpa
 * mengubah tabel produksi. Tanpa parameter, yang divalidasi adalah
 * POPULASI_DESA sebagaimana adanya.
 */
export function validasiReferensiDesa(isi: EntriPopulasiDesa[] = POPULASI_DESA): HasilValidasi {
  const galat: string[] = [];
  const peringatan: string[] = [];

  if (isi.length !== DESA.length) {
    galat.push(
      `Jumlah entri referensi (${isi.length}) harus sama dengan jumlah desa di dataset (${DESA.length}).`,
    );
  }

  const totalPerKecamatan = new Map<string, { jumlah: number; desa: string[] }>();
  const kodeDesaDataset = new Set(DESA.map((d) => d.kode));

  for (const p of isi) {
    if (!kodeDesaDataset.has(p.kodeDesa)) {
      galat.push(`Kode desa "${p.kodeDesa}" (${p.namaDesa}) tidak ada di dataset.`);
      continue;
    }

    if (p.penduduk === null) {
      peringatan.push(`Penduduk ${p.namaDesa} belum tersedia; insidensi desa ini tidak dihitung.`);
      continue;
    }

    if (p.penduduk <= 0) {
      galat.push(`Penduduk ${p.namaDesa} harus lebih dari 0, ditemukan ${p.penduduk}.`);
      continue;
    }

    if (p.sumber === null || p.tahun === null) {
      peringatan.push(
        `Penduduk ${p.namaDesa} terisi tapi sumber/tahun belum dicatat; isi keduanya agar dapat diaudit.`,
      );
    }

    const kec = p.kodeKecamatan;
    const entry = totalPerKecamatan.get(kec) ?? { jumlah: 0, desa: [] };
    entry.jumlah += p.penduduk;
    entry.desa.push(p.namaDesa);
    totalPerKecamatan.set(kec, entry);
  }

  for (const [kodeKec, entry] of totalPerKecamatan) {
    const kec = KECAMATAN_BY_KODE.get(kodeKec) as Kecamatan | undefined;
    if (!kec) {
      galat.push(`Kode kecamatan "${kodeKec}" pada entri ${entry.desa.join(", ")} tidak dikenal.`);
      continue;
    }
    if (entry.jumlah > kec.penduduk) {
      galat.push(
        `Jumlah penduduk desa di ${kec.nama} (${entry.jumlah.toLocaleString("id-ID")}) ` +
          `melebihi penduduk kecamatan (${kec.penduduk.toLocaleString("id-ID")}). ` +
          `Desa terkait: ${entry.desa.join(", ")}.`,
      );
    }
  }

  return { galat, peringatan };
}
