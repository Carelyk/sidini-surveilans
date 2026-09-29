import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AMBANG } from "@/data/ambang";
import { KECAMATAN } from "@/data/wilayah";
import { PENYAKIT, type Penyakit } from "@/data/skdr";
import {
  MINGGU_SKDR_TERAKHIR,
  kelompokMinggu,
  statusMingguanKecamatan,
  type FilterSKDR,
} from "@/lib/skdr";

/**
 * Butir B: syarat kasus minimum pada KRITERIA RASIO untuk status Waspada di
 * tingkat kecamatan, mingguan.
 *
 * Diagnosis lebih dulu (belum ada perubahan kode saat diagnosis itu ditulis):
 * untuk Hepatitis A tahun 2026, minggu 1-39, dari 108 sel (kecamatan x
 * minggu) yang berstatus Waspada, 108 dipicu kriteria rasio, 0 dipicu
 * insidensi, 0 dipicu kematian. Rata-rata kasus per kecamatan per minggu
 * hanya 0,22, median 0, maksimum 1. Hampir semua sel itu adalah "1 kasus,
 * rasio 1,5x sampai 8x" terhadap baseline yang berupa pecahan, misalnya
 * 1 kasus melawan baseline 0,33 menghasilkan rasio 3,0.
 *
 * Karena pemicunya rasio pada kasus kecil, perbaikannya adalah syarat kasus
 * minimum, BUKAN menggeser angka ambang. Angka ambang (rasio 1,5x dan 2x,
 * insidensi, kematian) tidak disentuh. Syarat yang dipakai adalah field
 * kasusMin yang sudah ada di src/data/ambang.ts; cakupannya saja yang
 * diperluas, dari KLB saja menjadi KLB dan Waspada.
 */
const SEMUA_MINGGU: Omit<FilterSKDR, "penyakit" | "tahun"> = {
  mingguDari: 1,
  mingguSampai: MINGGU_SKDR_TERAKHIR,
};

function hitung(tahun: number, penyakit: Penyakit): { waspada: number; klb: number } {
  const per = kelompokMinggu(statusMingguanKecamatan({ tahun, penyakit, ...SEMUA_MINGGU }));
  return { waspada: per.waspada.size, klb: per.klb.size };
}

describe("syarat kasus minimum pada kriteria rasio mingguan", () => {
  it("tidak ada sel Waspada yang dipicu rasio pada kasus di bawah kasusMin", () => {
    // Inilah penjaga inti. Kalau syaratnya dilepas lagi, test ini gagal
    // karena bakal muncul sel seperti "1 kasus, rasio 3x".
    const pelanggaran: string[] = [];
    for (const tahun of [2025, 2026]) {
      for (const penyakit of PENYAKIT) {
        const a = AMBANG[penyakit];
        for (const b of statusMingguanKecamatan({
          tahun,
          penyakit,
          ...SEMUA_MINGGU,
        })) {
          if (b.level !== "Waspada") continue;
          if (b.jumlah >= a.kasusMin) continue;
          // Sel yang lolos harus datang dari kriteria insidensi atau kematian.
          const ins =
            (b.jumlah / (KECAMATAN.find((k) => k.kode === b.kode)?.penduduk ?? 1)) * 100000;
          const dariInsidensi = ins >= a.insidensiMin * 0.6;
          const dariKematian = a.kematianEskalasi && b.meninggal >= 1;
          if (!dariInsidensi && !dariKematian) {
            pelanggaran.push(
              `${penyakit} ${tahun} M${b.minggu} ${b.kode}: ${b.jumlah} kasus, insidensi ${ins.toFixed(1)}, ${b.meninggal} kematian`,
            );
          }
        }
      }
    }
    expect(pelanggaran).toEqual([]);
  });

  it("ambang rasio, insidensi, dan kematian tidak bergerak", () => {
    // Syarat kasus minimum boleh ditambah; angka ambang tidak.
    for (const penyakit of PENYAKIT) {
      expect(AMBANG[penyakit].rasioWaspada).toBe(1.5);
      expect(AMBANG[penyakit].rasioKLB).toBe(2);
    }
    expect(AMBANG.DBD.insidensiMin).toBe(50);
    expect(AMBANG.Diare.insidensiMin).toBe(100);
    expect(AMBANG.Chikungunya.insidensiMin).toBe(15);
    expect(AMBANG["Hepatitis A"].insidensiMin).toBe(15);
    expect(AMBANG.DBD.kematianEskalasi).toBe(true);
    expect(AMBANG.Diare.kematianEskalasi).toBe(false);
  });

  it("kasusMin yang dipakai adalah field yang sudah ada, tidak ada angka baru", () => {
    // Tidak ada konstanta kasus minimum mingguan yang baru. Hepatitis A dan
    // Chikungunya bernilai 3, sama dengan KASUS_MIN_WASPADA_HARIAN, jadi
    // aturan mingguan sekarang sama dengan aturan lapis harian untuk kedua
    // penyakit itu.
    expect(AMBANG.DBD.kasusMin).toBe(5);
    expect(AMBANG.Diare.kasusMin).toBe(40);
    expect(AMBANG.Chikungunya.kasusMin).toBe(3);
    expect(AMBANG["Hepatitis A"].kasusMin).toBe(3);
  });

  it("jumlah minggu Waspada turun, KLB tidak berubah", () => {
    // Angka hasil pengukuran, bukan tebakan. KLB wajib tetap sama karena
    // syarat kasus minimum pada KLB sudah ada sebelumnya.
    const sebelum = {
      "DBD|2025": { waspada: 25, klb: 3 },
      "DBD|2026": { waspada: 23, klb: 6 },
      "Diare|2025": { waspada: 2, klb: 0 },
      "Diare|2026": { waspada: 2, klb: 4 },
      "Chikungunya|2025": { waspada: 27, klb: 0 },
      "Chikungunya|2026": { waspada: 28, klb: 0 },
      "Hepatitis A|2025": { waspada: 27, klb: 0 },
      "Hepatitis A|2026": { waspada: 34, klb: 0 },
    } as Record<string, { waspada: number; klb: number }>;
    for (const [kunci, lama] of Object.entries(sebelum)) {
      const [penyakit, tahun] = kunci.split("|") as [Penyakit, string];
      const sekarang = hitung(Number(tahun), penyakit);
      // KLB: tidak boleh bergerak sama sekali.
      expect(`${kunci} KLB ${sekarang.klb}`).toBe(`${kunci} KLB ${lama.klb}`);
      // Waspada: boleh turun, tapi tidak boleh naik.
      expect(`${kunci} W ${sekarang.waspada} <= ${lama.waspada}`).toBe(
        sekarang.waspada <= lama.waspada
          ? `${kunci} W ${sekarang.waspada} <= ${lama.waspada}`
          : "GAGAL",
      );
    }
  });

  it("Hepatitis A 2026 turun dari 34 minggu Waspada menjadi 0", () => {
    // Angka yang dilaporkan ke pengguna sebagai hasil butir B.
    expect(hitung(2026, "Hepatitis A").waspada).toBe(0);
    expect(hitung(2025, "Hepatitis A").waspada).toBe(0);
  });
});

describe("penjelasan aturan di UI dan Konsep", () => {
  it("dasar ambang tiap penyakit menyebut syarat kasus minimum", () => {
    for (const penyakit of PENYAKIT) {
      const dasar = AMBANG[penyakit].dasar.toLowerCase();
      expect(dasar).toContain("kasus");
      expect(dasar).toMatch(/rasio hanya dibaca/);
      // Kriteria insidensi dan kematian harus disebut bebas syarat kasus.
      expect(dasar).toMatch(/tidak memerlukan syarat itu/);
    }
  });

  it("halaman Konsep menjelaskan syaratnya dan menyebut angkanya", () => {
    const isi = readFileSync("src/routes/tentang.tsx", "utf8").replace(/\s+/g, " ");
    expect(isi).toMatch(/kriteria rasio hanya dibaca/);
    expect(isi).toMatch(/3 untuk Chikungunya dan Hepatitis A/);
    expect(isi).toMatch(/tidak memakai syarat kasus minimum/);
    // Kolom tabel harus menyebut bahwa angka itu untuk kriteria rasio.
    expect(isi).toContain("Min. kasus rasio");
  });
});
