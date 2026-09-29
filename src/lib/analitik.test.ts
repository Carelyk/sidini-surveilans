import { describe, expect, it } from "vitest";

import {
  PENDUDUK_BELUM_TERSEDIA,
  URUT_LEVEL_HARIAN,
  formatInsidensi,
  statusPerDesa,
  type StatusDesa,
} from "@/lib/analitik";
import { AMBANG, KASUS_MIN_SINYAL_HARIAN, KASUS_MIN_WASPADA_HARIAN } from "@/data/ambang";
import { DESA, TANGGAL_ACUAN, type Kasus, type Penyakit } from "@/data/dataset";
import { PENYAKIT } from "@/data/skdr";

/**
 * Test ini mengunci dua aturan:
 *  1) Status desa dihitung PER PENYAKIT dengan ambang penyakit itu sendiri,
 *     bukan dari gabungan semua penyakit.
 *  2) Bila jumlah penduduk desa belum tersedia, insidensi tidak dihitung dan
 *     aturan insidensi tidak dipakai untuk menetapkan status.
 *
 * Kasus dibuat di dalam test (bukan dari generator dataset) supaya perilakunya
 * bisa ditunjuk dengan angka yang jelas.
 */

const DESA_UJI = DESA[0]!;

/** Tanggal `jumlah` hari sebelum TANGGAL_ACUAN. */
function mundur(jumlah: number): string {
  const d = new Date(TANGGAL_ACUAN + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - jumlah);
  return d.toISOString().slice(0, 10);
}

let urutan = 0;

/** `jumlah` kasus di desa uji, berstatus Terverifikasi, pada hari tertentu. */
function kasusDesa(jumlah: number, hariMundur: number, penyakit: Penyakit): Kasus[] {
  return Array.from({ length: jumlah }, () => ({
    id: `uji-${++urutan}`,
    penyakit,
    tanggalOnset: mundur(hariMundur),
    tanggalLapor: mundur(hariMundur),
    puskesmas: DESA_UJI.puskesmas,
    kodeDesa: DESA_UJI.kode,
    desa: DESA_UJI.nama,
    kecamatan: DESA_UJI.kecamatan,
    kelompokUmur: "15-44",
    jenisKelamin: "L",
    status: "Terverifikasi",
    sumber: "Puskesmas",
    gejala: [],
  }));
}

/** Status satu desa uji dari daftar kasus yang diberikan. */
function statusUji(kasus: Kasus[]): StatusDesa {
  return statusPerDesa(kasus).find((s) => s.kode === DESA_UJI.kode)!;
}

describe("status desa dihitung per penyakit", () => {
  it("menyebut penyakit pemicu dan memakai ambang penyakit itu", () => {
    // 40 kasus DBD dalam 7 hari, baseline mendekati nol.
    const s = statusUji([...kasusDesa(40, 1, "DBD"), ...kasusDesa(3, 40, "Diare")]);

    expect(s.level).toBe("Sinyal");
    expect(s.penyakitPemicu).toBe("DBD");

    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;
    expect(dbd.mingguIni).toBe(40);
    expect(dbd.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);

    // Kasus DBD tidak boleh bocor ke baris penyakit lain.
    const diare = s.perPenyakit.find((p) => p.penyakit === "Diare")!;
    expect(diare.mingguIni).toBe(0);
  });

  it("tidak menaikkan status hanya karena jumlah gabungan kasus besar", () => {
    // Empat penyakit x 12 kasus = 48 kasus gabungan, masing-masing dengan
    // baseline 10 kasus per 7 hari sehingga rasionya hanya 1,2x. Tidak satu
    // pun penyakit mencapai rasio 1,5x baseline-nya, jadi tidak boleh ada
    // status Waspada walau gabungan 48 kasus terlihat besar.
    const s = statusUji([
      ...kasusDesa(12, 1, "DBD"),
      ...kasusDesa(10, 8, "DBD"),
      ...kasusDesa(10, 15, "DBD"),
      ...kasusDesa(10, 22, "DBD"),
      ...kasusDesa(12, 1, "Diare"),
      ...kasusDesa(10, 8, "Diare"),
      ...kasusDesa(10, 15, "Diare"),
      ...kasusDesa(10, 22, "Diare"),
      ...kasusDesa(12, 1, "Chikungunya"),
      ...kasusDesa(10, 8, "Chikungunya"),
      ...kasusDesa(10, 15, "Chikungunya"),
      ...kasusDesa(10, 22, "Chikungunya"),
      ...kasusDesa(12, 1, "Hepatitis A"),
      ...kasusDesa(10, 8, "Hepatitis A"),
      ...kasusDesa(10, 15, "Hepatitis A"),
      ...kasusDesa(10, 22, "Hepatitis A"),
    ]);

    expect(s.mingguIni).toBe(48);
    expect(s.level).toBe("Aman");
    expect(s.penyakitPemicu).toBeNull();
  });

  it("menyusun level dari level tertinggi antar penyakit", () => {
    const s = statusUji([...kasusDesa(40, 1, "DBD"), ...kasusDesa(10, 40, "Diare")]);
    expect(URUT_LEVEL_HARIAN[s.level]).toBe(URUT_LEVEL_HARIAN.Sinyal);
    expect(s.level).toBe("Sinyal");
  });

  it("syarat kasus minimum berlaku sama untuk semua penyakit", () => {
    // Empat kasus tanpa baseline menghasilkan rasio 99 pada Chikungunya maupun
    // DBD. Dulu Chikungunya (kasusMin 3) naik ke Sinyal sedangkan DBD
    // (kasusMin 5) berhenti di Waspada, padahal jumlah kasusnya sama. Sekarang
    // keduanya memakai syarat yang sama, jadi keduanya berhenti di Waspada.
    const s = statusUji([...kasusDesa(4, 1, "Chikungunya"), ...kasusDesa(4, 1, "DBD")]);

    const chikungunya = s.perPenyakit.find((p) => p.penyakit === "Chikungunya")!;
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;
    expect(chikungunya.level).toBe("Waspada");
    expect(dbd.level).toBe("Waspada");
    expect(chikungunya.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(dbd.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
  });

  it("rasio di atas ambang tapi kasus di bawah 3 tidak menaikkan status apa pun", () => {
    // Dua kasus tanpa baseline berarti rasio 99, jauh di atas ambang. Karena
    // jumlah kasus di bawah 3, status harus tetap Aman dan alasannya
    // menyebutkan alasannya.
    const s = statusUji([...kasusDesa(2, 1, "DBD"), ...kasusDesa(2, 1, "Chikungunya")]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;

    expect(dbd.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(dbd.level).toBe("Aman");
    expect(s.level).toBe("Aman");
    expect(dbd.alasan).toContain(`di bawah minimal ${KASUS_MIN_WASPADA_HARIAN}`);
  });

  it("tiga kasus sudah cukup untuk Waspada, sepuluh untuk Sinyal", () => {
    // 3 kasus melawan baseline 1 kasus per jendela: rasio 3x (di atas ambang
    // KLB), tetapi jumlah kasus masih di bawah 10 sehingga tidak boleh Sinyal.
    const tiga = statusUji([
      ...kasusDesa(3, 1, "DBD"),
      ...kasusDesa(1, 8, "DBD"),
      ...kasusDesa(1, 15, "DBD"),
      ...kasusDesa(1, 22, "DBD"),
    ]).perPenyakit.find((p) => p.penyakit === "DBD")!;
    expect(tiga.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(tiga.level).toBe("Waspada");

    // 10 kasus melawan baseline 3: rasio di atas 2x DAN cukup kasus, jadi Sinyal.
    const sepuluh = statusUji([
      ...kasusDesa(KASUS_MIN_SINYAL_HARIAN, 1, "DBD"),
      ...kasusDesa(3, 8, "DBD"),
      ...kasusDesa(3, 15, "DBD"),
      ...kasusDesa(3, 22, "DBD"),
    ]).perPenyakit.find((p) => p.penyakit === "DBD")!;
    expect(sepuluh.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(sepuluh.level).toBe("Sinyal");
  });

  it("sembilan kasus tidak cukup untuk Sinyal walau rasio di atas 2x", () => {
    // Inilah kasus Rancaekek Kulon dan Rancaekek Wetan: rasio di atas 2x,
    // tetapi jumlah kasus di bawah 10 sehingga tidak boleh Sinyal.
    const s = statusUji([
      ...kasusDesa(9, 1, "DBD"),
      ...kasusDesa(3, 8, "DBD"),
      ...kasusDesa(3, 15, "DBD"),
      ...kasusDesa(3, 22, "DBD"),
    ]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;

    expect(dbd.mingguIni).toBe(9);
    expect(dbd.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(dbd.level).toBe("Waspada");
    expect(s.level).toBe("Waspada");
  });

  it("ambang rasio tidak berubah: 1,5x dan 2x tetap utuh", () => {
    // Penjaga agar penyesuaian ini tidak ikut mengubah angka ambang.
    for (const p of PENYAKIT) {
      expect(AMBANG[p].rasioWaspada).toBe(1.5);
      expect(AMBANG[p].rasioKLB).toBe(2);
    }
  });
  it("selalu punya satu baris untuk setiap penyakit", () => {
    const s = statusUji(kasusDesa(40, 1, "DBD"));
    expect(s.perPenyakit.map((p) => p.penyakit).sort()).toEqual([...PENYAKIT].sort());
  });

  it("Waspada terpisah dari Sinyal: rasio di atas 1,5x tapi di bawah 2x", () => {
    // 18 kasus DBD dengan baseline 10 (rata dari 10 kasus di 3 jendela).
    const s = statusUji([
      ...kasusDesa(18, 1, "DBD"),
      ...kasusDesa(10, 8, "DBD"),
      ...kasusDesa(10, 15, "DBD"),
      ...kasusDesa(10, 22, "DBD"),
    ]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;
    expect(dbd.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioWaspada);
    expect(dbd.rasio).toBeLessThan(AMBANG.DBD.rasioKLB);
    expect(dbd.level).toBe("Waspada");
  });
});

describe("kalimat alasan pada alert", () => {
  it("menyebut penyakit, periode, jumlah kasus, baseline, dan rasio", () => {
    const s = statusUji([...kasusDesa(40, 1, "DBD"), ...kasusDesa(10, 40, "Diare")]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;

    expect(dbd.alasan).toMatch(/^Dugaan KLB DBD:/);
    expect(dbd.alasan).toContain("40 kasus DBD dalam 7 hari");
    expect(dbd.alasan).toMatch(/\d+[.,]?\d*x baseline/);
    expect(s.alasan).toBe(dbd.alasan);
  });
});

describe("penduduk desa belum tersedia", () => {
  it("insidensi bernilai null, bukan 0, dan alasan menyebut tidak dinilai", () => {
    const s = statusUji(kasusDesa(40, 1, "DBD"));

    expect(s.penduduk).toBeNull();
    expect(s.insidensi).toBeNull();
    for (const p of s.perPenyakit) {
      expect(p.insidensi).toBeNull();
      expect(p.alasan).toContain(`Aturan insidensi tidak dinilai (${PENDUDUK_BELUM_TERSEDIA})`);
    }
  });

  it("formatInsidensi menampilkan 'penduduk belum tersedia', bukan angka 0", () => {
    expect(formatInsidensi(null)).toBe(PENDUDUK_BELUM_TERSEDIA);
    expect(formatInsidensi(0)).toBe("0.0");
    expect(formatInsidensi(12.34)).toBe("12.3");
  });

  it("status tetap bisa dihitung dari aturan rasio tanpa data penduduk", () => {
    const s = statusUji(kasusDesa(40, 1, "DBD"));
    expect(s.level).toBe("Sinyal");
  });
});
