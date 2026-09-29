import { describe, expect, it } from "vitest";

import {
  BATAS_KEDALUWARSA_JAM,
  MINGGU_DATA_TERAKHIR,
  PEMBARUAN_TERAKHIR,
  TAHUN_DATA_TERAKHIR,
  dataKedaluwarsa,
  jamSejakPembaruan,
  mingguISO,
  usiaData,
  waktuPembaruan,
} from "@/data/kronologi";

/**
 * Butir 7 dan 9 dari audit: satu sumber untuk waktu pembaruan data, dan
 * preset "seminggu terakhir" yang mengikuti tanggal data terakhir (bukan
 * minggu 46-52 yang ditulis mati di FilterSKDRBar).
 */
describe("waktu pembaruan data", () => {
  it("waktu pembaruan ditampilkan lengkap dengan zona WIB", () => {
    // Selalu memuat tahun, tanggal, jam, dan WIB. Tidak boleh ada "hari ini".
    const teks = waktuPembaruan();
    expect(teks).toMatch(/WIB$/);
    expect(teks).toMatch(/\d{2}\.\d{2}/);
    expect(teks).toContain("2026");
    expect(teks).not.toMatch(/hari ini/i);
  });

  it("kedaluwarsa mengikuti batas jam yang dikonfigurasi", () => {
    const dasar = new Date(PEMBARUAN_TERAKHIR).getTime();
    const jam = (n: number) => new Date(dasar + n * 3_600_000);

    expect(jamSejakPembaruan(jam(0))).toBe(0);
    expect(dataKedaluwarsa(jam(BATAS_KEDALUWARSA_JAM - 1))).toBe(false);
    expect(dataKedaluwarsa(jam(BATAS_KEDALUWARSA_JAM))).toBe(true);
    expect(dataKedaluwarsa(jam(BATAS_KEDALUWARSA_JAM + 1))).toBe(true);
  });

  it("usia data ditulis dalam bahasa manusia", () => {
    const dasar = new Date(PEMBARUAN_TERAKHIR).getTime();
    const jam = (n: number) => new Date(dasar + n * 3_600_000);
    expect(usiaData(jam(0.5))).toBe("baru saja");
    expect(usiaData(jam(3))).toBe("3 jam lalu");
    expect(usiaData(jam(50))).toBe("2 hari lalu");
  });
});

describe("nomor minggu ISO", () => {
  it("mengikuti aturan ISO-8601 (minggu 1 memuat 4 Januari)", () => {
    expect(mingguISO("2026-01-01")).toBe(1); // Kamis 1 Januari 2026
    expect(mingguISO("2026-09-25")).toBe(39); // Jumat minggu ke-39
    // 2026 punya 53 minggu ISO karena 1 Januari 2026 jatuh hari Kamis.
    expect(mingguISO("2026-12-28")).toBe(53); // Senin minggu ke-53
    expect(mingguISO("2026-12-31")).toBe(53);
  });

  it("minggu 1 bisa jatuh di tahun sebelumnya", () => {
    // 1 Januari 2021 = Jumat, jadi minggu 1 Iso 2021 mulai 28 Des 2020.
    expect(mingguISO("2021-01-01")).toBe(53);
    expect(mingguISO("2021-01-04")).toBe(1);
  });
});

describe("preset mingguan diturunkan dari tanggal data", () => {
  it("minggu data terakhir adalah minggu 39 tahun 2026", () => {
    expect(MINGGU_DATA_TERAKHIR).toBe(39);
    expect(TAHUN_DATA_TERAKHIR).toBe(2026);
  });
});
