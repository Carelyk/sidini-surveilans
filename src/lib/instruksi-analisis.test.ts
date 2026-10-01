import { describe, expect, it } from "vitest";

import { instruksiAnalisis } from "@/lib/ai.functions";

/**
 * Kontrak lima bagian jawaban saat ada pertanyaan pengguna.
 *
 * Bug yang diperbaiki: pertanyaan pengguna ditempel sebagai blok data lalu
 * ditutup dengan "Tulis analisis naratif lengkap sesuai format". Lima bagian
 * beserta batas kata sudah memenuhi kuota jawaban model, sehingga pertanyaan
 * pengguna tidak pernah dijawab — hanya disinggung sekali. Test ini mengunci
 * bahwa lima bagian tetap wajib meski ada pertanyaan.
 */
describe("instruksi analisis", () => {
  it("tanpa pertanyaan tetap meminta laporan sesuai format", () => {
    expect(instruksiAnalisis("")).toBe("Tulis analisis naratif lengkap sesuai format.");
  });

  it("blok pertanyaan ikut tersalin, jadi model tahu apa yang ditanyakan", () => {
    const out = instruksiAnalisis("<PERTANYAAN>\nrasio 6 itu apa?\n</PERTANYAAN>");
    expect(out).toContain("rasio 6 itu apa?");
  });

  it("lima bagian tetap wajib ada meski ada pertanyaan", () => {
    const out = instruksiAnalisis("<PERTANYAAN>\ntanya\n</PERTANYAAN>");
    expect(out).toContain("Kelima bagian pada format di atas tetap WAJIB ada lengkap");
    expect(out).toContain("bagian 2 sampai 5");
  });

  it("bagian 1 wajib dibuka jawaban langsung, bukan sekadar disinggung", () => {
    const out = instruksiAnalisis("<PERTANYAAN>\ntanya\n</PERTANYAAN>");
    expect(out).toContain("bagian 1 WAJIB dibuka dengan jawaban langsung");
  });

  it("meminta istilah teknis dijelaskan lebih dulu", () => {
    const out = instruksiAnalisis("<PERTANYAAN>\ntanya\n</PERTANYAAN>");
    expect(out).toContain("rasio, baseline, atau insidensi");
  });

  it("melarang jawaban mengarang angka di luar ringkasan", () => {
    const out = instruksiAnalisis("<PERTANYAAN>\ntanya\n</PERTANYAAN>");
    expect(out).toContain("tidak tersedia");
  });

  it("blok kosong tidak memunculkan aturan tambahan apa pun", () => {
    const out = instruksiAnalisis("");
    expect(out).not.toContain("WAJIB ada lengkap");
    expect(out).not.toContain("tidak tersedia");
  });
});
