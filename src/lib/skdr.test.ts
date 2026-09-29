import { describe, expect, it } from "vitest";

import {
  JUMLAH_MINGGU,
  bandingkanPenyakit,
  kelompokMinggu,
  statusMingguanKecamatan,
  type Level,
} from "@/lib/skdr";
import { PENYAKIT } from "@/data/skdr";

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
