// ============================================================================
// Logika bisnis SKDR: penyaringan, agregasi, dan ambang peringatan dini.
//
// Prinsip utama: PENYAKIT TIDAK BOLEH DICAMPUR. SKDR menyaring satu
// penyakit pada satu waktu di satu wilayah. Mencampur DBD dengan diare
// membuat angka tidak bermakna -- keluhan asli pengguna: "dashboard menampilkan
// total kasus, padahal KLB tidak bisa mencampur total penyakit".
// Semua fungsi di bawah menerima `penyakit` secara eksplisit dan tidak pernah
// menjumlahkan lintas penyakit tanpa diminta.
// ============================================================================

import { KECAMATAN, KECAMATAN_BY_KODE } from "@/data/wilayah";
import { JUMLAH_MINGGU, PENYAKIT, SKDR, type BarisSKDR, type Penyakit } from "@/data/skdr";

export type JenisKasus = "penderita" | "meninggal";

export interface FilterSKDR {
  tahun: number;
  /** Minggu epidemiologi 1..52 */
  mingguDari: number;
  mingguSampai: number;
  penyakit: Penyakit;
  /** null / undefined = seluruh kecamatan */
  kodeKecamatan?: string | null;
}

export function nilaiBaris(r: BarisSKDR, jenis: JenisKasus) {
  return jenis === "meninggal" ? r.meninggal : r.penderita;
}

export function terfilter(f: FilterSKDR): BarisSKDR[] {
  return SKDR.filter(
    (r) =>
      r.tahun === f.tahun &&
      r.penyakit === f.penyakit &&
      r.minggu >= f.mingguDari &&
      r.minggu <= f.mingguSampai &&
      (!f.kodeKecamatan || r.kodeKecamatan === f.kodeKecamatan),
  );
}

// ---------------------------------------------------------------------------
// Ambang peringatan dini -- DIBEDAKAN PER PENYAKIT (konfigurasi tunggal)
// ---------------------------------------------------------------------------
export { AMBANG, type Ambang, type AmbangSKDR, type StatusSumberAmbang } from "@/data/ambang";
import { AMBANG } from "@/data/ambang";

// ---------------------------------------------------------------------------
// Baseline per kecamatan: rata-rata 8 minggu SEBELUM rentang terpilih
// ---------------------------------------------------------------------------
export function baselineKecamatan(f: FilterSKDR, kodeKecamatan: string) {
  const dari = Math.max(1, f.mingguDari - 8);
  const sblm = SKDR.filter(
    (r) =>
      r.tahun === f.tahun &&
      r.penyakit === f.penyakit &&
      r.minggu >= dari &&
      r.minggu < f.mingguDari &&
      r.kodeKecamatan === kodeKecamatan,
  );
  if (!sblm.length) return { total: 0, perMinggu: 0 };
  const total = sblm.reduce((a, r) => a + r.penderita, 0);
  return { total, perMinggu: total / Math.max(1, f.mingguDari - dari) };
}

// ---------------------------------------------------------------------------
// Status per kecamatan untuk satu penyakit & satu rentang minggu
// ---------------------------------------------------------------------------
export type Level = "Aman" | "Waspada" | "KLB";

export interface StatusKecamatan {
  kode: string;
  nama: string;
  penduduk: number;
  luasKm2: number;
  jumlah: number;
  /** kasus per minggu, dirata-ratakan dari panjang rentang terpilih */
  perMinggu: number;
  insidensi: number; // per 100.000 penduduk per minggu
  insidensiTotal: number; // per 100.000 penduduk selama rentang
  baseline: number;
  rasio: number;
  meninggal: number;
  level: Level;
  alasan: string;
}

export function statusKecamatan(f: FilterSKDR, jenis: JenisKasus = "penderita"): StatusKecamatan[] {
  const a = AMBANG[f.penyakit];
  const baris = terfilter(f);
  const jumlahMinggu = Math.max(1, f.mingguSampai - f.mingguDari + 1);

  const perKec = new Map<string, { jumlah: number; meninggal: number }>();
  for (const r of baris) {
    const cur = perKec.get(r.kodeKecamatan) ?? { jumlah: 0, meninggal: 0 };
    cur.jumlah += r.penderita;
    cur.meninggal += r.meninggal;
    perKec.set(r.kodeKecamatan, cur);
  }

  const hasil: StatusKecamatan[] = KECAMATAN.map((k) => {
    const c = perKec.get(k.kode) ?? { jumlah: 0, meninggal: 0 };
    const perMinggu = c.jumlah / jumlahMinggu;
    const insidensi = (perMinggu / k.penduduk) * 100000;
    const insidensiTotal = (c.jumlah / k.penduduk) * 100000;

    const bl = baselineKecamatan(f, k.kode);
    const baseline = jenis === "meninggal" ? 0 : bl.perMinggu;
    // Tanpa data minggu sebelumnya (mis. rentang dimulai di minggu 1) rasio
    // tidak bisa dihitung. Nilai 99 di sini akan membuat seluruh kecamatan
    // terbaca sebagai lonjakan 99x, jadi kembalikan 0 dan biarkan hanya
    // insidensi yang dipakai menilai.
    const rasio = baseline > 0 ? perMinggu / baseline : 0;

    let level: Level = "Aman";
    let alasan = `${f.penyakit} dalam rentang fluktuasi normal.`;

    // Kematian diskalakan per minggu, bukan mentah. Aturan "ada 1 kematian
    // langsung KLB" menghasilkan alarm fatigue: Indonesia routinely mencatat
    // kematian dengue di setiap provinsi setiap tahun, sehingga hampir semua
    // minggu akan menyala. Karena itu ambangnya 2 kematian per minggu, dan
    // satu kematian saja sudah cukup untuk menaikkan ke Waspada.
    const wafatPerMinggu = c.meninggal / jumlahMinggu;

    if (jenis === "meninggal") {
      if (c.meninggal > 0) {
        level = "KLB";
        alasan =
          `${c.meninggal} kematian ${f.penyakit} tercatat pada rentang terpilih. ` +
          "Kematian adalah sinyal paling serius dan wajib ditindaklanjuti.";
      }
    } else if (a.kematianEskalasi && wafatPerMinggu >= 2) {
      level = "KLB";
      alasan =
        `${wafatPerMinggu.toFixed(1)} kematian ${f.penyakit} per minggu, melewati ambang 2 ` +
        "yang langsung menaikkan status ke KLB.";
    } else if ((rasio >= a.rasioKLB && perMinggu >= a.kasusMin) || insidensi >= a.insidensiMin) {
      level = "KLB";
      alasan =
        insidensi >= a.insidensiMin
          ? `Insidensi ${insidensi.toFixed(0)} per 100.000 per minggu melewati ambang ${a.insidensiMin}.`
          : `${perMinggu.toFixed(0)} kasus per minggu = ${rasio.toFixed(1)}x baseline (${baseline.toFixed(1)}).`;
    } else if (
      rasio >= a.rasioWaspada ||
      insidensi >= a.insidensiMin * 0.6 ||
      (a.kematianEskalasi && wafatPerMinggu >= 1)
    ) {
      level = "Waspada";
      alasan =
        a.kematianEskalasi && wafatPerMinggu >= 1
          ? `${c.meninggal} kematian ${f.penyakit} tercatat, jumlah kasus belum melewati ambang KLB.`
          : `Kenaikan ${rasio.toFixed(1)}x baseline dengan ${perMinggu.toFixed(0)} kasus per minggu.`;
    }

    return {
      kode: k.kode,
      nama: k.nama,
      penduduk: k.penduduk,
      luasKm2: k.luasKm2,
      jumlah: c.jumlah,
      perMinggu,
      insidensi: Number(insidensi.toFixed(1)),
      insidensiTotal: Number(insidensiTotal.toFixed(1)),
      baseline: Number(baseline.toFixed(2)),
      rasio: Number(rasio.toFixed(2)),
      meninggal: c.meninggal,
      level,
      alasan,
    };
  });

  return hasil.sort((x, y) => y.jumlah - x.jumlah);
}

// ---------------------------------------------------------------------------
// Deret waktu mingguan (untuk grafik)
// ---------------------------------------------------------------------------
export interface TitikMinggu {
  minggu: number;
  label: string;
  jumlah: number;
  meninggal: number;
  level: Level;
}

/**
 * Indeks mingguan per (tahun, penyakit, kecamatan), dihitung sekali dan
 * disimpan di modul. SKDR bersifat statis selama sesi, jadi tidak ada
 * kebutuhan menghitung ulang.
 */
const cacheIndeks = new Map<string, Map<string, number[]>>();

function indeksMingguan(tahun: number, penyakit: Penyakit): Map<string, number[]> {
  const kunci = `${tahun}|${penyakit}`;
  const ada = cacheIndeks.get(kunci);
  if (ada) return ada;

  const indeks = new Map<string, number[]>();
  for (const k of KECAMATAN) indeks.set(k.kode, new Array<number>(JUMLAH_MINGGU + 1).fill(0));
  for (const r of SKDR) {
    if (r.tahun !== tahun || r.penyakit !== penyakit) continue;
    const deret = indeks.get(r.kodeKecamatan);
    if (deret) deret[r.minggu] = (deret[r.minggu] ?? 0) + r.penderita;
  }
  cacheIndeks.set(kunci, indeks);
  return indeks;
}

/**
 * Status KLB per kecamatan per minggu.
 *
 * Penting: ambang diuji terhadap SATU kecamatan, bukan terhadap total
 * kabupaten. Kalau dihitung atas 3,87 juta jiwa, insidensi weekly DBD di
 * puncak musim hanya ~6 per 100.000 dan tidak pernah menyentuh ambang 50 --
 * grafik jadi selalu hijau padahal ada kecamatan yang KLB. readership Dinkes
 * mencari "minggu mana & kecamatan mana", jadi di sinilah status per minggu
 * diambil dari kecamatan terburuk pada minggu tersebut.
 */
export function statusMingguanKecamatan(
  f: FilterSKDR,
  jenis: JenisKasus = "penderita",
): { minggu: number; kode: string; jumlah: number; meninggal: number; level: Level }[] {
  const a = AMBANG[f.penyakit];
  const baris = terfilter(f);

  // kumpulkan (kecamatan -> minggu -> jumlah)
  const sel = new Map<string, Map<number, { jumlah: number; meninggal: number }>>();
  for (const r of baris) {
    let m = sel.get(r.kodeKecamatan);
    if (!m) sel.set(r.kodeKecamatan, (m = new Map()));
    const cur = m.get(r.minggu) ?? { jumlah: 0, meninggal: 0 };
    cur.jumlah += r.penderita;
    cur.meninggal += r.meninggal;
    m.set(r.minggu, cur);
  }

  // Baseline 8 minggu sebelumnya, diambil dari indeks mingguan dan bukan
  // menyaring SKDR berulang kali. Versi lama memanggil SKDR.filter
  // 31 x 52 = 1.612 kali atas 12.896 baris (~20 juta operasi) pada SETIAP
  // perubahan filter; itu terasa jelas saat menggeser slider minggu.
  const indeks = indeksMingguan(f.tahun, f.penyakit);

  const out: { minggu: number; kode: string; jumlah: number; meninggal: number; level: Level }[] =
    [];
  for (const k of KECAMATAN) {
    if (f.kodeKecamatan && k.kode !== f.kodeKecamatan) continue;
    const m = sel.get(k.kode);
    const deret = indeks.get(k.kode);
    for (let mg = f.mingguDari; mg <= f.mingguSampai; mg++) {
      const c = m?.get(mg) ?? { jumlah: 0, meninggal: 0 };
      const ins = k.penduduk ? (c.jumlah / k.penduduk) * 100000 : 0;

      // running sum 8 minggu ke belakang, dihitung sekali per kecamatan
      const dari = Math.max(1, mg - 8);
      let sblm = 0;
      if (deret) for (let i = dari; i < mg; i++) sblm += deret[i] ?? 0;
      const base = sblm / Math.max(1, mg - dari);
      // Tanpa data minggu sebelumnya, rasio tidak bisa dihitung. Kembalikan 0,
      // BUKAN 99: minggu 1 tahun lalu tidak boleh terbaca sebagai lonjakan.
      const rasio = base > 0 ? c.jumlah / base : 0;

      let level: Level = "Aman";
      if (jenis === "meninggal") {
        level = c.meninggal > 0 ? "KLB" : "Aman";
      } else if (a.kematianEskalasi && c.meninggal >= 2) {
        level = "KLB";
      } else if ((rasio >= a.rasioKLB && c.jumlah >= a.kasusMin) || ins >= a.insidensiMin) {
        level = "KLB";
      } else if (
        rasio >= a.rasioWaspada ||
        ins >= a.insidensiMin * 0.6 ||
        (a.kematianEskalasi && c.meninggal >= 1)
      ) {
        level = "Waspada";
      }

      out.push({ minggu: mg, kode: k.kode, jumlah: c.jumlah, meninggal: c.meninggal, level });
    }
  }
  return out;
}

const URUT_LEVEL: Record<Level, number> = { Aman: 0, Waspada: 1, KLB: 2 };

export function trenMingguan(f: FilterSKDR, jenis: JenisKasus = "penderita"): TitikMinggu[] {
  const perKec = statusMingguanKecamatan(f, jenis);

  const perMinggu = new Map<number, TitikMinggu & { peringkat: number }>();
  for (const p of perKec) {
    const cur =
      perMinggu.get(p.minggu) ??
      ({
        minggu: p.minggu,
        label: `M${p.minggu}`,
        jumlah: 0,
        meninggal: 0,
        level: "Aman",
        peringkat: 0,
      } as TitikMinggu & { peringkat: number });
    cur.jumlah += p.jumlah;
    cur.meninggal += p.meninggal;
    cur.peringkat = Math.max(cur.peringkat, URUT_LEVEL[p.level]);
    perMinggu.set(p.minggu, cur);
  }

  return [...perMinggu.values()]
    .sort((a, b) => a.minggu - b.minggu)
    .map((t) => ({
      minggu: t.minggu,
      label: t.label,
      jumlah: t.jumlah,
      meninggal: t.meninggal,
      level: (Object.keys(URUT_LEVEL) as Level[]).find((l) => URUT_LEVEL[l] === t.peringkat)!,
    }));
}

// ---------------------------------------------------------------------------
// Ringkasan untuk KPI
// ---------------------------------------------------------------------------
export interface Ringkasan {
  total: number;
  meninggal: number;
  minggu: number;
  perMinggu: number;
  insidensi: number;
  /** jumlah kecamatan berstatus KLB pada rentang ini */
  klb: number;
  /** jumlah kecamatan berstatus Waspada pada rentang ini */
  waspada: number;
  /** jumlah minggu (dari rentang terpilih) dengan setidaknya satu kecamatan KLB */
  mingguKLB: number;
  /**
   * Jumlah kecamatan yang menyentuh KLB di MINGGU MANA SAJA dalam rentang ini.
   *
   * Ini melengkapi `klb` di atas. `klb` menjumlahkan statusKecamatan, yaitu
   * agregat SELURUH rentang -- untuk rentang 52 minggu, insidensi rata-rata
   * selalu di bawah ambang, jadi `klb` bernilai 0 walaupun sebenarnya ada
   * pekan yang berstatus KLB. Dua angka ini tidak boleh dibaca sebagai satu.
   */
  kecamatanKLB: number;
  /** kecamatan dengan kasus terbanyak pada filter ini */
  tertinggi: StatusKecamatan | null;
}

export function ringkasan(f: FilterSKDR, jenis: JenisKasus = "penderita"): Ringkasan {
  const status = statusKecamatan(f, jenis);
  const jumlahMinggu = Math.max(1, f.mingguSampai - f.mingguDari + 1);
  const total = status.reduce((a, s) => a + (jenis === "meninggal" ? s.meninggal : s.jumlah), 0);
  const meninggal = status.reduce((a, s) => a + s.meninggal, 0);
  const penduduk = f.kodeKecamatan
    ? (KECAMATAN.find((k) => k.kode === f.kodeKecamatan)?.penduduk ?? 0)
    : KECAMATAN.reduce((s, k) => s + k.penduduk, 0);

  // statusKecamatan mengembalikan KECAMATAN sesuai urutan wilayah, bukan
  // urutan jumlah kasus, jadi "tertinggi" harus dicari eksplisit.
  const tertinggi = status.reduce<StatusKecamatan | null>(
    (best, s) => (!best || s.jumlah > best.jumlah ? s : best),
    null,
  );

  // statusMingguanKecamatan mengembalikan SATU BARIS per (kecamatan, minggu).
  // Kedua penghitung di bawah harus unik: tanpa itu 31 kecamatan x 52 minggu
  // bisa menghasilkan angka 142 untuk "jumlah minggu".
  const mingguan = statusMingguanKecamatan(f, jenis);
  const mingguKLB = new Set(mingguan.filter((s) => s.level === "KLB").map((s) => s.minggu));
  const kecamatanKLB = new Set(mingguan.filter((s) => s.level === "KLB").map((s) => s.kode)).size;

  return {
    total,
    meninggal,
    minggu: jumlahMinggu,
    perMinggu: jumlahMinggu ? total / jumlahMinggu : 0,
    insidensi: penduduk ? (total / jumlahMinggu / penduduk) * 100000 : 0,
    klb: status.filter((s) => s.level === "KLB").length,
    waspada: status.filter((s) => s.level === "Waspada").length,
    mingguKLB: mingguKLB.size,
    kecamatanKLB,
    tertinggi,
  };
}

export interface PuncakMingguan {
  minggu: number;
  kode: string;
  nama: string;
  jumlah: number;
  meninggal: number;
  /** insidensi kasus pada minggu itu per 100.000 penduduk kecamatan */
  insidensi: number;
  level: Level;
}

/**
 * Kecamatan + minggu dengan kasus terbanyak di dalam rentang terpilih.
 *
 * Ini yang sebenarnya dipakai menilai KLB, karena ambang KLB adalah ambang
 * mingguan. Angka agregat seluruh rentang tidak bisa menggantikan ini: untuk
 * rentang 52 minggu, insidensi rata-rata selalu jauh di bawah ambang.
 */
export function puncakMingguan(
  f: FilterSKDR,
  jenis: JenisKasus = "penderita",
): PuncakMingguan | null {
  const baris = statusMingguanKecamatan(f, jenis);
  let terbaik: PuncakMingguan | null = null;
  for (const b of baris) {
    // statusMingguanKecamatan tidak membawa nama/penduduk, jadi dicocokkan
    // lewat KECAMATAN_BY_KODE. Kode di dataset dijamin ada di sana.
    const k = KECAMATAN_BY_KODE.get(b.kode);
    if (!k) continue;
    if (terbaik && b.jumlah <= terbaik.jumlah) continue;
    terbaik = {
      minggu: b.minggu,
      kode: b.kode,
      nama: k.nama,
      jumlah: b.jumlah,
      meninggal: b.meninggal,
      insidensi: k.penduduk ? (b.jumlah / k.penduduk) * 100000 : 0,
      level: b.level,
    };
  }
  return terbaik;
}

/** Perbandingan seluruh penyakit untuk satu rentang minggu. */
export function bandingkanPenyakit(tahun: number, mingguDari: number, mingguSampai: number) {
  return PENYAKIT.map((p) => {
    const f: FilterSKDR = { tahun, mingguDari, mingguSampai, penyakit: p };
    const mingguan = statusMingguanKecamatan(f);
    return {
      penyakit: p,
      ...ringkasan(f),
      /** minggu yang punya setidaknya satu kecamatan berstatus Waspada */
      mingguWaspada: new Set(mingguan.filter((s) => s.level === "Waspada").map((s) => s.minggu))
        .size,
      puncak: puncakMingguan(f),
    };
  }).sort((a, b) => b.total - a.total);
}

export { PENYAKIT, JUMLAH_MINGGU };
export type { Penyakit };
