import { describe, expect, it } from "vitest";

import {
  DATASET_AWAL,
  KELOMPOK_UMUR,
  NAMA_KELOMPOK_UMUR,
  selaraskanKelompokUmur,
  type KelompokUmur,
  type Kasus,
} from "@/data/dataset";
import { perUmurPenyakit } from "@/lib/analitik";
import { normalisasiKasusTambahan } from "@/lib/kasus-peramban";

/**
 * Bug: kasus yang sudah tersimpan di peramban masih memakai kelompok umur versi
 * lama (5-14, 15-44, 45-64, 65+). Setelah tabel kelompok umur diganti mengikuti
 * Kemenkes, label lama tidak lagi ada di KELOMPOK_UMUR, sehingga perhitungan
 * per kelompok umur bernilai nol untuk semua kelompok selain "0-4". Di
 * dashboard, grafik "Kelompok umur (7 hari)" lalu hanya menampilkan satu
 * batang.
 */
const LAMA = ["5-14", "15-44", "45-64", "65+"] as const;

describe("selaraskanKelompokUmur", () => {
  it("label yang sudah dikenal dikembalikan apa adanya", () => {
    for (const u of KELOMPOK_UMUR) {
      expect(selaraskanKelompokUmur(u)).toBe(u);
    }
  });

  it("memetakan setiap kelompok versi lama ke kelompok yang memuat usianya", () => {
    expect(selaraskanKelompokUmur("5-14")).toBe("5-9");
    expect(selaraskanKelompokUmur("15-44")).toBe("10-18");
    expect(selaraskanKelompokUmur("45-64")).toBe("19-59");
    expect(selaraskanKelompokUmur("65+")).toBe("60+");
  });

  it("label '0-4' tetap sama karena sudah ada di tabel sekarang", () => {
    expect(selaraskanKelompokUmur("0-4")).toBe("0-4");
  });

  it("nilai bukan string menghasilkan null, bukan tebakan", () => {
    expect(selaraskanKelompokUmur(null)).toBeNull();
    expect(selaraskanKelompokUmur(undefined)).toBeNull();
    expect(selaraskanKelompokUmur("")).toBeNull();
  });

  it("label asing tidak dipetakan diam-diam ke kelompok mana pun", () => {
    expect(selaraskanKelompokUmur("99-120")).toBeNull();
    expect(selaraskanKelompokUmur("masa sekolah")).toBeNull();
  });

  it("semua kelompok versi lama punya pemetaan", () => {
    for (const lama of LAMA) {
      expect(selaraskanKelompokUmur(lama)).not.toBeNull();
    }
  });

  it("hasil pemetaan selalu kelompok yang ada di tabel", () => {
    for (const lama of [...LAMA, "0-4", "0-5", "25-44", "15-24", "10-14", "60+"]) {
      const hasil = selaraskanKelompokUmur(lama);
      expect(KELOMPOK_UMUR).toContain(hasil as never);
    }
  });
});

/**
 * Kontrak simpan-ulang: storage hanya boleh berisi kelompok umur yang dikenal.
 * Ini yang mencegah data usang menetap lagi setelah migrasi berjalan sekali.
 */
describe("normalisasiKasusTambahan", () => {
  const dasar = {
    id: "BB-U1",
    kodeDesa: (DATASET_AWAL[0] as Kasus).kodeDesa,
    penyakit: "DBD",
    tanggalOnset: "2026-09-20",
    tanggalLapor: "2026-09-21",
    jenisKelamin: "L",
    status: "Baru",
    sumber: "Warga",
    gejala: [],
  };

  it("menolak kelompok umur versi lama dari peramban", () => {
    for (const lama of LAMA) {
      const hasil = normalisasiKasusTambahan([{ ...dasar, kelompokUmur: lama }]);
      expect(hasil.diterima).toBe(0);
      expect(hasil.ditolak["kelompok-umur-tidak-dikenal"]).toBe(1);
    }
  });

  it("menerima kelompok umur versi sekarang", () => {
    const hasil = normalisasiKasusTambahan([{ ...dasar, kelompokUmur: "10-18" }]);
    expect(hasil.diterima).toBe(1);
  });
});

/**
 * Efek migrasi pada tampilan: kalau SELURUH kasus pakai label lama, setelah
 * dipetakan semua kelompok harus berisi. Tanpa migrasi, hanya "0-4" yang
 * terisi dan empat kelompok lagi nol.
 */
describe("efek migrasi pada grafik kelompok umur", () => {
  it("kasus versi lama menghasilkan kelima kelompok terisi", () => {
    /** Setiap kelompok sekarang dipetakan ke satu label versi lama. */
    const KE_LAMA: Record<KelompokUmur, string> = {
      "0-4": "5-14",
      "5-9": "15-44",
      "10-18": "45-64",
      "19-59": "65+",
      "60+": "0-4",
    };

    const lama = DATASET_AWAL.slice(0, 200).map((k) => {
      // Sengaja dipaksakan ke tipe Kasus meski labelnya versi lama: itulah
      // kondisi data yang tersimpan sebelum kelompok umur diganti.
      return { ...k, kelompokUmur: KE_LAMA[k.kelompokUmur] } as unknown as Kasus;
    });

    const sebelum = perUmurPenyakit(lama);
    const totalSebelum = sebelum.reduce((a, t) => a + t.jumlah, 0);
    const terisiSebelum = sebelum.filter((t) => t.jumlah > 0).length;
    expect(terisiSebelum).toBeLessThan(KELOMPOK_UMUR.length);

    const sesudah = perUmurPenyakit(
      lama
        .map((k) => {
          const kelompok = selaraskanKelompokUmur(k.kelompokUmur);
          return kelompok ? { ...k, kelompokUmur: kelompok } : null;
        })
        .filter((k): k is Kasus => k !== null),
    );
    const totalSesudah = sesudah.reduce((a, t) => a + t.jumlah, 0);

    // Kasus yang tadinya tidak terhitung sekarang ikut terhitung,
    // dan kelima kelompok punya isi.
    expect(totalSebelum).toBeLessThan(lama.length);
    expect(totalSesudah).toBe(lama.length);
    expect(sesudah.every((t) => t.jumlah > 0)).toBe(true);
  });

  it("nama kelompok hasil migrasi selalu punya label tampilan", () => {
    for (const lama of LAMA) {
      const hasil = selaraskanKelompokUmur(lama);
      expect(hasil).not.toBeNull();
      expect(NAMA_KELOMPOK_UMUR[hasil as never]).toBeTruthy();
    }
  });
});
