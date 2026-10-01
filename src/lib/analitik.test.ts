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
import { jumlahPendudukDesa } from "@/data/populasi-desa";
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
    kelompokUmur: "19-59",
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

/**
 * Sebar kasus ke jendela sekarang dan tiga jendela baseline. Baseline dipilih
 * otomatis supaya rasio kasus-now terhadap baseline-nya jelas di bawah ambang
 * Waspada (1,5x), sehingga skenario ini mengujistatus tanpa efek rasio.
 */
function kasusJendela(sekarang: number, penyakit: Penyakit): Kasus[] {
  const baseline = Math.max(3, Math.ceil(sekarang / 1.2));
  return [
    ...kasusDesa(sekarang, 1, penyakit),
    ...kasusDesa(baseline, 8, penyakit),
    ...kasusDesa(baseline, 15, penyakit),
    ...kasusDesa(baseline, 22, penyakit),
  ];
}

/** Populasi desa uji, dari tabel referensi (bukan angka yang dikarang). */
function populasiUji(): number {
  const p = jumlahPendudukDesa(DESA_UJI.kode);
  if (p === null) throw new Error("desa uji wajib punya jumlah penduduk pada tabel referensi");
  return p;
}

/**
 * Jumlah kasus terbesar per penyakit yang MASIH menghasilkan status Aman di
 * desa uji: di bawah lantai insidensi Waspada (60% ambang penyakit itu) dan
 * di bawah rasio 1,5x baseline.
 *
 * Angka ini dihitung dari ambang dan populasi tabel, bukan ditulis manual,
 * supaya tes ini tetap benar kalau ambang atau alokasi populasi berubah.
 */
function sejakBaruAman(penyakit: Penyakit, baseline = 10): number {
  const perKasus = 100000 / populasiUji();
  const maksInsidensi = Math.ceil((AMBANG[penyakit].insidensiMin * 0.6) / perKasus) - 1;
  const maksRasio = Math.floor(baseline * 1.5) - 1;
  return Math.max(0, Math.min(maksInsidensi, maksRasio));
}

/** Jumlah kasus Aman per penyakit, dipakai skenario "gabungan kasus besar". */
const SEJAK_BARU_AMAN: Record<Penyakit, number> = {
  DBD: sejakBaruAman("DBD"),
  Diare: sejakBaruAman("Diare"),
  Chikungunya: sejakBaruAman("Chikungunya"),
  "Hepatitis A": sejakBaruAman("Hepatitis A"),
};

/**
 * Jumlah kasus terbesar yang insidensinya masih DI BAWAH ambang penyakit itu,
 * dipakai skenario yang mau menguji aturan rasio tanpa tersentuh insidensi.
 */
function maksDiBawahInsidensi(penyakit: Penyakit): number {
  const perKasus = 100000 / populasiUji();
  return Math.floor((AMBANG[penyakit].insidensiMin * 0.98) / perKasus);
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
    // Prinsip yang diuji: status berasal dari tiap penyakit sendiri, bukan
    // dari jumlah gabungan. Semua penyakit diberi kasus SEJAK_BARU_AMAN
    // (lihat konstanta di bawah) sehingga tidak satu pun mencapai ambang rasio
    // maupun ambang insidensi desa ini, walau gabungannya lebih besar dari
    // kasus penyakit mana pun.
    //
    // Baseline dibuat 3x jumlah kasusnya sehingga rasionya hanya ~0,33x, jelas
    // di bawah ambang Waspada 1,5x; dan jumlah kasus dijaga pada batas yang
    // insidensinya di bawah 0,6x ambang penyakit. Keduanya menjaga status Aman.
    const s = statusUji([
      ...kasusJendela(SEJAK_BARU_AMAN.DBD, "DBD"),
      ...kasusJendela(SEJAK_BARU_AMAN.Diare, "Diare"),
      ...kasusJendela(SEJAK_BARU_AMAN.Chikungunya, "Chikungunya"),
      ...kasusJendela(SEJAK_BARU_AMAN["Hepatitis A"], "Hepatitis A"),
    ]);

    for (const p of s.perPenyakit) {
      expect(p.level).toBe("Aman");
    }
    // Gabungan tetap lebih besar dari kasus penyakit mana pun, tapi tidak
    // boleh memunculkan status apa pun.
    expect(s.mingguIni).toBeGreaterThan(
      Math.max(SEJAK_BARU_AMAN.DBD, SEJAK_BARU_AMAN.Diare, SEJAK_BARU_AMAN.Chikungunya),
    );
    expect(s.level).toBe("Aman");
    expect(s.penyakitPemicu).toBeNull();
  });

  it("menyusun level dari level tertinggi antar penyakit", () => {
    const s = statusUji([...kasusDesa(40, 1, "DBD"), ...kasusDesa(10, 40, "Diare")]);
    expect(URUT_LEVEL_HARIAN[s.level]).toBe(URUT_LEVEL_HARIAN.Sinyal);
    expect(s.level).toBe("Sinyal");
  });

  it("syarat kasus minimum berlaku sama untuk semua penyakit", () => {
    // Empat kasus tanpa baseline menghasilkan rasio 99 pada Chikungunya dan
    // Hepatitis A, dan keduanya memakai insidensiMin 15 yang sama. Dulu
    // Chikungunya (kasusMin 3) naik ke Sinyal sedangkan DBD (kasusMin 5)
    // berhenti di Waspada, padahal jumlah kasusnya sama. Sekarang semua
    // penyakit memakai syarat kasus minimum yang sama, sehingga dua penyakit
    // dengan ambang insidensi sama juga menghasilkan level yang sama.
    const s = statusUji([...kasusDesa(4, 1, "Chikungunya"), ...kasusDesa(4, 1, "Hepatitis A")]);

    const chikungunya = s.perPenyakit.find((p) => p.penyakit === "Chikungunya")!;
    const hepatitis = s.perPenyakit.find((p) => p.penyakit === "Hepatitis A")!;
    expect(chikungunya.level).toBe(hepatitis.level);
    expect(chikungunya.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(hepatitis.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
  });

  it("rasio di atas ambang tapi kasus di bawah 3 tidak menaikkan status apa pun", () => {
    // Dua kasus tanpa baseline berarti rasio 99, jauh di atas ambang. Karena
    // jumlah kasus di bawah 3 dan insidensinya masih di bawah lantai
    // Waspada, status kedua penyakit harus tetap Aman.
    const s = statusUji([...kasusDesa(2, 1, "DBD"), ...kasusDesa(2, 1, "Diare")]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;
    const diare = s.perPenyakit.find((p) => p.penyakit === "Diare")!;

    expect(dbd.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(dbd.level).toBe("Aman");
    expect(diare.level).toBe("Aman");
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

  it("kasus di bawah 10 tidak cukup untuk Sinyal lewat rasio, walau rasio 2x", () => {
    // Menguji aturan rasio secara terpisah: jumlah kasus sengaja dijaga pada
    // batas tertinggi yang insidensinya MASIH di bawah ambang DBD, sehingga
    // bila status tetap Waspada, itu murni karena jumlah kasus < 10 (rasio 2x
    // saja tidak cukup untuk Sinyal).
    //
    // Catatan jujur: begitu tabel penduduk desa terisi, kasus DBD 7 atau
    // lebih di desa sekecil ini sudah melewati insidensi 50/100.000/mgg, jadi
    // pola "9 kasus, rasio 2x, tapi bukan Sinyal" tidak bisa direproduksi
    // lagi di desa uji ini tanpa menurunkan populasi. Aturan rasio tetap sama.
    const n = maksDiBawahInsidensi("DBD");
    const s = statusUji([
      ...kasusDesa(n, 1, "DBD"),
      ...kasusDesa(Math.round(n / 2), 8, "DBD"),
      ...kasusDesa(Math.round(n / 2), 15, "DBD"),
      ...kasusDesa(Math.round(n / 2), 22, "DBD"),
    ]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;

    expect(dbd.mingguIni).toBe(n);
    expect(n).toBeLessThan(KASUS_MIN_SINYAL_HARIAN);
    expect(dbd.insidensi).not.toBeNull();
    expect(dbd.insidensi!).toBeLessThan(AMBANG.DBD.insidensiMin);
    // Rasio tepat di atas 2x (baseline n/2), tapi jumlah kasus < 10.
    expect(dbd.rasio).toBeGreaterThanOrEqual(AMBANG.DBD.rasioKLB);
    expect(dbd.level).toBe("Waspada");
    expect(s.level).toBe("Waspada");
  });

  it("insidensi yang melewati ambang menaikkan Sinyal walau kasus di bawah 10", () => {
    // Efek preencheran tabel penduduk: di desa uji, DBD 7 kasus sudah
    // melewati insidensi 50/100.000/mgg sehingga status Sinyal meskipun
    // jumlah kasus masih di bawah 10 untuk Sinyal lewat rasio.
    const n = Math.ceil((AMBANG.DBD.insidensiMin * 1.1) / (100000 / populasiUji()));
    expect(n).toBeLessThan(KASUS_MIN_SINYAL_HARIAN); // sengaja di bawah 10
    const s = statusUji([...kasusDesa(n, 1, "DBD"), ...kasusDesa(1, 8, "DBD")]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;

    expect(dbd.insidensi!).toBeGreaterThanOrEqual(AMBANG.DBD.insidensiMin);
    expect(dbd.level).toBe("Sinyal");
    expect(dbd.alasan).toContain("insidensi melewati ambang");
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
    // Rasio sengaja dikunci di antara 1,5x dan 2x (kasus = baseline + 2),
    // dan jumlah kasus dipegang pada batas tertinggi yang insidensinya masih
    // di bawah ambang, supaya yang diuji murni aturan rasio.
    const baseline = Math.max(1, Math.floor(maksDiBawahInsidensi("DBD") / 1.75));
    const s = statusUji([
      ...kasusDesa(baseline + 2, 1, "DBD"),
      ...kasusDesa(baseline, 8, "DBD"),
      ...kasusDesa(baseline, 15, "DBD"),
      ...kasusDesa(baseline, 22, "DBD"),
    ]);
    const dbd = s.perPenyakit.find((p) => p.penyakit === "DBD")!;
    expect(dbd.insidensi!).toBeLessThan(AMBANG.DBD.insidensiMin);
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

describe("penduduk desa tersedia (insidensi dihitung)", () => {
  it("penduduk dan insidensi terisi, bukan null", () => {
    const s = statusUji(kasusDesa(40, 1, "DBD"));

    expect(s.penduduk).not.toBeNull();
    expect(s.penduduk).toBeGreaterThan(0);
    expect(s.insidensi).not.toBeNull();
    for (const p of s.perPenyakit) {
      expect(p.insidensi).not.toBeNull();
      expect(p.alasan).not.toContain(`Aturan insidensi tidak dinilai (${PENDUDUK_BELUM_TERSEDIA})`);
    }
  });

  it("formatInsidensi menampilkan angka, bukan teks kosong", () => {
    expect(formatInsidensi(null)).toBe(PENDUDUK_BELUM_TERSEDIA);
    expect(formatInsidensi(0)).toBe("0.0");
    expect(formatInsidensi(12.34)).toBe("12.3");
  });

  it("status tetap bisa dihitung (rasio + insidensi aktif)", () => {
    const s = statusUji(kasusDesa(40, 1, "DBD"));
    expect(s.level).toBe("Sinyal");
  });
});
