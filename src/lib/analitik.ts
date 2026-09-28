import { DESA, KELOMPOK_UMUR, PENYAKIT, TANGGAL_ACUAN, type Kasus } from "@/data/dataset";

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

export interface StatusDesa {
  kode: string;
  desa: string;
  kecamatan: string;
  puskesmas: string;
  penduduk: number;
  lat: number;
  lon: number;
  mingguIni: number;
  rataBaseline: number;
  insidensi: number; // per 100.000 penduduk / minggu
  rasio: number;
  level: "Aman" | "Waspada" | "KLB";
  alasan: string;
}

/**
 * Logika ambang (threshold) peringatan dini:
 * - Baseline = rata-rata kasus per minggu pada 3 minggu sebelumnya (minggu -2..-4).
 * - KLB      : kasus 7 hari terakhir >= 2x baseline DAN minimal 10 kasus,
 *              atau insidensi mingguan >= 50 / 100.000 penduduk.
 * - Waspada  : kasus 7 hari terakhir >= 1,5x baseline DAN minimal 5 kasus.
 * Ambang minimum absolut mencegah alert fatigue dari desa berpenduduk kecil.
 */
export function statusPerDesa(kasus: Kasus[]): StatusDesa[] {
  const mingguIni = hitungDalamRentang(kasus, 7, 0);
  const baselineKasus = [7, 14, 21].map((off) => hitungDalamRentang(kasus, 7, off));

  return DESA.map((d) => {
    const ini = mingguIni.filter((k) => k.kodeDesa === d.kode).length;
    const base = baselineKasus.map((g) => g.filter((k) => k.kodeDesa === d.kode).length);
    const rataBaseline = base.reduce((a, b) => a + b, 0) / base.length;
    const rasio = rataBaseline > 0 ? ini / rataBaseline : ini > 0 ? 99 : 0;
    const insidensi = (ini / d.penduduk) * 100000;

    let level: StatusDesa["level"] = "Aman";
    let alasan = "Kasus dalam rentang fluktuasi normal.";
    if ((rasio >= 2 && ini >= 10) || insidensi >= 50) {
      level = "KLB";
      alasan =
        insidensi >= 50 && !(rasio >= 2 && ini >= 10)
          ? `Insidensi ${insidensi.toFixed(1)}/100.000 melewati ambang 50.`
          : `Kasus 7 hari (${ini}) = ${rasio.toFixed(1)}x baseline (${rataBaseline.toFixed(1)}).`;
    } else if (rasio >= 1.5 && ini >= 5) {
      level = "Waspada";
      alasan = `Kenaikan ${rasio.toFixed(1)}x baseline dengan ${ini} kasus dalam 7 hari.`;
    }

    return {
      kode: d.kode,
      desa: d.nama,
      kecamatan: d.kecamatan,
      puskesmas: d.puskesmas,
      penduduk: d.penduduk,
      lat: d.lat,
      lon: d.lon,
      mingguIni: ini,
      rataBaseline: Number(rataBaseline.toFixed(1)),
      insidensi: Number(insidensi.toFixed(1)),
      rasio: Number(rasio.toFixed(2)),
      level,
      alasan,
    };
  }).sort((a, b) => b.mingguIni - a.mingguIni);
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
    statusDesa: desa.map((d) => ({
      desa: d.desa,
      kecamatan: d.kecamatan,
      puskesmas: d.puskesmas,
      kasus7Hari: d.mingguIni,
      baselineMingguan: d.rataBaseline,
      rasio: d.rasio,
      insidensiPer100k: d.insidensi,
      level: d.level,
    })),
    trenHarian14: tren(valid, 14).map((t) => ({ tanggal: t.tanggal, total: t.total })),
  };
}
