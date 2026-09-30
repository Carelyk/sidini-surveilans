import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AMBANG,
  ATURAN_WASPADA,
  KASUS_MIN_WASPADA,
  KASUS_MIN_WASPADA_HARIAN,
  KASUS_MIN_WASPADA_SKDR,
} from "@/data/ambang";
import { KECAMATAN } from "@/data/wilayah";
import { PENYAKIT, type Penyakit } from "@/data/skdr";
import {
  MINGGU_SKDR_TERAKHIR,
  kelompokMinggu,
  statusMingguanKecamatan,
  type FilterSKDR,
} from "@/lib/skdr";

/**
 * Status Waspada memakai SATU konstanta bersama untuk semua penyakit, sama
 * di lapis harian (7 hari per desa) dan lapis SKDR (1 minggu per kecamatan).
 *
 * Latar belakang, hasil pengukuran pada minggu 1-39 sel per kecamatan per
 * minggu, sebelum syarat ini ada:
 *
 * - Hepatitis A 2026: total kasus 270, rata-rata 0,22 kasus per kecamatan
 *   per minggu, median 0, maksimum 1. Dari 108 sel Waspada, 108 dipicu
 *   kriteria rasio, 0 dipicu insidensi, 0 dipicu kematian. Hampir semua sel
 *   itu adalah "1 kasus, rasio 1,5x sampai 8x" melawan baseline yang berupa
 *   pecahan; 1 kasus melawan baseline 0,33 menghasilkan rasio 3,0.
 * - Chikungunya 2026: total kasus 533, rata-rata 0,44, median 0, maksimum
 *   3. Dari 58 sel Waspada, 58 dipicu rasio, 0 insidensi, 0 kematian.
 * - DBD 2026: total kasus 4.346, rata-rata 3,59, median 2, maksimum 98.
 *   Dari 85 sel Waspada, 60 rasio, 0 insidensi, 27 kematian. DBD punya volume
 *   kasus nyata, jadi pemicunya memang campuran.
 *
 * Karena pemicunya rasio pada kasus kecil, perbaikannya adalah syarat kasus
 * minimum, BUKAN menggeser angka ambang. Rasio Waspada tetap 1,5x, rasio
 * KLB tetap 2x, insidensi tetap 50/100/15/15, dan aturan kematian tidak
 * berubah.
 */
const SEMUA_MINGGU: Omit<FilterSKDR, "penyakit" | "tahun"> = {
  mingguDari: 1,
  mingguSampai: MINGGU_SKDR_TERAKHIR,
};

function hitung(tahun: number, penyakit: Penyakit): { waspada: number; klb: number } {
  const per = kelompokMinggu(statusMingguanKecamatan({ tahun, penyakit, ...SEMUA_MINGGU }));
  return { waspada: per.waspada.size, klb: per.klb.size };
}

/** Jumlah minggu KLB dan Waspada yang diukur setelah syarat kasus minimum. */
const SESUDAH: Record<string, { waspada: number; klb: number }> = {
  "DBD|2025": { waspada: 13, klb: 3 },
  "DBD|2026": { waspada: 11, klb: 6 },
  "Diare|2025": { waspada: 2, klb: 0 },
  "Diare|2026": { waspada: 2, klb: 4 },
  "Chikungunya|2025": { waspada: 1, klb: 0 },
  "Chikungunya|2026": { waspada: 1, klb: 0 },
  "Hepatitis A|2025": { waspada: 0, klb: 0 },
  "Hepatitis A|2026": { waspada: 0, klb: 0 },
} as Record<string, { waspada: number; klb: number }>;

describe("satu konstanta bersama untuk status Waspada", () => {
  it("nilainya 3 dan sama di kedua lapis", () => {
    expect(KASUS_MIN_WASPADA).toBe(3);
    expect(KASUS_MIN_WASPADA_HARIAN).toBe(3);
    expect(KASUS_MIN_WASPADA_SKDR).toBe(3);
  });

  it("kedua alias diambil dari satu konstanta, bukan angka yang ditulis ulang", () => {
    // Kalau salah satu ditulis ulang terpisah, aturan harian dan mingguan bisa
    // diam-diam berbeda lagi.
    expect(KASUS_MIN_WASPADA_HARIAN).toBe(KASUS_MIN_WASPADA);
    expect(KASUS_MIN_WASPADA_SKDR).toBe(KASUS_MIN_WASPADA);
  });

  it("ATURAN_WASPADA menyiarkan angka yang sama untuk kedua lapis", () => {
    expect(ATURAN_WASPADA.kasusMin).toBe(KASUS_MIN_WASPADA);
    expect(ATURAN_WASPADA.alasan).toContain("3 kasus");
    expect(ATURAN_WASPADA.alasan).toContain("lapis harian");
    expect(ATURAN_WASPADA.alasan).toContain("lapis SKDR");
  });

  it("kriteria Waspada tidak memakai kasusMin per penyakit", () => {
    // kasusMin sekarang hanya untuk KLB. Nilainya sengaja dibiarkan seperti
    // semula: 40 kasus per minggu untuk diare sudah melampaui ambang
    // insidensi di kecamatan mana pun, jadi tidak bisa dipakai untuk Waspada.
    expect(AMBANG.DBD.kasusMin).toBe(5);
    expect(AMBANG.Diare.kasusMin).toBe(40);
    expect(AMBANG.Chikungunya.kasusMin).toBe(3);
    expect(AMBANG["Hepatitis A"].kasusMin).toBe(3);

    const kode = readFileSync("src/lib/skdr.ts", "utf8");
    // Kriteria rasio untuk KLB tetap memakai kasusMin per penyakit.
    expect(kode).toContain("rasio >= a.rasioKLB && c.jumlah >= a.kasusMin");
    // Kriteria rasio untuk Waspada memakai konstanta bersama.
    expect(kode).toContain("rasio >= a.rasioWaspada && c.jumlah >= KASUS_MIN_WASPADA_SKDR");
    // Tidak boleh ada sisa a.kasusMin di cabang Waspada.
    expect(kode).not.toContain("rasio >= a.rasioWaspada && c.jumlah >= a.kasusMin");
  });
});

describe("angka ambang tidak bergerak", () => {
  it("rasio, insidensi, dan kematian tetap pada nilainya", () => {
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
});

describe("efek syarat kasus minimum", () => {
  it("tidak ada sel Waspada yang lolos dari rasio dengan kasus di bawah 3", () => {
    // Inilah penjaga inti. Kalau syaratnya dilepas lagi, test ini gagal karena
    // bakal muncul sel seperti "1 kasus, rasio 3x".
    const pelanggaran: string[] = [];
    for (const tahun of [2025, 2026]) {
      for (const penyakit of PENYAKIT) {
        const a = AMBANG[penyakit];
        for (const b of statusMingguanKecamatan({ tahun, penyakit, ...SEMUA_MINGGU })) {
          if (b.level !== "Waspada") continue;
          if (b.jumlah >= KASUS_MIN_WASPADA_SKDR) continue;
          // Sel yang lolos harus datang dari kriteria insidensi atau kematian.
          const penduduk = KECAMATAN.find((k) => k.kode === b.kode)?.penduduk ?? 1;
          const ins = (b.jumlah / penduduk) * 100000;
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

  it("jumlah minggu KLB tidak berubah sama sekali", () => {
    // KLB tidak boleh bergerak karena syarat kasus minimum untuk KLB sudah
    // ada sebelumnya dan tidak disentuh.
    for (const penyakit of PENYAKIT) {
      for (const tahun of [2025, 2026]) {
        const kunci = `${penyakit}|${tahun}`;
        expect(`${kunci} KLB ${hitung(tahun, penyakit).klb}`).toBe(
          `${kunci} KLB ${SESUDAH[kunci]?.klb}`,
        );
      }
    }
  });

  it("jumlah minggu Waspada sesuai hasil pengukuran", () => {
    for (const penyakit of PENYAKIT) {
      for (const tahun of [2025, 2026]) {
        const kunci = `${penyakit}|${tahun}`;
        expect(`${kunci} W ${hitung(tahun, penyakit).waspada}`).toBe(
          `${kunci} W ${SESUDAH[kunci]?.waspada}`,
        );
      }
    }
  });

  it("penyakit berkasus sedikit memang jarang memicu Waspada", () => {
    // Dampak yang dilaporkan ke pengguna, dan sengaja dibiarkan tanpa
    // perubahan parameter simulasi lebih lanjut.
    expect(hitung(2026, "Hepatitis A").waspada).toBe(0);
    expect(hitung(2025, "Hepatitis A").waspada).toBe(0);
    expect(hitung(2026, "Chikungunya").waspada).toBe(1);
    expect(hitung(2025, "Chikungunya").waspada).toBe(1);
  });
});

describe("penjelasan aturan di UI dan Konsep", () => {
  it("dasar tiap penyakit menyebut satu angka yang sama untuk semua penyakit", () => {
    const pola = /Kriteria rasio untuk Waspada memerlukan minimal 3 kasus dalam minggu itu/;
    for (const penyakit of PENYAKIT) {
      const dasar = AMBANG[penyakit].dasar;
      expect(`${penyakit}: ${dasar.match(pola) ? "ada" : "tidak ada"}`).toBe(`${penyakit}: ada`);
      // Tidak boleh lagi menyebut angka kasus minimum per penyakit untuk
      // status Waspada.
      expect(dasar).not.toMatch(/Waspada[\s\S]{0,80}minimal (5|40) kasus/);
      // Kriteria lain bebas dari syarat kasus minimum.
      expect(dasar).toContain("tidak memakai syarat itu");
    }
  });

  it("halaman Konsep menjelaskan aturan itu sekali per blok, dari satu sumber", () => {
    const isi = readFileSync("src/routes/tentang.tsx", "utf8").replace(/\s+/g, " ");
    // Penjelasan lengkap diambil dari satu sumber, supaya halaman ini tidak
    // punya versinya sendiri yang bisa berbeda dengan konfigurasi.
    expect(isi).toContain("{ATURAN_WASPADA.alasan}");
    // Blok "Rekap SKDR mingguan" tidak boleh menyebut aturan itu dua kali.
    const blokRekap = isi.slice(
      isi.indexOf("Rekap SKDR mingguan, per kecamatan"),
      isi.indexOf("Ambang per penyakit"),
    );
    expect((blokRekap.match(/\{ATURAN_WASPADA\.alasan\}/g) ?? []).length).toBe(1);
    expect(blokRekap).not.toContain("Status Waspada memerlukan minimal");
    // Penjelasan lama yang menyebut angka per penyakit harus hilang.
    expect(isi).not.toContain("5 kasus untuk DBD, 40 untuk Diare");
    // Kolom tabel tidak boleh lagi dikira sebagai syarat Waspada.
    expect(isi).toContain("Min. kasus KLB");
    expect(isi).toContain('Kolom "Min. kasus KLB" hanya berlaku untuk status KLB');
  });

  it("halaman Konsep mencatat penyakit berkasus sedikit", () => {
    const isi = readFileSync("src/routes/tentang.tsx", "utf8").replace(/\s+/g, " ");
    expect(isi).toMatch(/Penyakit dengan kasus sedikit per kecamatan memang jarang memicu Waspada/);
    expect(isi).toMatch(/konsekuensi volume kasus pada data simulasi/);
  });

  it("panel dashboard menyebut aturan itu sekali, di bullet Waspada", () => {
    const isi = readFileSync("src/routes/index.tsx", "utf8").replace(/\s+/g, " ");
    const panel = isi.slice(
      isi.indexOf("Syarat kasus minimum (pembatas alert fatigue)"),
      isi.indexOf("Syarat kasus minimum (pembatas alert fatigue)") + 1200,
    );
    expect(panel).toContain(
      "Waspada</strong>: rasio minimal 1,5x baseline dengan minimal {KASUS_MIN_WASPADA} kasus penyakit itu dalam 7 hari. Angka yang sama berlaku di lapis SKDR mingguan per kecamatan",
    );
    // Aturan yang sama tidak boleh diulang sebagai butir tersendiri.
    expect(panel).not.toContain("Status Waspada memakai satu syarat bersama");
  });
});
