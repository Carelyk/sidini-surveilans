// ============================================================================
// SKDR — Sistem Kewaspadaan Dini dan Respon (Kemenkes RI)
//
// Di Indonesia SKDR adalah FORMULIR AGREGAT MINGGUAN yang diisi puskesmas
// (bukan catatan kasus per pasien). Karena itu modul ini memakai struktur
// agregat: { tahun, minggu, kecamatan, penyakit, penderita, meninggal } —
// persis seperti lembar SKDR sungguhan, dan memisahkan penyakit satu sama
// lain (KLB tidak boleh mengcampurkan DBD dengan diare).
//
// ANGGARAN DATA — baca dulu sebelum memakai:
//   * Batas wilayah, kode kecamatan, nama desa  : ASLI (lihat wilayah.ts)
//   * Jumlah penduduk total                     : ASLI (BPS, 3.873.653)
//   * Angka kasus penyakit                      : SINTETIS, diskalakan ke
//     angka resmi Dinkes Jawa Barat sebagai jangkar (lihat ANGKA_ACUAN),
//     dengan pengecualian diare (lihat TARGET_TAHUNAN).
//     Tidak ada sumber publik untuk data SKDR per-kecamatan per-minggu -
//     data itu berada di sistem Kemenkes yang tidak dipublikasikan.
//   * Distribusi per kecamatan                  : dimodelkan, proporsional
//     terhadap penduduk, dengan penandaan "rawan" dengue yang dikuatkan
//     pada 4 kecamatan (lihat KECAMATAN_RAWAN) untuk demonstrasi logika
//     KLB. Pengali itu hanya berlaku untuk penyakit yang ditularkan lewat
//     vektor; diare dan Hepatitis A tidak mendapat pengali (lihat
//     PENGALI_RAWAN).

import { KECAMATAN, TOTAL_PENDUDUK } from "./wilayah";

export type Penyakit = "DBD" | "Diare" | "Chikungunya" | "Hepatitis A";
export type KelompokUmur = "0-4" | "5-14" | "15-44" | "45-64" | "65+";

export const PENYAKIT: Penyakit[] = ["DBD", "Diare", "Chikungunya", "Hepatitis A"];
export const KELOMPOK_UMUR: KelompokUmur[] = ["0-4", "5-14", "15-44", "45-64", "65+"];

export const TAHUN_SKDR: number[] = [2025, 2026];
export const JUMLAH_MINGGU = 52;

/**
 * Jangkar angka resmi yang bisa diverifikasi publik.
 * Sumber: opendata.jabarprov.go.id — Dinkes Jawa Barat,
 * "Jumlah Kasus Penyakit ... Berdasarkan Kabupaten/Kota di Jawa Barat".
 * Hanya tahun 2016 yang benar-benar terverifikasi; dipakai sebagai jangkar
 * untuk menentukan ORDUK BESARSKALA data demonstrasi, bukan sebagai data
 * mingguan.
 */
export const ANGKA_ACUAN = {
  sumber: "opendata.jabarprov.go.id, Dinkes Jawa Barat (2016, terverifikasi)",
  tahun: 2016,
  dbdKabupatenBandung: 3466,
  diareKabupatenBandung: 90337,
} as const;

/**
 * Target kasus tahunan untuk data demonstrasi (skala jangkar + tren nasional).
 *
 * PENTING untuk Diare: target ini sengaja DI BAWAH jangkar resmi
 * ANGKA_ACUAN.diareKabupatenBandung (90.337). Alasannya dinyatakan terbuka,
 * bukan disembunyikan:
 *
 * Jangkar 90.337 kasus setahun di 31 kecamatan berarti sekitar 4,5 kasus per
 * 100.000 penduduk per minggu. Ambang KLB diare yang dipakai sistem adalah
 * 100 per 100.000 per minggu, jadi jangkar itu ~22x di bawah ambang. Kalau
 * kasus dibuat sebesar jangkar penuh DAN dikonsentrasikan di kecamatan
 * rawan (seperti versi sebelumnya), insidensi mingguan di kecamatan itu
 * selalu di atas ambang -- 2026 berstatus KLB di 39 dari 39 minggu, dan 52
 * dari 52 minggu sebelum deret dipotong. Ambang seperti itu tidak lagi
 * menanda apa pun: "KLB" jadi setara dengan "ada kasus".
 *
 * Karena itu level simulasi diare diturunkan, dan satu outbreak yang
 * disengaja ditambahkan di SEMU_KEJADIAN. Hasilnya: latar tenang (Mgg
 * Waspada 2), satu wabah yang jelas (Mgg KLB 4).
 *
 * Ini level SIMULASI, bukan perkiraan epidemiologi. Kalau nanti dipakai
 * untuk keputusan nyata, level dan ambangnya harus disepakati bersama Dinkes
 * lebih dulu.
 */
export const TARGET_TAHUNAN: Record<Penyakit, number> = {
  DBD: 4900,
  Diare: 35000,
  Chikungunya: 620,
  "Hepatitis A": 310,
};

/**
 * Case fatality ratio per penyakit. DBD di Indonesia ~1,1% (Kemenkes);
 * angka kematian DBD Kabupaten Bandung 25 orang Jan-Apr 2024 (Dinkes Jabar)
 * konsisten dengan CFR ini. Penyakit lain jauh lebih rendah.
 */
const CFR: Record<Penyakit, number> = {
  DBD: 0.011,
  Diare: 0.00012,
  Chikungunya: 0.002,
  "Hepatitis A": 0.0018,
};

/**
 * Kurva musiman dengue Indonesia. Puncak utama Januari-Maret (musim hujan),
 * puncak kedua Oktober-November, titik terendah Agustus.
 * Indeks 0 = minggu 1 (awal Januari).
 */
function musimanDengue(minggu: number): number {
  const puncak1 = Math.exp(-((minggu - 7) ** 2) / (2 * 4.2 ** 2));
  const puncak2 = Math.exp(-((minggu - 44) ** 2) / (2 * 3.4 ** 2));
  return 0.22 + 0.78 * (0.78 * puncak1 + 0.22 * puncak2);
}

/** Diare sepanjang tahunrelative datar, sedikit naik saat musim hujan. */
function musimanDiare(minggu: number): number {
  return 0.85 + 0.3 * musimanDengue(minggu);
}

/**
 * Kecamatan yang diberi rawan dengue buatan untuk demonstrasi logika KLB:
 * kasus di sini secara sengaja lebih tinggi dari proporsinya terhadap
 * penduduk, tetapi TIDAK sampai ke tingkat outbreak. Status "rawan"
 * dinyatakan terbuka di UI, tidak disamarkan sebagai data asli.
 */
export const KECAMATAN_RAWAN = ["Soreang", "Cileunyi", "Cimenyan", "Rancaekek"];

/**
 * Pengali yang didapat kecamatan di KECAMATAN_RAWAN, per penyakit.
 *
 * Bonus hanya berlaku untuk penyakit yang ditularkan lewat vektor: DBD dan
 * Chikungunya. Yang penting: bonus TIDAK berlaku untuk Diare dan Hepatitis
 * A. Keduanya
 * ditularkan lewat air dan makanan, bukan lewat nyamuk, jadi tidak wajar
 * kalau kasusnya menumpuk di empat kecamatan yang sama. Membiarkan bonus
 * itu berlaku membuat empat kecamatan tersebut terus melewati ambang
 * insidensi setiap minggu, sehingga "minggu KLB" untuk diare berarti hampir
 * semua minggu -- ambang seperti itu tidak lagi menanda apa pun.
 */
const PENGALI_RAWAN: Record<Penyakit, number> = {
  DBD: 2.4,
  Chikungunya: 2.4,
  Diare: 1,
  "Hepatitis A": 1,
};

/**
 * Skenario outbreak yang DIRANCANG untuk demo, agar ambang KLB benar-benar
 * terlihat bekerja. Tanpa ini seluruh grafik hijau dan demo jadi tidak
 * menunjukkan apa pun. Skenario ini fiktif dan diberi label di UI.
 *
 * Cimenyan padat penduduk dengan kanal lingkungan yang sering membanjir.
 * Skenario ini meniru pola ledakan dengue yang pernah terjadi di kawasan
 * kumuh Jawa Barat. Skenario fiktif, diberi label di antarmuka.
 */
export interface SkenarioKejadian {
  /** Nama kecamatan (mengikuti wilayah.ts) */
  kecamatan: string;
  penyakit: Penyakit;
  tahun: number;
  mingguDari: number;
  mingguSampai: number;
  /** Pengali kasus pada jendela tersebut, mis. 6 = enam kali lipatnya */
  pengali: number;
  /** Keterangan yang ditampilkan ke pengguna */
  cerita: string;
}

export const SEMU_KEJADIAN: SkenarioKejadian[] = [
  {
    kecamatan: "Cimenyan",
    penyakit: "DBD",
    tahun: 2026,
    mingguDari: 5,
    mingguSampai: 9,
    pengali: 6,
    cerita:
      "Ledakan dengue di Cimenyan akibat genangan air dan kanal lingkungan" +
      "yang membanjiri. Wabah berlangsung 5 minggu berturut-turut.",
  },
  {
    kecamatan: "Rancaekek",
    penyakit: "DBD",
    tahun: 2025,
    mingguDari: 6,
    mingguSampai: 10,
    pengali: 5,
    cerita:
      "Ledakan dengue di Rancaekek pada musim hujan 2025, terkait genangan" +
      " air di sekitar pasar township.",
  },
  {
    kecamatan: "Cileunyi",
    penyakit: "Diare",
    tahun: 2026,
    mingguDari: 34,
    mingguSampai: 38,
    pengali: 7,
    cerita:
      "Lonjakan diare di Cileunyi pada Agustus-September 2026, terkait gangguan" +
      " layanan air bersih saat kemarau. Disimulasikan agar ambang KLB diare" +
      " terlihat bekerja di atas latar yang tenang.",
  },
];

/** Pengali tambahan dari SEMU_KEJADIAN untuk satu sel. */
function pengaliKejadian(
  tahun: number,
  minggu: number,
  kodeKecamatan: string,
  penyakit: Penyakit,
): number {
  let pengali = 1;
  for (const s of SEMU_KEJADIAN) {
    if (s.tahun !== tahun || s.penyakit !== penyakit) continue;
    if (minggu < s.mingguDari || minggu > s.mingguSampai) continue;
    if (KECAMATAN.find((k) => k.kode === kodeKecamatan)?.nama !== s.kecamatan) continue;
    pengali *= s.pengali;
  }
  return pengali;
}

function musiman(minggu: number, penyakit: Penyakit): number {
  if (penyakit === "DBD") return musimanDengue(minggu);
  if (penyakit === "Diare") return musimanDiare(minggu);
  // Chikungunya mengikuti dengue (vektor nyamuk yang sama), lebih landai
  if (penyakit === "Chikungunya") return 0.35 + 0.65 * musimanDengue(minggu);
  return 0.9 + 0.2 * musimanDengue(minggu); // Hepatitis A: relatif stabil
}

// ---------- PRNG deterministik ----------
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

/** Hash string -> seed numerik supaya bisa diacak per-kecamatan. */
function hashSeed(s: string, tambahan: number) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h ^ tambahan) >>> 0;
}

export interface BarisSKDR {
  tahun: number;
  /** Minggu epidemiologi 1..52 */
  minggu: number;
  kodeKecamatan: string;
  penyakit: Penyakit;
  penderita: number;
  meninggal: number;
}

/**
 * Alokasi largest-remainder: membagi `total` bilangan bulat ke sel menurut
 * nilai harapan, TANPA mengubah total.
 *
 * Ini wajib dipakai, bukan Math.round per sel. Alasannya: expectation per sel
 * untuk penyakit langka hanya ~0,2 kasus, sehingga pembulatan per sel akan
 * menghapus hampir semua nilai (total Hepatitis A anjlok di 24% dari target).
 * Deaths suffers the same problem far worse: CFR DBD 1,1% dari angka kecil
 * selalu < 0,5 sehingga Math.round selalu mengembalikan 0 — kolom
 * "meninggal" jadi kosong total. Metode sisa terbesar menjamin total tepat.
 */
function alokasi(harapan: number[], total: number): number[] {
  const hasil = harapan.map((h) => Math.floor(Math.max(0, h)));
  const terpakai = hasil.reduce((a, b) => a + b, 0);
  let sisa = Math.round(total) - terpakai;

  const urut = harapan
    .map((h, i) => ({ i, pecahan: Math.max(0, h) - Math.floor(Math.max(0, h)) }))
    .sort((a, b) => b.pecahan - a.pecahan);

  let k = 0;
  while (sisa > 0 && urut.length) {
    const u = urut[k % urut.length]!;
    hasil[u.i] = (hasil[u.i] ?? 0) + 1;
    sisa -= 1;
    k += 1;
  }
  while (sisa < 0 && urut.length) {
    const j = urut[urut.length - 1 - (k % urut.length)]!.i;
    if ((hasil[j] ?? 0) > 0) {
      hasil[j] = hasil[j]! - 1;
      sisa += 1;
    }
    k += 1;
    if (k > urut.length * 4) break; // pengaman
  }
  return hasil;
}

function bangun(): BarisSKDR[] {
  const acak = rng(20260925);
  const hasil: BarisSKDR[] = [];

  for (const tahun of TAHUN_SKDR) {
    // Tren antar tahun: 2026 sedikit lebih tinggi (pola yang lazim di Jawa Barat)
    const trenTahun = tahun === 2026 ? 1.12 : 1.0;

    for (const penyakit of PENYAKIT) {
      const totalPasien = Math.round(TARGET_TAHUNAN[penyakit] * trenTahun);
      const totalMeninggal = Math.round(totalPasien * CFR[penyakit]);

      // 1) bobot kecamatan: proporsional penduduk, dengan bonus 2.4x untuk
      //    kecamatan rawan (demonstrasi KLB) + guncangan acak per kecamatan.
      const bobotKec: Record<string, number> = {};
      let totalBobot = 0;
      for (const k of KECAMATAN) {
        const dasar = k.penduduk / TOTAL_PENDUDUK;
        const bonus = KECAMATAN_RAWAN.includes(k.nama) ? (PENGALI_RAWAN[penyakit] ?? 1) : 1;
        const guncang = 0.55 + 0.9 * rng(hashSeed(k.kode + penyakit, tahun))();
        const b = dasar * bonus * guncang;
        bobotKec[k.kode] = b;
        totalBobot += b;
      }
      for (const k of KECAMATAN) bobotKec[k.kode] = (bobotKec[k.kode] ?? 0) / totalBobot;

      // 2) bobot minggu: musiman, dinormalkan supaya total mingguan = 1
      const bobotMinggu: number[] = [];
      let totalMinggu = 0;
      for (let m = 1; m <= JUMLAH_MINGGU; m++) {
        const w = musiman(m, penyakit);
        bobotMinggu.push(w);
        totalMinggu += w;
      }

      // 3) nilai harapan per sel (pasien & kematian), dengan guncangan
      const sel: { kode: string; minggu: number }[] = [];
      const hopesPasien: number[] = [];
      const hopesMeninggal: number[] = [];
      for (const k of KECAMATAN) {
        for (let m = 1; m <= JUMLAH_MINGGU; m++) {
          const dasar =
            totalPasien * (bobotKec[k.kode] ?? 0) * ((bobotMinggu[m - 1] ?? 0) / totalMinggu);
          // Skenario outbreak mengalikan ekspektasi sel tersebut. Karena
          // alokasi largest-remainder tetap memaksa total tahunan, outbreak
          // ini MENGOROSOKKAN kasus dari minggu lain, bukan menambah
          // kasus di luar jangkar resmi. Itu pilihan sadar: total tahunan
          // adalah angka yang terkalibrasi ke sumber resmi, sehingga tidak
          // boleh berubah hanya karena kita menyalakan demo.
          const pengali = pengaliKejadian(tahun, m, k.kode, penyakit);
          hopesPasien.push(dasar * pengali * (1 + (acak() - 0.5) * 0.5));
          hopesMeninggal.push(dasar * pengali * CFR[penyakit] * (1 + (acak() - 0.5) * 0.7));
          sel.push({ kode: k.kode, minggu: m });
        }
      }

      // 4) alokasi largest-remainder -> total tahunan dijamin persis
      const alPasien = alokasi(hopesPasien, totalPasien);
      const alMeninggal = alokasi(hopesMeninggal, totalMeninggal);

      sel.forEach((s, i) => {
        const penderita = alPasien[i] ?? 0;
        // kematian tidak mungkin melebihi penderita di sel yang sama
        const meninggal = Math.min(alMeninggal[i] ?? 0, penderita);
        hasil.push({
          tahun,
          minggu: s.minggu,
          kodeKecamatan: s.kode,
          penyakit,
          penderita,
          meninggal,
        });
      });
    }
  }

  return hasil;
}

/** Seluruh baris SKDR 2 tahun x 52 minggu x 31 kecamatan x 4 penyakit. */
export const SKDR: BarisSKDR[] = bangun();

export const SKDR_TAHUN = TAHUN_SKDR;
export const SKDR_MINGGU = Array.from({ length: JUMLAH_MINGGU }, (_, i) => i + 1);

export function namaKecamatan(kode: string) {
  return KECAMATAN.find((k) => k.kode === kode)?.nama ?? kode;
}
