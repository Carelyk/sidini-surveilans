// Dataset pelaporan kasus harian — Kabupaten Bandung, Jawa Barat.
//
// WILAYAH NYATA, KASUS SINTETIS.
//   - Nama 23 desa, 8 kecamatan, dan koordinatnya berasal dari data
//     wilayah nyata (GADM 4.1 + Permendagri 72/2019, lihat wilayah.ts).
//   - Seluruh baris kasus di bawah SINTETIS sesuai batasan case pack.
//     Tidak ada satu pun kasus nyata di berkas ini, dan tidak boleh
//     disajikan sebagai data surveilans asli.
//
// Struktur & variabel meniru dataset surveilans DBD/diare Indonesia yang umum
// dipublikasikan (mis. dataset "Indonesia Dengue Cases" di Kaggle: wilayah,
// tanggal, jumlah kasus, kelompok umur).
//
// Untuk angka seluruh 31 kecamatan per penyakit, pakai SKDR di
// src/data/skdr.ts. Dua lapis ini sengaja dipisah: yang di sini kasus
// individu per hari, yang di sana agregat per minggu per kecamatan.

export type Penyakit = "DBD" | "Diare" | "Chikungunya" | "Hepatitis A";

export type StatusKasus = "Baru" | "Investigasi" | "Terverifikasi" | "Selesai" | "Ditolak";

export type Sumber = "Puskesmas" | "Warga";

export interface Desa {
  kode: string;
  nama: string;
  kecamatan: string;
  puskesmas: string;
  penduduk: number;
  lat: number;
  lon: number;
}

export interface Kasus {
  id: string;
  penyakit: Penyakit;
  tanggalOnset: string; // ISO yyyy-mm-dd
  tanggalLapor: string; // ISO yyyy-mm-dd
  puskesmas: string;
  kodeDesa: string;
  desa: string;
  kecamatan: string;
  kelompokUmur: KelompokUmur;
  jenisKelamin: "L" | "P";
  status: StatusKasus;
  sumber: Sumber;
  gejala: string[];
  catatan?: string;
}

export type KelompokUmur = "0-4" | "5-14" | "15-44" | "45-64" | "65+";

export const KELOMPOK_UMUR: KelompokUmur[] = ["0-4", "5-14", "15-44", "45-64", "65+"];
export const PENYAKIT: Penyakit[] = ["DBD", "Diare", "Chikungunya", "Hepatitis A"];

export const GEJALA_UMUM = [
  "Demam",
  "Nyeri otot",
  "Mual / muntah",
  "Diare",
  "Ruam kulit",
  "Nyeri sendi",
  "Mata kuning",
  "Sakit kepala",
  "Bintik merah",
];

/**
 * 23 desa asli di 8 kecamatan Kabupaten Bandung.
 *
 * NAMA desa dan NAMA kecamatan diambil apa adanya dari daftar Permendagri
 * (src/data/wilayah.ts). Kordinat di-generate dari sebaran seragam DI DALAM
 * poligon GADM kecamatan yang bersangkutan -- ini titik yang mewakili letak
 * desa, bukan koordinat balai desa dari BPS, dan tidak boleh dipakai untuk
 * menyorot kasus per desa.
 *
 * Hanya 8 dari 31 kecamatan yang dipakai, agar daftar "status per desa" di
 * dashboard masih terbaca. Delapan kecamatan ini mencakup 30% penduduk
 * kabupaten. Untuk angka seluruh kabupaten per penyakit, pakai SKDR di
 * src/data/skdr.ts yang memuat 31 kecamatan.
 */
export const DESA: Desa[] = [
  {
    kode: "3204060001",
    nama: "Cimenyan",
    kecamatan: "Cimenyan",
    puskesmas: "Puskesmas Cimenyan",
    penduduk: 96195,
    lat: -6.87966,
    lon: 107.67353,
  },
  {
    kode: "3204060002",
    nama: "Cikadut",
    kecamatan: "Cimenyan",
    puskesmas: "Puskesmas Cimenyan",
    penduduk: 96195,
    lat: -6.87806,
    lon: 107.64144,
  },
  {
    kode: "3204060003",
    nama: "Cibeunying",
    kecamatan: "Cimenyan",
    puskesmas: "Puskesmas Cimenyan",
    penduduk: 96195,
    lat: -6.83536,
    lon: 107.69357,
  },
  {
    kode: "3204280004",
    nama: "Rancaekek Kulon",
    kecamatan: "Rancaekek",
    puskesmas: "Puskesmas Rancaekek",
    penduduk: 78705,
    lat: -6.97117,
    lon: 107.77852,
  },
  {
    kode: "3204280005",
    nama: "Rancaekek Wetan",
    kecamatan: "Rancaekek",
    puskesmas: "Puskesmas Rancaekek",
    penduduk: 78705,
    lat: -6.9762,
    lon: 107.71387,
  },
  {
    kode: "3204280006",
    nama: "Bojongloa",
    kecamatan: "Rancaekek",
    puskesmas: "Puskesmas Rancaekek",
    penduduk: 78705,
    lat: -6.99078,
    lon: 107.8058,
  },
  {
    kode: "3204050007",
    nama: "Cileunyi Kulon",
    kecamatan: "Cileunyi",
    puskesmas: "Puskesmas Cileunyi",
    penduduk: 43725,
    lat: -6.92578,
    lon: 107.74287,
  },
  {
    kode: "3204050008",
    nama: "Cileunyi Wetan",
    kecamatan: "Cileunyi",
    puskesmas: "Puskesmas Cileunyi",
    penduduk: 43725,
    lat: -6.95475,
    lon: 107.72087,
  },
  {
    kode: "3204050009",
    nama: "Cimekar",
    kecamatan: "Cileunyi",
    puskesmas: "Puskesmas Cileunyi",
    penduduk: 43725,
    lat: -6.96276,
    lon: 107.72601,
  },
  {
    kode: "3204290010",
    nama: "Cikoneng",
    kecamatan: "Ciparay",
    puskesmas: "Puskesmas Ciparay",
    penduduk: 30608,
    lat: -7.08812,
    lon: 107.68703,
  },
  {
    kode: "3204290011",
    nama: "Mekarsari",
    kecamatan: "Ciparay",
    puskesmas: "Puskesmas Ciparay",
    penduduk: 30608,
    lat: -6.99229,
    lon: 107.70394,
  },
  {
    kode: "3204290012",
    nama: "Ciparay",
    kecamatan: "Ciparay",
    puskesmas: "Puskesmas Ciparay",
    penduduk: 30608,
    lat: -7.00738,
    lon: 107.6939,
  },
  {
    kode: "3204390013",
    nama: "Ciwidey",
    kecamatan: "Ciwidey",
    puskesmas: "Puskesmas Ciwidey",
    penduduk: 34980,
    lat: -7.09103,
    lon: 107.41142,
  },
  {
    kode: "3204390014",
    nama: "Panundaan",
    kecamatan: "Ciwidey",
    puskesmas: "Puskesmas Ciwidey",
    penduduk: 34980,
    lat: -7.0772,
    lon: 107.4195,
  },
  {
    kode: "3204390015",
    nama: "Panyocokan",
    kecamatan: "Ciwidey",
    puskesmas: "Puskesmas Ciwidey",
    penduduk: 34980,
    lat: -7.09686,
    lon: 107.42908,
  },
  {
    kode: "3204330016",
    nama: "Sukamaju",
    kecamatan: "Majalaya",
    puskesmas: "Puskesmas Majalaya",
    penduduk: 26235,
    lat: -7.03729,
    lon: 107.77367,
  },
  {
    kode: "3204330017",
    nama: "Majalaya",
    kecamatan: "Majalaya",
    puskesmas: "Puskesmas Majalaya",
    penduduk: 26235,
    lat: -7.06441,
    lon: 107.74692,
  },
  {
    kode: "3204130018",
    nama: "Banjaran",
    kecamatan: "Banjaran",
    puskesmas: "Puskesmas Banjaran",
    penduduk: 61215,
    lat: -7.08305,
    lon: 107.60832,
  },
  {
    kode: "3204130019",
    nama: "Kamasan",
    kecamatan: "Banjaran",
    puskesmas: "Puskesmas Banjaran",
    penduduk: 61215,
    lat: -7.10378,
    lon: 107.61665,
  },
  {
    kode: "3204130020",
    nama: "Ciapus",
    kecamatan: "Banjaran",
    puskesmas: "Puskesmas Banjaran",
    penduduk: 61215,
    lat: -7.123,
    lon: 107.61665,
  },
  {
    kode: "3204250021",
    nama: "Cicalengka Kulon",
    kecamatan: "Cicalengka",
    puskesmas: "Puskesmas Cicalengka",
    penduduk: 43725,
    lat: -6.98261,
    lon: 107.83558,
  },
  {
    kode: "3204250022",
    nama: "Cicalengka Wetan",
    kecamatan: "Cicalengka",
    puskesmas: "Puskesmas Cicalengka",
    penduduk: 43725,
    lat: -6.98284,
    lon: 107.85427,
  },
  {
    kode: "3204250023",
    nama: "Dampit",
    kecamatan: "Cicalengka",
    puskesmas: "Puskesmas Cicalengka",
    penduduk: 43725,
    lat: -7.00158,
    lon: 107.8469,
  },
];

// ---------- PRNG deterministik (mulberry32) agar data stabil di server & klien ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tanggal acuan dataset (tetap, agar demo konsisten). */
export const TANGGAL_ACUAN = "2026-09-25";
export const JUMLAH_HARI = 42;

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

const GEJALA_PER_PENYAKIT: Record<Penyakit, string[]> = {
  DBD: ["Demam", "Nyeri otot", "Bintik merah", "Sakit kepala"],
  Diare: ["Diare", "Mual / muntah", "Demam"],
  Chikungunya: ["Demam", "Nyeri sendi", "Ruam kulit"],
  "Hepatitis A": ["Mata kuning", "Mual / muntah", "Demam"],
};

/**
 * Intensitas dasar kasus per desa per hari, dikunci pada NAMA DESA.
 *
 * Nilai dipertahankan dari versi Sentosa agar bentuk grafik 28 hari tidak
 * berubah hanya karena nama wilayahnya diganti: Cimenyan 1.1 (terdahulu
 * "Sukamaju"), Rancaekek 0.9 (terdahulu "Rancaekek Girang"), dan seterusnya.
 * Desa tanpa entri memakai 0.5.
 */
const BASE: Record<string, number> = {
  Cimenyan: 1.1,
  Cikadut: 1.1,
  Cibeunying: 1.1,
  "Rancaekek Kulon": 0.9,
  "Rancaekek Wetan": 0.9,
  Bojongloa: 0.9,
  "Cileunyi Kulon": 0.5,
  "Cileunyi Wetan": 0.5,
  Cimekar: 0.5,
  Cikoneng: 0.35,
  Mekarsari: 0.7,
  Ciparay: 0.35,
  Ciwidey: 0.4,
  Panundaan: 0.4,
  Panyocokan: 0.4,
  Sukamaju: 0.3,
  Majalaya: 0.3,
  Banjaran: 0.7,
  Kamasan: 0.7,
  Ciapus: 0.7,
  "Cicalengka Kulon": 0.5,
  "Cicalengka Wetan": 0.5,
  Dampit: 0.5,
};

/**
 * Kecamatan dengan lonjakan yang direkayasa. Dipakai sebagai Skenario, bukan
 * data nyata: dipilih supaya cerita pelaporan harian dan grafik SKDR mingguan
 * menunjuk wilayah yang sama, sehingga narasi AI tidak terlihat bertentangan
 * dengan peta. Cimenyan dan Rancaekek juga punya SEMU_KEJADIAN di
 * src/data/skdr.ts.
 */
const LONJAKAN: Record<string, { sejakHari: number; pengali: number }> = {
  Cimenyan: { sejakHari: 12, pengali: 1 },
  Cikadut: { sejakHari: 12, pengali: 1 },
  Cibeunying: { sejakHari: 12, pengali: 1 },
  "Rancaekek Kulon": { sejakHari: 8, pengali: 1.3 },
  "Rancaekek Wetan": { sejakHari: 8, pengali: 1.3 },
};

export function buatDataset(): Kasus[] {
  const r = rng(20260925);
  const kasus: Kasus[] = [];
  let n = 1;

  for (let hari = JUMLAH_HARI - 1; hari >= 0; hari--) {
    const tanggal = addDays(TANGGAL_ACUAN, -hari);
    const hariKe = JUMLAH_HARI - 1 - hari; // 0 = paling lama

    for (const desa of DESA) {
      let lambda = BASE[desa.nama] ?? 0.5;

      // Lonjakan Cimenyan mulai 12 hari terakhir dan naik 0,35 per hari,
      // sehingga kurva terlihat tumbuh bukan melompat. Rancaekek dinaikkan
      // 1,3x pada 8 hari terakhir supaya menyentuh status Waspada tanpa
      // melewati ambang KLB (rasio 2x baseline dengan minimal 10 kasus).
      const lonjakan = LONJAKAN[desa.nama];
      const sejakLonjakan = JUMLAH_HARI - (lonjakan?.sejakHari ?? 0);
      const lagiLonjak = lonjakan !== undefined && hariKe >= sejakLonjakan && sejakLonjakan > 0;

      if (lonjakan?.pengali === 1) {
        // Cimenyan: 3,4x lalu naik 0,35 per hari
        lambda *= 3.4 + (hariKe - sejakLonjakan) * 0.35;
      } else if (lagiLonjak) {
        lambda *= lonjakan!.pengali;
      }

      const jumlah = Math.floor(lambda + r() * lambda * 1.4);
      for (let i = 0; i < jumlah; i++) {
        // Di kecamatan yang sedang lonjak, DBD mendominasi -- itulah yang
        // membuat klaster bisa diruzat sebagai outbreak dengue, bukan
        // penurunan diare.
        const penyakit: Penyakit = lagiLonjak
          ? r() < 0.82
            ? "DBD"
            : pick(r, PENYAKIT)
          : r() < 0.45
            ? "DBD"
            : r() < 0.75
              ? "Diare"
              : r() < 0.9
                ? "Chikungunya"
                : "Hepatitis A";

        const lagLapor = r() < 0.7 ? 0 : r() < 0.9 ? 1 : 2;
        const sumber: Sumber = r() < 0.72 ? "Puskesmas" : "Warga";
        const status: StatusKasus =
          sumber === "Warga"
            ? r() < 0.55
              ? "Terverifikasi"
              : r() < 0.8
                ? "Investigasi"
                : r() < 0.92
                  ? "Baru"
                  : "Ditolak"
            : r() < 0.6
              ? "Terverifikasi"
              : r() < 0.85
                ? "Selesai"
                : "Investigasi";

        const umur: KelompokUmur =
          penyakit === "DBD"
            ? r() < 0.42
              ? "5-14"
              : r() < 0.7
                ? "15-44"
                : pick(r, KELOMPOK_UMUR)
            : penyakit === "Diare"
              ? r() < 0.45
                ? "0-4"
                : pick(r, KELOMPOK_UMUR)
              : pick(r, KELOMPOK_UMUR);

        kasus.push({
          id: `BB-${String(n++).padStart(5, "0")}`,
          penyakit,
          tanggalOnset: tanggal,
          tanggalLapor: addDays(tanggal, lagLapor),
          puskesmas: desa.puskesmas,
          kodeDesa: desa.kode,
          desa: desa.nama,
          kecamatan: desa.kecamatan,
          kelompokUmur: umur,
          jenisKelamin: r() < 0.5 ? "L" : "P",
          status,
          sumber,
          gejala: GEJALA_PER_PENYAKIT[penyakit].slice(0, 2 + Math.floor(r() * 2)),
        });
      }
    }
  }

  return kasus;
}

export const DATASET_AWAL = buatDataset();
