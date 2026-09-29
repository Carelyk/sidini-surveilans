import { describe, expect, it } from "vitest";

import { DATASET_AWAL, DESA, type Kasus } from "@/data/dataset";
import { statusPerDesa } from "@/lib/analitik";
import {
  METRIK_BELUM_TERUKUR,
  akhirMingguISO,
  hariDalamMingguISO,
  keterlambatanLapor,
  waktuDeteksi,
} from "@/lib/dampak";

/**
 * Butir 15 dari audit: metrik dampak hanya boleh dihitung dari data yang ada.
 * Tes ini menjaga dua hal: angka tidak pernah dikarang, dan data yang kurang
 * menghasilkan null (lalu ditulis "belum diukur" di UI), bukan angka tebakan.
 */

function kasusBaru(
  isi: Partial<Kasus> & Pick<Kasus, "id" | "tanggalOnset" | "tanggalLapor">,
): Kasus {
  return {
    penyakit: "DBD",
    puskesmas: DESA[0]!.puskesmas,
    kodeDesa: DESA[0]!.kode,
    desa: DESA[0]!.nama,
    kecamatan: DESA[0]!.kecamatan,
    kelompokUmur: "5-14",
    jenisKelamin: "L",
    status: "Terverifikasi",
    sumber: "Puskesmas",
    gejala: [],
    ...isi,
  } as Kasus;
}

describe("hari dalam minggu ISO", () => {
  it("menghitung Senin sebagai hari pertama", () => {
    expect(hariDalamMingguISO("2026-09-21")).toBe(0);
    expect(hariDalamMingguISO("2026-09-27")).toBe(6);
  });

  it("menutup minggu pada hari Minggu", () => {
    expect(akhirMingguISO("2026-09-21")).toBe("2026-09-27");
    expect(akhirMingguISO("2026-09-25")).toBe("2026-09-27");
    expect(akhirMingguISO("2026-09-27")).toBe("2026-09-27");
  });
});

describe("keterlambatan pelaporan", () => {
  it("menghitung sebaran selisih hari antara onset dan lapor", () => {
    const hasil = keterlambatanLapor([
      kasusBaru({ id: "a", tanggalOnset: "2026-08-10", tanggalLapor: "2026-08-11" }),
      kasusBaru({ id: "b", tanggalOnset: "2026-08-10", tanggalLapor: "2026-08-13" }),
      kasusBaru({ id: "c", tanggalOnset: "2026-08-10", tanggalLapor: "2026-08-10" }),
    ]);
    expect(hasil.jumlah).toBe(3);
    expect(hasil.rata).toBeCloseTo(1.33, 2);
    expect(hasil.median).toBe(1);
    expect(hasil.maks).toBe(3);
  });

  it("tidak mengarang angka saat tidak ada data sama sekali", () => {
    const hasil = keterlambatanLapor([]);
    expect(hasil.jumlah).toBe(0);
    expect(hasil.tidakTerukur).toBe(0);
  });

  it("memisahkan kasus yang tidak bisa diukur", () => {
    const hasil = keterlambatanLapor([
      kasusBaru({ id: "a", tanggalOnset: "2026-08-10", tanggalLapor: "2026-08-11" }),
      // Tanggal lapor lebih dulu dari onset: tidak mungkin terjadi, jadi
      // tidak boleh ikut menghitung rata-rata.
      kasusBaru({ id: "b", tanggalOnset: "2026-08-10", tanggalLapor: "2026-08-08" }),
    ]);
    expect(hasil.jumlah).toBe(1);
    expect(hasil.tidakTerukur).toBe(1);
    expect(hasil.rata).toBe(1);
  });

  it("mengukur seluruh kasus valid pada dataset bawaan", () => {
    const hasil = keterlambatanLapor(DATASET_AWAL);
    expect(hasil.jumlah).toBeGreaterThan(0);
    expect(hasil.maks).toBeGreaterThanOrEqual(hasil.p90);
    expect(hasil.p90).toBeGreaterThanOrEqual(hasil.median);
  });
});

describe("waktu deteksi per desa", () => {
  const status = statusPerDesa(DATASET_AWAL);
  const hasil = waktuDeteksi(DATASET_AWAL, status);

  it("tidak menghasilkan baris bila tidak ada desa berstatus Sinyal", () => {
    expect(waktuDeteksi(DATASET_AWAL, [])).toEqual([]);
  });

  it("hanya memproses desa yang statusnya Sinyal", () => {
    const sinyalKode = new Set(status.filter((s) => s.level === "Sinyal").map((s) => s.kode));
    for (const baris of hasil) {
      expect(sinyalKode.has(baris.kode)).toBe(true);
      expect(baris.penyakit).not.toBeNull();
    }
  });

  it("tidak pernah memberi angka saat sinyalnya tidak bisa ditanggalkan", () => {
    for (const baris of hasil) {
      if (baris.tanggalSinyal === null || baris.tepiJendela) {
        expect(baris.hariLebihAwal).toBeNull();
        expect(baris.hariDariOnset).toBeNull();
        expect(baris.tanggalRekapMingguan).toBeNull();
        expect(baris.catatan).not.toBeNull();
      }
    }
  });

  it("batas hari lebih awal mengikuti asumsi minggu ISO", () => {
    for (const baris of hasil) {
      if (baris.hariLebihAwal === null) continue;
      expect(baris.hariLebihAwal).toBeGreaterThanOrEqual(0);
      expect(baris.hariLebihAwal).toBeLessThanOrEqual(6);
      expect(baris.tanggalRekapMingguan).toBe(akhirMingguISO(baris.tanggalSinyal!));
      // Rekap mingguan menutup pada Minggu.
      expect(hariDalamMingguISO(baris.tanggalRekapMingguan!)).toBe(6);
    }
  });

  it("mengurutkan dari yang paling awal lebih awal", () => {
    const angka = hasil.map((b) => b.hariLebihAwal ?? -1);
    const terurut = [...angka].sort((a, b) => b - a);
    expect(angka).toEqual(terurut);
  });

  it("menandai sinyal yang tidak bisa dihitung, bukan mengarang angka", () => {
    // Desa tanpa kasus apa pun: tidak mungkin berstatus Sinyal, jadi fungsi
    // ini tidak boleh mengarang tanggal sinyal untuknya.
    const hasilTanpaKasus = waktuDeteksi([], status);
    for (const baris of hasilTanpaKasus) {
      expect(baris.tanggalSinyal).toBeNull();
      expect(baris.catatan).toMatch(/tidak bisa dihitung/i);
    }
  });
});

describe("metrik yang belum terukur", () => {
  it("setiap metrik punya alasan dan cara mengukur", () => {
    expect(METRIK_BELUM_TERUKUR.length).toBeGreaterThan(0);
    for (const m of METRIK_BELUM_TERUKUR) {
      expect(m.nama.length).toBeGreaterThan(0);
      expect(m.alasan.length).toBeGreaterThan(0);
      expect(m.caraMengukur.length).toBeGreaterThan(0);
    }
  });

  it("tiap metrik menjelaskan langkah pencatan yang konkret", () => {
    for (const m of METRIK_BELUM_TERUKUR) {
      expect(m.caraMengukur).toMatch(/catat|tambahkan|masukkan|tetapkan/i);
    }
  });

  it("tidak memuat klaim waktu tanggap yang belum ada datanya", () => {
    for (const m of METRIK_BELUM_TERUKUR) {
      expect(m.alasan).not.toMatch(/\d+\s*(jam|hari)\b/i);
    }
  });
});
