import { AMBANG } from "@/data/ambang";
import { JUMLAH_HARI, type Kasus, type Penyakit } from "@/data/dataset";
import { kasusValid, rentangHari, type StatusDesa } from "@/lib/analitik";

/**
 * Metrik dampak: seberapa cepat lapis harian melihat masalah, dan seberapa
 * jauh lebih cepat dibanding rekap mingguan.
 *
 * Aturan yang dipegang modul ini:
 *
 *  1) TIDAK ADA ANGKA YANG DIBUAT. Setiap metrik dihitung dari data kasus yang
 *     ada, atau dinyatakan "belum diukur". Kalau data yang dibutuhkan tidak
 *     ada, hasilnya null, bukan perkiraan.
 *  2) Semua angka berasal dari DATA SIMULASI, jadi setiap metrik di UI
 *     dilabeli "simulasi". Mengukur dampak nyata memerlukan data pelaporan
 *     puskesmas yang sebenarnya.
 *  3) Ambang yang dipakai PERSIS sama dengan lapis SKDR (src/data/ambang.ts).
 *     Tidak ada angka ambang baru di modul ini.
 *
 * Batasan yang perlu diketahui pembaca:
 *
 *  - Pemeriksaan historis sinyal hanya bisa memakai aturan rasio terhadap
 *    baseline, karena jumlah penduduk desa belum tersedia sehingga insidensi
 *    bernilai null (src/data/populasi-desa.ts). Kalau suatu desa hanya
 *    melewati ambang insidensi, sinyal historisnya tidak akan ditemukan.
 *  - "Hari lebih awal dibanding rekap mingguan" memakai asumsi bahwa rekap
 *    mingguan baru lengkap pada hari Minggu yang menutup minggu ISO. Asumsi
 *    ini ditulis di UI, bukan disembunyikan di sini.
 */

function tambahHari(iso: string, hari: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

function selisihHari(kiri: string, kanan: string): number {
  return (
    (new Date(`${kiri}T00:00:00Z`).getTime() - new Date(`${kanan}T00:00:00Z`).getTime()) /
    86_400_000
  );
}

/** Jumlah kasus dengan onset di dalam jendela yang berakhir di `akhir`. */
function jendela(kasus: Kasus[], akhir: string, hari: number): Kasus[] {
  const awal = tambahHari(akhir, -(hari - 1));
  return kasus.filter((k) => k.tanggalOnset >= awal && k.tanggalOnset <= akhir);
}

/**
 * Hari dalam minggu ISO: 0 = Senin ... 6 = Minggu. Sama dengan konvensi
 * minggu di src/components/FilterSKDRBar.tsx.
 */
export function hariDalamMingguISO(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

/** Tanggal Minggu yang menutup minggu ISO berisi `iso`. */
export function akhirMingguISO(iso: string): string {
  return tambahHari(iso, 6 - hariDalamMingguISO(iso));
}

/* ------------------------------------------------------------------ *
 * 1. Keterlambatan pelaporan
 * ------------------------------------------------------------------ */

export interface SebaranKeterlambatan {
  /** jumlah kasus yang diukur; kasus dengan tanggal lapor sebelum onset tidak dihitung */
  jumlah: number;
  /** kasus yang tidak bisa diukur, misal tanggal lapor lebih dulu dari onset */
  tidakTerukur: number;
  rata: number;
  median: number;
  p90: number;
  maks: number;
}

/**
 * Sebaran selisih hari antara tanggal onset gejala dan tanggal laporan.
 *
 * Angka ini adalah PROXY, bukan waktu tanggap petugas: yang diukur hanya
 * jarak antara dua tanggal di dalam data. Waktu tanggap yang sebenarnya
 * butuh stempel waktu peristiwa, yang tidak ada di prototipe ini.
 */
export function keterlambatanLapor(kasus: Kasus[]): SebaranKeterlambatan {
  const selisih: number[] = [];
  let tidakTerukur = 0;
  for (const k of kasus) {
    const d = selisihHari(k.tanggalLapor, k.tanggalOnset);
    if (Number.isNaN(d) || d < 0) {
      tidakTerukur += 1;
      continue;
    }
    selisih.push(d);
  }
  if (selisih.length === 0) {
    return { jumlah: 0, tidakTerukur, rata: 0, median: 0, p90: 0, maks: 0 };
  }
  const urut = [...selisih].sort((a, b) => a - b);
  const pada = (q: number) => urut[Math.min(urut.length - 1, Math.floor(q * urut.length))]!;
  return {
    jumlah: selisih.length,
    tidakTerukur,
    rata: Number((selisih.reduce((a, b) => a + b, 0) / selisih.length).toFixed(2)),
    median: pada(0.5),
    p90: pada(0.9),
    maks: urut[urut.length - 1]!,
  };
}

/* ------------------------------------------------------------------ *
 * 2. Waktu deteksi: kapan sinyal harian muncul untuk sebuah desa
 * ------------------------------------------------------------------ */

export interface DeteksiDesa {
  kode: string;
  desa: string;
  kecamatan: string;
  penyakit: Penyakit;
  /**
   * null berarti sinyal sudah aktif pada hari pertama jendela observasi, jadi
   * waktu kemunculannya tidak bisa ditentukan dari data yang ada.
   */
  tanggalSinyal: string | null;
  /** kasus penyakit ini dalam 7 hari saat sinyal pertama muncul */
  kasusSaatSinyal: number;
  /** onset kasus pertama pada jendela sinyal */
  onsetPertama: string | null;
  /** hari dari onset kasus pertama sampai sinyal muncul */
  hariDariOnset: number | null;
  /** hari Minggu yang menutup minggu ISO dari tanggal sinyal */
  tanggalRekapMingguan: string | null;
  /** berapa hari lebih awal lapis harian melihat disbanding rekap mingguan */
  hariLebihAwal: number | null;
  /**
   * true bila sinyal sudah melewati ambang pada hari pertama jendela
   * observasi. Dalam keadaan itu kemunculan sinyal bisa saja lebih awal dari
   * data yang tersedia, jadi angka turunan dibiarkan null.
   */
  tepiJendela: boolean;
  /** alasan angka tidak bisa dihitung, bila ada */
  catatan: string | null;
}

/**
 * Waktu deteksi per desa yang sekarang berstatus Sinyal.
 *
 * Cara kerjanya: telusuri hari-hari dalam jendela observasi dari lama ke baru.
 * Hari pertama ketika jumlah kasus 7 hari (rasio terhadap tiga jendela
 * sebelumnya, ambang penyakit yang sama) melewati ambang KLB dianggap sebagai
 * hari sinyal muncul.
 */
export function waktuDeteksi(kasus: Kasus[], status: StatusDesa[]): DeteksiDesa[] {
  const valid = kasusValid(kasus);
  const hari = rentangHari(JUMLAH_HARI);
  const hasil: DeteksiDesa[] = [];

  for (const d of status) {
    if (d.level !== "Sinyal" || d.penyakitPemicu === null) continue;
    const penyakit = d.penyakitPemicu;
    const ambang = AMBANG[penyakit];
    const milikDesa = valid.filter((k) => k.kodeDesa === d.kode);

    let tanggalSinyal: string | null = null;
    for (const t of hari) {
      const ini = jendela(milikDesa, t, 7).filter((k) => k.penyakit === penyakit).length;
      const base =
        [7, 14, 21].reduce((acc, off) => {
          const akhir = tambahHari(t, -off);
          return acc + jendela(milikDesa, akhir, 7).filter((k) => k.penyakit === penyakit).length;
        }, 0) / 3;
      const rasio = base > 0 ? ini / base : ini > 0 ? 99 : 0;
      if (rasio >= ambang.rasioKLB && ini >= ambang.kasusMin) {
        tanggalSinyal = t;
        break;
      }
    }

    let onsetPertama: string | null = null;
    let kasusSaatSinyal = 0;
    if (tanggalSinyal) {
      const j7 = jendela(milikDesa, tanggalSinyal, 7).filter((k) => k.penyakit === penyakit);
      kasusSaatSinyal = j7.length;
      onsetPertama = j7.map((k) => k.tanggalOnset).sort()[0] ?? null;
    }

    // Sinyal yang sudah aktif pada hari pertama jendela observasi tidak bisa
    // ditanggalkan dengan jujur: Crossing-nya bisa saja terjadi sebelum data
    // yang tersedia dimulai. Kasus seperti ini ditandai, bukan diberi angka.
    const tepiJendela = tanggalSinyal !== null && tanggalSinyal === hari[0];

    const catatan = ((): string | null => {
      if (tanggalSinyal === null) {
        return "Tidak ada hari dalam jendela observasi yang melewati ambang untuk desa dan penyakit ini, sehingga waktu kemunculan sinyal tidak bisa dihitung.";
      }
      if (tepiJendela) {
        return "Sinyal sudah melewati ambang pada hari pertama jendela observasi, jadi kemunculannya bisa saja lebih awal dari data yang tersedia.";
      }
      if (onsetPertama === null) {
        return "Tidak ada kasus dengan onset pada jendela sinyal, sehingga tanggal onset pertama tidak tersedia.";
      }
      return null;
    })();

    // Nilai turunan hanya dihitung kalau tanggalnya benar-benar ada dan sinyal
    // tidak bersinggungan dengan tepi jendela. Selain itu dibiarkan null supaya
    // UI bisa menulis "belum diukur", bukan menampilkan angka hasil tebakan.
    const bisa = tanggalSinyal !== null && onsetPertama !== null && !tepiJendela;
    const tanggalRekap = bisa && tanggalSinyal !== null ? akhirMingguISO(tanggalSinyal) : null;
    const hariDariOnset =
      bisa && tanggalSinyal !== null && onsetPertama !== null
        ? selisihHari(tanggalSinyal, onsetPertama)
        : null;
    const hariLebihAwal =
      tanggalRekap !== null && tanggalSinyal !== null
        ? selisihHari(tanggalRekap, tanggalSinyal)
        : null;

    hasil.push({
      kode: d.kode,
      desa: d.desa,
      kecamatan: d.kecamatan,
      penyakit,
      tanggalSinyal,
      kasusSaatSinyal,
      onsetPertama,
      hariDariOnset,
      tanggalRekapMingguan: tanggalRekap,
      hariLebihAwal,
      tepiJendela,
      catatan,
    });
  }

  return hasil.sort((a, b) => (b.hariLebihAwal ?? -1) - (a.hariLebihAwal ?? -1));
}

/* ------------------------------------------------------------------ *
 * 3. Metrik yang belum bisa diukur, dan cara mengukurnya
 * ------------------------------------------------------------------ */

export interface MetrikBelumTerukur {
  nama: string;
  /** kenapa angka ini tidak boleh ditampilkan sekarang */
  alasan: string;
  /** apa yang harus dicatat supaya metrik ini bisa dihitung */
  caraMengukur: string;
}

/**
 * Metrik yang sering diklaim sistem surveilans, tetapi TIDAK bisa dihitung dari
 * data prototipe ini. Dicantumkan supaya kekosongannya terlihat dan supaya
 * halaman Konsep bisa menjelaskan cara mengukurnya, bukan diam saja.
 */
export const METRIK_BELUM_TERUKUR: MetrikBelumTerukur[] = [
  {
    nama: "Waktu verifikasi laporan warga",
    alasan:
      "Data kasus hanya menyimpan tanggal onset dan tanggal lapor, tidak ada stempel waktu saat petugas memverifikasi.",
    caraMengukur:
      "Catat satu kolom waktuVerifikasi (jam dan menit) saat status laporan berubah menjadi Terverifikasi di halaman Verifikasi, lalu tampilkan selisihnya terhadap tanggal lapor.",
  },
  {
    nama: "Waktu tanggap lapis cepat",
    alasan:
      "Prototipe tidak mencatat peristiwa respons apa pun: tidak ada kolom yang menyatakan kapan petugas menerima tahu, kapan berangkat, dan kapan penanganan selesai.",
    caraMengukur:
      "Tambahkan stempel waktu terima, berangkat, dan selesai pada tiap sinyal desa, lalu laporkan selisih antar stempel tersebut.",
  },
  {
    nama: "Kepatuhan pelaporan puskesmas",
    alasan:
      "Tidak ada jadwal pelaporan per puskesmas di data, sehingga tidak ada angka pembanding.",
    caraMengukur:
      "Tetapkan jadwal wajib lapor (misalnya setiap hari kerja), hitung jumlah hari tepat waktu per puskesmas, lalu bandingkan dengan jumlah hari kerja.",
  },
  {
    nama: "Deteksi dini dibanding surveilans rutin",
    alasan: "Tidak ada data surveilans rutin (misalnya rekap bulanan Dinkes) untuk dibandingkan.",
    caraMengukur:
      "Masukkan rekap bulanan kasus per desa sebagai dataset terpisah, lalu bandingkan tanggal sinyal pertama lapis harian dengan tanggal bulanan ketika desa itu tercatat.",
  },
];
