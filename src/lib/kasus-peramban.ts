import { DESA, KELOMPOK_UMUR, type Kasus, type Desa } from "@/data/dataset";
import { bersihkanTeks } from "@/lib/teks-tak-terpercaya";

/**
 * Mengirim kasus dari peramban ke server secara aman.
 *
 * Konteksnya: ringkasan data surveilans sebelumnya dikirim dari peramban
 * sebagai teks bebas (JSON) lalu dipakai server apa adanya. Dua masalahnya:
 *
 *  1) Server tidak bisa memverifikasi angka. Siapa pun bisa mengirim
 *     "ringkasan" berisi angka apa saja, lalu angka itu masuk ke prompt dan
 *     dianalisis seolah-olah data surveilans resmi.
 *  2) Prompt injection. Karena teks peramban masuk ke prompt tanpa perlakuan
 *     khusus, teks yang sengaja ditulis untuk mencurigai model bisa menyuruh
 *     model mengabaikan aturan sistem, termasuk meminta model mengarang angka.
 *
 * Solusinya bukan menyaring teks peramban, tapi membalikkan arah: peramban
 * hanya mengirim DATA KASUS baris demi baris, dan server sendiri yang
 * membangun ringkasan memakai fungsi analitik yang sama dengan dashboard.
 * Dengan begitu angka di prompt selalu berasal dari perhitungan server.
 *
 * Lapisan kedua: nama desa, kecamatan, dan puskesmas TIDAK dipercaya dari
 * peramban. Server menimpanya dengan nilai dari tabel wilayah, sehingga teks
 * bebas dari klien tidak pernah bisa menyamar menjadi nama wilayah resmi.
 * Kalau kode desa tidak dikenal, kasusnya dibuang dan alasannya dilaporkan
 * sebagai jumlah, bukan per kasus.
 */

/** Batas jumlah kasus tambahan yang diterima dalam satu permintaan. */
export const BATAS_KASUS_TAMBAHAN = 3000;

/** Batas panjang tiap teks bebas dan tiap field. */
const MAKS_GEJALA = 60;
const MAKS_CATATAN = 200;
const MAKS_KODE = 20;
const MAKS_ID = 60;
const MAKS_GEJALA_PER_KASUS = 12;

const PENYAKIT_VALID = new Set(["DBD", "Diare", "Chikungunya", "Hepatitis A"]);
// Diturunkan dari tabel kelompok umur yang dipakai modul kasus, bukan ditulis
// ulang di sini. Kalau daftar ini menyimpang dari tabelnya, kasus yang
// ditolak server dan yang diterima bisa berbeda untuk kelompok umur yang sama.
const UMUR_VALID = new Set<string>(KELOMPOK_UMUR);
const STATUS_VALID = new Set(["Baru", "Investigasi", "Terverifikasi", "Ditolak"]);
const SUMBER_VALID = new Set(["Puskesmas", "Warga"]);
const JK_VALID = new Set(["L", "P"]);

const ISO_HARI = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Benar-benar tanggal yang ada di kalender, bukan hanya bentuknya.
 *
 * Bentuk saja tidak cukup: "2026-13-45" cocok dengan pola YYYY-MM-DD, dan
 * kalau lolos, tanggal palsu itu ikut memengaruhi perhitungan keterlambatan
 * lapor. Tanggal diurai lalu dibandingkan balik dengan teks asalnya, sehingga
 * tanggal yang digeser oleh parser (misalnya 30 Februari) ikut ditolak.
 */
function hariISO(nilai: string | null): nilai is string {
  if (!nilai || !ISO_HARI.test(nilai)) return false;
  const d = new Date(`${nilai}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === nilai;
}

export interface HasilNormalisasi {
  /** Kasus yang lolos validasi, siap digabung dengan dataset server. */
  kasus: Kasus[];
  /** Jumlah baris yang diterima. */
  diterima: number;
  /** Jumlah baris yang dibuang. */
  barisDitolak: number;
  /** Jumlah baris per alasan penolakan, untuk keperluan audit. */
  ditolak: Record<string, number>;
  /** Baris yang tanggal onset atau tanggal lapor-nya tidak valid. */
  tanggalTidakValid: number;
  /** Baris dengan kode desa yang tidak ada di tabel wilayah. */
  desaTidakDikenal: number;
}

/** Catat satu alasan penolakan. */
function tolak(hasil: HasilNormalisasi, alasan: string) {
  hasil.ditolak[alasan] = (hasil.ditolak[alasan] ?? 0) + 1;
}

function teksNilai(nilai: unknown, maks: number): string | null {
  if (typeof nilai !== "string") return null;
  const bersih = bersihkanTeks(nilai, maks);
  return bersih.length > 0 ? bersih : null;
}

function salahSatu<T extends string>(nilai: unknown, kumpulan: Set<T>): T | null {
  return typeof nilai === "string" && kumpulan.has(nilai as T) ? (nilai as T) : null;
}

/**
 * Ubah satu baris dari peramban menjadi kasus, atau null kalau tidak layak.
 * Setiap field yang bermasalah dicatat sebagai alasan penolakan.
 */
function prosesBaris(
  baris: unknown,
  wilayah: Map<string, Desa>,
  hasil: HasilNormalisasi,
): Kasus | null {
  if (typeof baris !== "object" || baris === null) {
    tolak(hasil, "bukan-objek");
    return null;
  }
  const b = baris as Record<string, unknown>;

  const id = teksNilai(b["id"], MAKS_ID);
  const kode = teksNilai(b["kodeDesa"], MAKS_KODE);
  const penyakit = salahSatu(b["penyakit"], PENYAKIT_VALID as Set<Kasus["penyakit"]>);
  const kelompokUmur = salahSatu(b["kelompokUmur"], UMUR_VALID as Set<Kasus["kelompokUmur"]>);
  const jenisKelamin = salahSatu(b["jenisKelamin"], JK_VALID as Set<Kasus["jenisKelamin"]>);
  const status = salahSatu(b["status"], STATUS_VALID as Set<Kasus["status"]>);
  const sumber = salahSatu(b["sumber"], SUMBER_VALID as Set<Kasus["sumber"]>);
  const tanggalOnset = teksNilai(b["tanggalOnset"], 10);
  const tanggalLapor = teksNilai(b["tanggalLapor"], 10);

  if (!id) tolak(hasil, "id-tidak-valid");
  if (!kode) tolak(hasil, "kode-desa-tidak-valid");
  if (!penyakit) tolak(hasil, "penyakit-tidak-dikenal");
  if (!kelompokUmur) tolak(hasil, "kelompok-umur-tidak-dikenal");
  if (!jenisKelamin) tolak(hasil, "jenis-kelamin-tidak-dikenal");
  if (!status) tolak(hasil, "status-tidak-dikenal");
  if (!sumber) tolak(hasil, "sumber-tidak-dikenal");
  if (!hariISO(tanggalOnset)) {
    hasil.tanggalTidakValid += 1;
    tolak(hasil, "tanggal-onset-tidak-valid");
  }
  if (!hariISO(tanggalLapor)) {
    hasil.tanggalTidakValid += 1;
    tolak(hasil, "tanggal-lapor-tidak-valid");
  }

  if (
    !id ||
    !kode ||
    !penyakit ||
    !kelompokUmur ||
    !jenisKelamin ||
    !status ||
    !sumber ||
    !hariISO(tanggalOnset) ||
    !hariISO(tanggalLapor)
  ) {
    return null;
  }

  // Nama wilayah dari peramban diabaikan seluruhnya: desa, kecamatan, dan
  // puskesmas selalu berasal dari tabel wilayah server.
  const desa = wilayah.get(kode);
  if (!desa) {
    hasil.desaTidakDikenal += 1;
    tolak(hasil, "desa-tidak-dikenal");
    return null;
  }

  const gejala = Array.isArray(b["gejala"])
    ? b["gejala"]
        .map((g) => teksNilai(g, MAKS_GEJALA))
        .filter((g): g is string => g !== null)
        .slice(0, MAKS_GEJALA_PER_KASUS)
    : [];

  const catatan = teksNilai(b["catatan"], MAKS_CATATAN);

  return {
    id,
    penyakit,
    tanggalOnset,
    tanggalLapor,
    puskesmas: desa.puskesmas,
    kodeDesa: desa.kode,
    desa: desa.nama,
    kecamatan: desa.kecamatan,
    kelompokUmur,
    jenisKelamin,
    status,
    sumber,
    gejala,
    ...(catatan ? { catatan } : {}),
  };
}

/**
 * Ubah daftar kasus dari peramban menjadi kasus yang layak dihitung.
 *
 * Fungsi ini murni: tidak membaca jam, tidak memanggil jaringan, dan tidak
 * bergantung pada penyimpanan peramban, sehingga seluruh aturan validasi bisa
 * diuji.
 */
export function normalisasiKasusTambahan(masuk: unknown): HasilNormalisasi {
  const hasil: HasilNormalisasi = {
    kasus: [],
    diterima: 0,
    barisDitolak: 0,
    ditolak: {},
    tanggalTidakValid: 0,
    desaTidakDikenal: 0,
  };

  if (!Array.isArray(masuk)) {
    tolak(hasil, "bukan-daftar");
    hasil.barisDitolak += 1;
    return hasil;
  }
  if (masuk.length > BATAS_KASUS_TAMBAHAN) {
    tolak(hasil, "melebihi-batas-jumlah");
  }

  const wilayah = new Map<string, Desa>(DESA.map((d) => [d.kode, d]));

  for (const baris of masuk.slice(0, BATAS_KASUS_TAMBAHAN)) {
    const kasus = prosesBaris(baris, wilayah, hasil);
    if (kasus) {
      hasil.kasus.push(kasus);
      hasil.diterima += 1;
    } else {
      hasil.barisDitolak += 1;
    }
  }

  return hasil;
}
