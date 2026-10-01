import { AMBANG, KASUS_MIN_SINYAL_HARIAN } from "@/data/ambang";
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
 *  - "Hari lebih awal dibanding rekap mingguan" DIUKUR DARI ATURAN RASIO
 *    terhadap baseline saja. Badge status di dashboard memakai dua aturan
 *    sekaligus (rasio ATAU insidensi, lihat statusPerDesa), jadi ada desa
 *    yang badge-nya "Sinyal" karena insidensi saja -- kasusnya belum cukup
 *    untuk aturan rasio. Desa seperti itu tidak bisa ditanggalkan oleh tabel
 *    ini, dan ditulis "belum diukur" beserta alasannya, bukan diberi tanggal
 *    hasil tebakan. Angka "lebih awal" yang dipakai di proposal karena itu
 *    selalu berasal dari desa yang sinyalnya terpicu rasio.
 *  - Jumlah penduduk desa di sini adalah alokasi proporsional dari penduduk
 *    kecamatan (perkiraan, lihat src/data/populasi-desa.ts), bukan angka resmi
 *    per desa. Aturan insidensi yang memakainya tetap dipakai di dashboard,
 *    dan status sumber datanya ditulis terbuka di UI.
 *  - Asumsi "lebih awal": rekap mingguan baru lengkap pada hari Minggu yang
 *    menutup minggu ISO. Asumsi ini ditulis di UI, bukan disembunyikan di sini.
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
 *
 * Aturan yang dipakai HANYA rasio terhadap baseline. Badge "Sinyal" di
 * dashboard boleh muncul dari aturan insidensi, dan desa seperti itu tidak
 * bisa ditanggalkan di sini -- lihat catatan `pemicuDariInsidensi` di bawah.
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
      // Syarat kasus minimum yang sama dengan statusPerDesa. Kalau aturan
      // berbeda, tanggal sinyal di sini tidak akan cocok dengan badge di
      // dashboard, dan angka "hari lebih awal" jadi tidak bisa dipercaya.
      if (rasio >= ambang.rasioKLB && ini >= KASUS_MIN_SINYAL_HARIAN) {
        tanggalSinyal = t;
        break;
      }
    }

    /**
     * Badge Sinyal pada 7 hari terakhir berasal dari aturan mana? Dipakai
     * hanya untuk menulis catatan yang jujur.
     *
     * Kalau badge-nya muncul dari aturan insidensi saja (kasus belum cukup
     * untuk aturan rasio), tabel ini tidak akan pernah menemukan hari
     * sinyalnya -- dan itu bukan cacat perhitungan, melainkan perbedaan
     * cakupan yang harus dinyatakan di UI, bukan disembunyikan.
     */
    const pemicuHariIni = d.perPenyakit.find((p) => p.penyakit === penyakit);
    const pemicuDariInsidensi =
      !!pemicuHariIni &&
      pemicuHariIni.level === "Sinyal" &&
      pemicuHariIni.insidensi !== null &&
      pemicuHariIni.insidensi >= ambang.insidensiMin &&
      !(
        pemicuHariIni.rasio >= ambang.rasioKLB && pemicuHariIni.mingguIni >= KASUS_MIN_SINYAL_HARIAN
      );

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
        return pemicuDariInsidensi
          ? `Status Sinyal desa ini berasal dari aturan insidensi (ambang ${ambang.insidensiMin}/100.000/mgg), bukan dari aturan rasio terhadap baseline, sehingga tanggal sinyal tidak bisa dihitung dari tabel ini. Angka "lebih awal dari rekap" sengaja hanya diukur dengan aturan rasio.`
          : "Tidak ada hari dalam jendela observasi yang melewati ambang untuk desa dan penyakit ini, sehingga waktu kemunculan sinyal tidak bisa dihitung.";
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
      "Catat satu kolom waktu verifikasi (jam dan menit) saat status laporan berubah menjadi Terverifikasi di halaman Verifikasi, lalu tampilkan selisihnya terhadap tanggal lapor.",
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
