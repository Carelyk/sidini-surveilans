import { describe, expect, it } from "vitest";

import {
  BATAS_JUMLAH_KASUS,
  jumlahKasusTersimpan,
  onsetTerawal,
  validasiOnset,
} from "@/lib/formulir";
import { JUMLAH_HARI, TANGGAL_ACUAN } from "@/data/dataset";

/**
 * Butir 11 dari audit: toast harus menyebut jumlah kasus yang benar-benar
 * tersimpan (setelah clamp), dan tanggal onset harus divalidasi.
 */
describe("jumlah kasus tersimpan", () => {
  it("menyamakan nilai yang diketik dengan nilai yang disimpan", () => {
    // Toast harus memakai angka ini, bukan angka mentah dari input.
    expect(jumlahKasusTersimpan(7)).toBe(7);
    expect(jumlahKasusTersimpan(1)).toBe(1);
    expect(jumlahKasusTersimpan(20)).toBe(20);
  });

  it("membatasi nilai di luar 1-20", () => {
    expect(jumlahKasusTersimpan(50)).toBe(20);
    expect(jumlahKasusTersimpan(0)).toBe(1);
    expect(jumlahKasusTersimpan(-3)).toBe(1);
    expect(jumlahKasusTersimpan(20.7)).toBe(20);
  });

  it("menangani masukan kosong atau bukan angka", () => {
    expect(jumlahKasusTersimpan(Number.NaN)).toBe(BATAS_JUMLAH_KASUS.min);
    expect(jumlahKasusTersimpan(Number.POSITIVE_INFINITY)).toBe(BATAS_JUMLAH_KASUS.max);
  });
});

describe("validasi tanggal onset", () => {
  it("wajib diisi", () => {
    const hasil = validasiOnset("", TANGGAL_ACUAN);
    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/wajib diisi/);
  });

  it("menolak tanggal di luar rentang observasi", () => {
    expect(onsetTerawal(TANGGAL_ACUAN)).toBe("2026-08-15"); // 41 hari sebelum acuan
    expect(validasiOnset("2026-08-15", TANGGAL_ACUAN).ok).toBe(true);
    expect(validasiOnset("2026-08-14", TANGGAL_ACUAN).ok).toBe(false);
    expect(validasiOnset("2026-09-26", TANGGAL_ACUAN).ok).toBe(false);
    expect(validasiOnset("bukan-tanggal", TANGGAL_ACUAN).ok).toBe(false);
  });

  it("rentang observasi mengikuti panjang dataset", () => {
    expect(JUMLAH_HARI).toBe(42);
  });
});
