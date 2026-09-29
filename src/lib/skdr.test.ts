import { describe, expect, it } from "vitest";

import {
  JUMLAH_MINGGU,
  LABEL_RENTANG_SKDR,
  MINGGU_SKDR_TERAKHIR,
  bandingkanPenyakit,
  dalamRentang,
  kelompokMinggu,
  ringkasan,
  statusMingguanKecamatan,
  terfilter,
  type Level,
} from "@/lib/skdr";
import { PENYAKIT } from "@/data/skdr";
import { MINGGU_DATA_TERAKHIR } from "@/data/kronologi";

/**
 * Butir 8 dari audit: "Mgg Waspada" dulu menghitung minggu yang sudah KLB
 * di kecamatan lain, sehingga satu minggu terhitung dua kali dan jumlah
 * "Mgg KLB + Mgg Waspada" bisa melebihi jumlah minggu dalam rentang.
 */
describe("kelompokMinggu: definisi Mgg KLB dan Mgg Waspada", () => {
  it("minggu KLB tidak dihitung lagi sebagai minggu waspada", () => {
    const baris: { minggu: number; level: Level }[] = [
      { minggu: 1, level: "KLB" },
      { minggu: 1, level: "Waspada" },
      { minggu: 2, level: "Waspada" },
    ];
    const { klb, waspada } = kelompokMinggu(baris);
    expect([...klb]).toEqual([1]);
    expect([...waspada]).toEqual([2]);
    expect(klb.size + waspada.size).toBeLessThanOrEqual(2);
  });

  it("dua himpunan minggu tidak pernah beririsan", () => {
    const baris: { minggu: number; level: Level }[] = [
      { minggu: 5, level: "KLB" },
      { minggu: 5, level: "Waspada" },
      { minggu: 6, level: "Waspada" },
      { minggu: 7, level: "Aman" },
    ];
    const { klb, waspada } = kelompokMinggu(baris);
    for (const m of klb) expect(waspada.has(m)).toBe(false);
  });
});

describe("SKDR mingguan: jumlah minggu tidak lagi dobel hitung", () => {
  const hasil = bandingkanPenyakit(2026, 1, JUMLAH_MINGGU);

  it("Mgg KLB + Mgg Waspada tidak melebihi jumlah minggu dalam rentang", () => {
    for (const p of hasil) {
      expect(p.mingguKLB + p.mingguWaspada).toBeLessThanOrEqual(JUMLAH_MINGGU);
    }
  });

  it("ringkasan per penyakit memakai definisi yang sama", () => {
    for (const p of hasil) {
      const baris = statusMingguanKecamatan({
        tahun: 2026,
        mingguDari: 1,
        mingguSampai: JUMLAH_MINGGU,
        penyakit: p.penyakit,
      });
      const { klb, waspada } = kelompokMinggu(baris);
      expect(p.mingguKLB).toBe(klb.size);
      expect(p.mingguWaspada).toBe(waspada.size);
    }
  });

  it("setiap minggu waspada yang bukan minggu KLB tetap ikut terhitung", () => {
    for (const p of hasil) {
      const baris = statusMingguanKecamatan({
        tahun: 2026,
        mingguDari: 1,
        mingguSampai: JUMLAH_MINGGU,
        penyakit: p.penyakit,
      });
      const semuaMingguWaspada = new Set(
        baris.filter((b) => b.level === "Waspada").map((b) => b.minggu),
      );
      const { klb, waspada } = kelompokMinggu(baris);
      for (const m of semuaMingguWaspada) {
        expect(waspada.has(m)).toBe(!klb.has(m));
      }
    }
  });

  it("menutupi seluruh penyakit", () => {
    expect(hasil.map((p) => p.penyakit).sort()).toEqual([...PENYAKIT].sort());
  });
});

/**
 * Butir 2 lanjutan: deret SKDR dipotong di minggu data terakhir.
 *
 * Sebelumnya rentang 1-52 dipakai utuh, padahal data kasus per desa berhenti
 * di minggu 39. Minggu 40-52 yang ditampilkan membuat pembaca mengira angka
 * itu hasil laporan.
 */
describe("deret SKDR dipotong di minggu data terakhir", () => {
  it("batas minggu mengikuti tanggal data, bukan angka mati", () => {
    expect(MINGGU_SKDR_TERAKHIR).toBe(MINGGU_DATA_TERAKHIR);
    expect(MINGGU_SKDR_TERAKHIR).toBeLessThan(JUMLAH_MINGGU);
    expect(LABEL_RENTANG_SKDR).toBe(`minggu 1-${MINGGU_SKDR_TERAKHIR}`);
  });

  it("dalamRentang menjepit minggu 40-52 ke minggu data terakhir", () => {
    const g = dalamRentang({ tahun: 2026, mingguDari: 1, mingguSampai: 52, penyakit: "DBD" });
    expect(g.mingguSampai).toBe(MINGGU_SKDR_TERAKHIR);
    expect(g.mingguDari).toBe(1);

    const turun = dalamRentang({
      tahun: 2026,
      mingguDari: 45,
      mingguSampai: 52,
      penyakit: "DBD",
    });
    expect(turun.mingguDari).toBe(MINGGU_SKDR_TERAKHIR);
    expect(turun.mingguSampai).toBe(MINGGU_SKDR_TERAKHIR);
  });

  it("tidak ada baris mingguan setelah minggu data terakhir", () => {
    for (const p of PENYAKIT) {
      const baris = statusMingguanKecamatan({
        tahun: 2026,
        mingguDari: 1,
        mingguSampai: JUMLAH_MINGGU,
        penyakit: p,
      });
      expect(baris.length).toBeGreaterThan(0);
      for (const b of baris) {
        expect(b.minggu).toBeGreaterThanOrEqual(1);
        expect(b.minggu).toBeLessThanOrEqual(MINGGU_SKDR_TERAKHIR);
      }
    }
  });

  it("terfilter tidak pernah mengembalikan minggu 40-52", () => {
    const baris = terfilter({ tahun: 2026, mingguDari: 1, mingguSampai: 52, penyakit: "DBD" });
    expect(baris.length).toBeGreaterThan(0);
    for (const b of baris) expect(b.minggu).toBeLessThanOrEqual(MINGGU_SKDR_TERAKHIR);
  });

  it("ringkasan menghitung jumlah minggu 1-39, bukan 52", () => {
    const r = ringkasan({ tahun: 2026, mingguDari: 1, mingguSampai: 52, penyakit: "DBD" });
    expect(r.minggu).toBe(MINGGU_SKDR_TERAKHIR);
  });

  it("perbandingan antar tahun memakai rentang yang sama", () => {
    // Dua tahun dibandingkan pada minggu 1..MINGGU_SKDR_TERAKHIR. Kalau salah
    // satu pakai 52 minggu, selisihnya mengukur panjang rentang, bukan epidemi.
    const a = bandingkanPenyakit(2025, 1, MINGGU_SKDR_TERAKHIR);
    const b = bandingkanPenyakit(2026, 1, MINGGU_SKDR_TERAKHIR);
    for (let i = 0; i < a.length; i++) {
      expect(a[i]!.minggu).toBe(b[i]!.minggu);
      expect(a[i]!.minggu).toBe(MINGGU_SKDR_TERAKHIR);
    }
  });

  it("Mgg KLB dan Mgg Waspada tidak melebihi rentang yang ditampilkan", () => {
    for (const tahun of [2025, 2026]) {
      for (const p of bandingkanPenyakit(tahun, 1, MINGGU_SKDR_TERAKHIR)) {
        expect(p.mingguKLB + p.mingguWaspada).toBeLessThanOrEqual(MINGGU_SKDR_TERAKHIR);
      }
    }
  });
});
