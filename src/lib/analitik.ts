import { AMBANG, KASUS_MIN_SINYAL_HARIAN, KASUS_MIN_WASPADA_HARIAN } from "@/data/ambang";
import {
  DESA,
  KELOMPOK_UMUR,
  PENYAKIT,
  TANGGAL_ACUAN,
  type Kasus,
  type Penyakit,
} from "@/data/dataset";
import { jumlahPendudukDesa } from "@/data/populasi-desa";

export const DIHITUNG: Kasus["status"][] = ["Baru", "Investigasi", "Terverifikasi", "Selesai"];

/** Hanya kasus yang sah dihitung ke statistik: laporan warga wajib terverifikasi. */
export function kasusValid(semua: Kasus[]) {
  return semua.filter((k) => {
    if (k.status === "Ditolak") return false;
    if (k.sumber === "Warga") return k.status === "Terverifikasi" || k.status === "Selesai";
    return true;
  });
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function rentangHari(jumlah: number, akhir = TANGGAL_ACUAN) {
  return Array.from({ length: jumlah }, (_, i) => addDays(akhir, -(jumlah - 1 - i)));
}

export interface TitikTren {
  tanggal: string;
  label: string;
  total: number;
  DBD: number;
  Diare: number;
  Chikungunya: number;
  "Hepatitis A": number;
}

export function tren(kasus: Kasus[], hari = 28): TitikTren[] {
  const hariList = rentangHari(hari);
  const map = new Map<string, TitikTren>();
  for (const t of hariList) {
    map.set(t, {
      tanggal: t,
      label: t.slice(8) + "/" + t.slice(5, 7),
      total: 0,
      DBD: 0,
      Diare: 0,
      Chikungunya: 0,
      "Hepatitis A": 0,
    });
  }
  for (const k of kasus) {
    const t = map.get(k.tanggalOnset);
    if (!t) continue;
    t.total += 1;
    t[k.penyakit] += 1;
  }
  return hariList.map((t) => map.get(t)!);
}

export function hitungDalamRentang(kasus: Kasus[], hari: number, offset = 0) {
  const akhir = addDays(TANGGAL_ACUAN, -offset);
  const awal = addDays(akhir, -(hari - 1));
  return kasus.filter((k) => k.tanggalOnset >= awal && k.tanggalOnset <= akhir);
}

/** Teks yang ditampilkan ketika jumlah penduduk desa belum tersedia. */
export const PENDUDUK_BELUM_TERSEDIA = "penduduk belum tersedia";

/**
 * Akhir kalimat alasan ketika insidensi tidak dinilai karena penduduk desa
 * belum tersedia. Diekspor agar tampilan kartu alert bisa menghapus kalimat
 * yang sama dari deskripsi kartu (info itu sudah diucapkan sekali oleh
 * catatan di atas daftar alert), tanpa mengubah isi alasan itu sendiri.
 */
export const CATATAN_INSIDENSI_TIDAK_DINILAI = ` Aturan insidensi tidak dinilai (${PENDUDUK_BELUM_TERSEDIA}).`;

/**
 * Level lapis harian. Kata "KLB" tidak dipakai sebagai level di sini: KLB
 * adalah status resmi hasil penilaian SKDR mingguan (src/lib/skdr.ts). Lapis
 * harian hanya menyatakan "Sinyal", dan kalimat alert memakai frasa
 * "Dugaan KLB" yang menandai sifatnya sebagai perkiraan, bukan status resmi. */
export type LevelHarian = "Aman" | "Waspada" | "Sinyal";

export const URUT_LEVEL_HARIAN: Record<LevelHarian, number> = { Aman: 0, Waspada: 1, Sinyal: 2 };

/** Status satu desa untuk SATU penyakit, memakai ambang penyakit tersebut. */
export interface StatusPenyakitDesa {
  penyakit: Penyakit;
  /** kasus 7 hari terakhir penyakit ini di desa tersebut */
  mingguIni: number;
  /** rata-rata kasus per 7 hari pada 3 jendela sebelumnya (penyakit ini) */
  rataBaseline: number;
  rasio: number;
  /** per 100.000 penduduk per minggu; null bila penduduk desa belum tersedia */
  insidensi: number | null;
  level: LevelHarian;
  /** kalimat lengkap: penyakit, periode, jumlah, baseline, rasio */
  alasan: string;
}

export interface StatusDesa {
  kode: string;
  desa: string;
  kecamatan: string;
  puskesmas: string;
  /** jumlah penduduk desa dari tabel referensi; null = belum tersedia */
  penduduk: number | null;
  lat: number;
  lon: number;
  /**
   * Total kasus 7 hari dari SEMUA penyakit. Angka gabungan ini hanya
   * informasi konteks: status desa TIDAK pernah dihitung dari gabungan ini.
   */
  mingguIni: number;
  rataBaseline: number;
  rasio: number;
  insidensi: number | null;
  /** status per penyakit; status desa = level tertinggi di sini */
  perPenyakit: StatusPenyakitDesa[];
  /** penyakit pemicu level tertinggi; null bila semua Aman */
  penyakitPemicu: Penyakit | null;
  level: LevelHarian;
  alasan: string;
}

/** Rasio kasus terhadap baseline, dengan aturan kasus tanpa baseline. */
function hitungRasio(ini: number, baseline: number): number {
  if (baseline > 0) return ini / baseline;
  return ini > 0 ? 99 : 0;
}

function insidensiPer100k(jumlah: number, penduduk: number | null): number | null {
  if (penduduk === null || penduduk <= 0) return null;
  return (jumlah / penduduk) * 100000;
}

/** Teks insidensi untuk UI: angka, atau "penduduk belum tersedia". */
export function formatInsidensi(insidensi: number | null): string {
  return insidensi === null ? PENDUDUK_BELUM_TERSEDIA : insidensi.toFixed(1);
}

/**
 * Status satu desa untuk satu penyakit.
 *
 * Ambang RASIO yang dipakai PERSIS sama dengan lapis SKDR
 * (src/data/ambang.ts): rasioKLB 2x dan rasioWaspada 1,5x. Tidak ada angka
 * ambang yang ditulis ulang di sini.
 *
 * Yang ditambahkan adalah syarat kasus minimum dari
 * KASUS_MIN_SINYAL_HARIAN (10) dan KASUS_MIN_WASPADA_HARIAN (3). Tanpa
 * syarat ini, desa kecil dengan 1 kasus dan baseline 0 menghasilkan rasio
 * 99 dan langsung menyalakan peringatan palsu. Ini jawaban atas alert
 * fatigue; angka ambang rasio sendiri tidak diubah.
 *
 * Aturan insidensi hanya berlaku bila jumlah penduduk desa tersedia. Kalau
 * belum, insidensi bernilai null, ambang insidensi dilewati, dan alasannya
 * menyebutkan bahwa aturan itu tidak dinilai -- bukan diam-diam dianggap 0.
 */
function statusPenyakit(
  kasusJendela: Kasus[],
  kasusSemua: Kasus[],
  penyakit: Penyakit,
  penduduk: number | null,
): StatusPenyakitDesa {
  const a = AMBANG[penyakit];
  const ini = kasusJendela.filter((k) => k.penyakit === penyakit).length;
  const baseJendela = [7, 14, 21].map(
    (off) => hitungDalamRentang(kasusSemua, 7, off).filter((k) => k.penyakit === penyakit).length,
  );
  const rataBaseline = baseJendela.reduce((a2, b) => a2 + b, 0) / baseJendela.length;
  const rasio = hitungRasio(ini, rataBaseline);
  const insidensi = insidensiPer100k(ini, penduduk);
  const lewatInsidensi = insidensi !== null && insidensi >= a.insidensiMin;
  // Syarat kasus minimum: tanpa ini rasio pada desa kecil tidak bermakna.
  const cukupUntukSinyal = ini >= KASUS_MIN_SINYAL_HARIAN;
  const cukupUntukWaspada = ini >= KASUS_MIN_WASPADA_HARIAN;
  const lewatRasio = rasio >= a.rasioKLB && cukupUntukSinyal;
  const lewatRasioWaspada = rasio >= a.rasioWaspada && cukupUntukWaspada;

  let level: LevelHarian = "Aman";
  if (lewatRasio || lewatInsidensi) level = "Sinyal";
  else if (lewatRasioWaspada || (insidensi !== null && insidensi >= a.insidensiMin * 0.6)) {
    level = "Waspada";
  }

  const angka = `${ini} kasus ${penyakit} dalam 7 hari (${rasio.toFixed(1)}x baseline, ${rataBaseline.toFixed(1)})`;
  const catatanInsidensi =
    insidensi === null
      ? CATATAN_INSIDENSI_TIDAK_DINILAI
      : ` Insidensi ${insidensi.toFixed(1)}/100.000/mgg.`;
  const catatanMinimum =
    ini > 0 && ini < KASUS_MIN_WASPADA_HARIAN
      ? ` Rasio ${rasio.toFixed(1)}x tidak dinilai: kasus ${penyakit} cuma ${ini}, di bawah minimal ${KASUS_MIN_WASPADA_HARIAN}.`
      : "";

  let alasan: string;
  if (level === "Sinyal") {
    alasan =
      lewatRasio && lewatInsidensi
        ? `Dugaan KLB ${penyakit}: ${angka}, melewati ambang rasio ${a.rasioKLB}x dan insidensi ${a.insidensiMin}/100.000/mgg.${catatanInsidensi}`
        : lewatRasio
          ? `Dugaan KLB ${penyakit}: ${angka}, melewati ambang rasio ${a.rasioKLB}x dengan minimal ${KASUS_MIN_SINYAL_HARIAN} kasus.${catatanInsidensi}`
          : `Dugaan KLB ${penyakit}: ${angka}, insidensi melewati ambang ${a.insidensiMin}/100.000/mgg.${catatanInsidensi}`;
  } else if (level === "Waspada") {
    alasan = `Waspada ${penyakit}: ${angka}, melewati ambang rasio ${a.rasioWaspada}x dengan minimal ${KASUS_MIN_WASPADA_HARIAN} kasus.${catatanInsidensi}`;
  } else {
    alasan = `${penyakit} dalam rentang fluktuasi normal: ${angka}.${catatanInsidensi}${catatanMinimum}`;
  }

  return {
    penyakit,
    mingguIni: ini,
    rataBaseline: Number(rataBaseline.toFixed(1)),
    rasio: Number(rasio.toFixed(2)),
    insidensi: insidensi === null ? null : Number(insidensi.toFixed(1)),
    level,
    alasan,
  };
}

/**
 * Status seluruh desa, TANPA mencampur penyakit.
 *
 * Dua aturan yang dijaga di sini:
 * 1) Status satu desa berasal dari ambang penyakit itu sendiri,
 *    bukan dari gabungan semua penyakit. Angka gabungan tetap ada sebagai
 *    informasi konteks (`mingguIni`, `rasio`, `insidensi`) tetapi tidak
 *    pernah dipakai menetapkan level.
 * 2) Insidensi hanya dihitung bila jumlah penduduk desa tersedia di
 *    src/data/populasi-desa.ts. Kalau belum, level hanya berasal dari aturan
 *    rasio terhadap baseline.
 */
export function statusPerDesa(kasus: Kasus[]): StatusDesa[] {
  const mingguIni = hitungDalamRentang(kasus, 7, 0);
  const jendelaBaseline = [7, 14, 21].map((off) => hitungDalamRentang(kasus, 7, off));

  return DESA.map((d) => {
    const semua = kasus.filter((k) => k.kodeDesa === d.kode);
    const mingguIniDesa = mingguIni.filter((k) => k.kodeDesa === d.kode);
    const ini = mingguIniDesa.length;
    const base = jendelaBaseline.map((g) => g.filter((k) => k.kodeDesa === d.kode).length);
    const rataBaselineGabungan = base.reduce((a, b) => a + b, 0) / base.length;

    const penduduk = jumlahPendudukDesa(d.kode);
    const perPenyakit = PENYAKIT.map((p) => statusPenyakit(mingguIniDesa, semua, p, penduduk));
    const insidensiGabungan = insidensiPer100k(ini, penduduk);

    const pemicu = perPenyakit.reduce<StatusPenyakitDesa | null>(
      (best, s) => (!best || URUT_LEVEL_HARIAN[s.level] > URUT_LEVEL_HARIAN[best.level] ? s : best),
      null,
    );
    const level: LevelHarian = pemicu?.level ?? "Aman";

    return {
      kode: d.kode,
      desa: d.nama,
      kecamatan: d.kecamatan,
      puskesmas: d.puskesmas,
      penduduk,
      lat: d.lat,
      lon: d.lon,
      mingguIni: ini,
      rataBaseline: Number(rataBaselineGabungan.toFixed(1)),
      rasio: Number(hitungRasio(ini, rataBaselineGabungan).toFixed(2)),
      insidensi: insidensiGabungan === null ? null : Number(insidensiGabungan.toFixed(1)),
      perPenyakit,
      penyakitPemicu: pemicu && pemicu.level !== "Aman" ? pemicu.penyakit : null,
      level,
      alasan: pemicu?.alasan ?? "Semua penyakit dalam rentang fluktuasi normal.",
    };
  }).sort(
    (a, b) => URUT_LEVEL_HARIAN[b.level] - URUT_LEVEL_HARIAN[a.level] || b.mingguIni - a.mingguIni,
  );
}

export function perPenyakit(kasus: Kasus[]) {
  return PENYAKIT.map((p) => ({
    penyakit: p,
    jumlah: kasus.filter((k) => k.penyakit === p).length,
  })).sort((a, b) => b.jumlah - a.jumlah);
}

export function perUmur(kasus: Kasus[]) {
  return KELOMPOK_UMUR.map((u) => ({
    kelompok: u,
    jumlah: kasus.filter((k) => k.kelompokUmur === u).length,
  }));
}

export interface TitikUmurPenyakit {
  kelompok: string;
  jumlah: number;
  DBD: number;
  Diare: number;
  Chikungunya: number;
  "Hepatitis A": number;
}

/** Jumlah kasus per kelompok umur, dipecah per penyakit supaya terlihat
 *  kelompok umur yang sakit apa, bukan sekadar akumulasi. */
export function perUmurPenyakit(kasus: Kasus[]): TitikUmurPenyakit[] {
  return KELOMPOK_UMUR.map((u) => {
    const dalam = kasus.filter((k) => k.kelompokUmur === u);
    const titik: TitikUmurPenyakit = {
      kelompok: u,
      jumlah: dalam.length,
      DBD: 0,
      Diare: 0,
      Chikungunya: 0,
      "Hepatitis A": 0,
    };
    for (const k of dalam) titik[k.penyakit] += 1;
    return titik;
  });
}

export function rataKeterlambatan(kasus: Kasus[]) {
  if (!kasus.length) return 0;
  const total = kasus.reduce((acc, k) => {
    const a = new Date(k.tanggalOnset + "T00:00:00Z").getTime();
    const b = new Date(k.tanggalLapor + "T00:00:00Z").getTime();
    return acc + (b - a) / 86400000;
  }, 0);
  return Number((total / kasus.length).toFixed(2));
}

export function ringkasanUntukAI(semua: Kasus[]) {
  const valid = kasusValid(semua);
  const mingguIni = hitungDalamRentang(valid, 7);
  const mingguLalu = hitungDalamRentang(valid, 7, 7);
  const desa = statusPerDesa(valid);

  return {
    tanggalAcuan: TANGGAL_ACUAN,
    totalKasus42Hari: valid.length,
    kasus7HariTerakhir: mingguIni.length,
    kasus7HariSebelumnya: mingguLalu.length,
    rataKeterlambatanLaporHari: rataKeterlambatan(valid),
    laporanWargaMenungguVerifikasi: semua.filter(
      (k) => k.sumber === "Warga" && (k.status === "Baru" || k.status === "Investigasi"),
    ).length,
    distribusiPenyakit7Hari: perPenyakit(mingguIni),
    distribusiUmur7Hari: perUmur(mingguIni),
    statusDesa: desa.map((d) => {
      const p = d.perPenyakit.reduce((best, s) =>
        URUT_LEVEL_HARIAN[s.level] > URUT_LEVEL_HARIAN[best.level] ? s : best,
      );
      return {
        desa: d.desa,
        kecamatan: d.kecamatan,
        puskesmas: d.puskesmas,
        // Angka gabungan 7 hari hanya konteks; yang menentukan status adalah
        // angka penyakit pemicu di bawah ini.
        kasus7Hari: d.mingguIni,
        // null = jumlah penduduk desa belum tersedia, insidensi tidak dihitung
        insidensiPer100k: d.insidensi,
        // level lapis harian: "Aman" | "Waspada" | "Sinyal" (bukan "KLB")
        level: d.level,
        penyakitPemicu: d.penyakitPemicu,
        kasusPenyakitPemicu7Hari: p.mingguIni,
        baselinePenyakitPemicu: p.rataBaseline,
        rasioPenyakitPemicu: p.rasio,
        insidensiPenyakitPemicuPer100k: p.insidensi,
      };
    }),
    trenHarian14: tren(valid, 14).map((t) => ({ tanggal: t.tanggal, total: t.total })),
  };
}
