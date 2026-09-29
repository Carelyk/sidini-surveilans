import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AMBANG_SKDR,
  ATURAN_HARIAN,
  KASUS_MIN_SINYAL_HARIAN,
  KASUS_MIN_WASPADA_HARIAN,
} from "@/data/ambang";
import { AMBANG as AMBANG_DARI_LIB, type Ambang as AmbangDariLib } from "@/lib/skdr";

/** Halaman yang harus menyebut status acuan dan sifat simulasi angka ambang. */
const HALAMAN_AMBANG = ["src/routes/tentang.tsx", "src/components/FilterSKDRBar.tsx"];
import { PENYAKIT } from "@/data/skdr";
import { POPULASI_DESA, referensiDesaLengkap } from "@/data/populasi-desa";

describe("konfigurasi ambang SKDR (SSOT)", () => {
  it("menutupi seluruh penyakit dengan kolom sumber acuan", () => {
    for (const p of PENYAKIT) {
      const a = AMBANG_SKDR[p];
      expect(a).toBeTruthy();
      expect(typeof a.sumber).toBe("string");
      expect(a.sumber.length).toBeGreaterThan(0);
      expect(["tercatat", "perlu verifikasi acuan Dinkes"]).toContain(a.statusSumber);
    }
  });

  it("tidak mengubah angka ambang (regresi terhadap nilai lama)", () => {
    // Nilai ini disalin dari lib/skdr.ts sebelum dipindahkan ke SSOT.
    // Mengubahnya berarti mengubah ambang tanpa persetujuan.
    const sebelum = {
      DBD: {
        kasusMin: 5,
        insidensiMin: 50,
        rasioWaspada: 1.5,
        rasioKLB: 2,
        kematianEskalasi: true,
      },
      Diare: {
        kasusMin: 40,
        insidensiMin: 100,
        rasioWaspada: 1.5,
        rasioKLB: 2,
        kematianEskalasi: false,
      },
      Chikungunya: {
        kasusMin: 3,
        insidensiMin: 15,
        rasioWaspada: 1.5,
        rasioKLB: 2,
        kematianEskalasi: false,
      },
      "Hepatitis A": {
        kasusMin: 3,
        insidensiMin: 15,
        rasioWaspada: 1.5,
        rasioKLB: 2,
        kematianEskalasi: false,
      },
    };
    for (const p of PENYAKIT) {
      const a = AMBANG_SKDR[p];
      const b = sebelum[p];
      expect(a.kasusMin).toBe(b.kasusMin);
      expect(a.insidensiMin).toBe(b.insidensiMin);
      expect(a.rasioWaspada).toBe(b.rasioWaspada);
      expect(a.rasioKLB).toBe(b.rasioKLB);
      expect(a.kematianEskalasi).toBe(b.kematianEskalasi);
    }
  });

  it("AMBANG di lib/skdr adalah objek yang sama (bukan duplikat)", () => {
    expect(AMBANG_DARI_LIB).toBe(AMBANG_SKDR);
  });

  it("tipe Ambang yang diekspor lib/skdr tetap kompatibel", () => {
    const a: AmbangDariLib = AMBANG_DARI_LIB.DBD;
    expect(a.insidensiMin).toBe(50);
  });
});

describe("syarat kasus minimum lapis harian (SSOT terpisah dari kasusMin SKDR)", () => {
  it("nilainya tetap 10 (Sinyal) dan 3 (Waspada)", () => {
    // 10 adalah syarat yang sejak awal tampil di situs ("kasus 7 hari >= 2x
    // baseline dan >= 10 kasus"). 3 dipilih supaya 1-2 kasus pada desa
    // kecil terhitung sebagai kenaikan.
    expect(KASUS_MIN_SINYAL_HARIAN).toBe(10);
    expect(KASUS_MIN_WASPADA_HARIAN).toBe(3);
  });

  it("tidak menyentuh kasusMin mingguan per penyakit", () => {
    // Kalau salah satu ikut berubah, angka "Mgg KLB" pada rekap SKDR ikut
    // bergeser tanpa disadari.
    expect(AMBANG_SKDR.DBD.kasusMin).toBe(5);
    expect(AMBANG_SKDR.Diare.kasusMin).toBe(40);
    expect(AMBANG_SKDR.Chikungunya.kasusMin).toBe(3);
    expect(AMBANG_SKDR["Hepatitis A"].kasusMin).toBe(3);
  });

  it("ATURAN_HARIAN menyiarkan angka yang sama dan menyebut alasannya", () => {
    expect(ATURAN_HARIAN.kasusMinSinyal).toBe(KASUS_MIN_SINYAL_HARIAN);
    expect(ATURAN_HARIAN.kasusMinWaspada).toBe(KASUS_MIN_WASPADA_HARIAN);
    expect(ATURAN_HARIAN.alasan).toContain("alert");
    expect(ATURAN_HARIAN.alasan.toLowerCase()).toContain("alert fatigue");
  });
});

/**
 * Butir 3 lanjutan: status "perlu verifikasi acuan Dinkes" dibiarkan apa
 * adanya. Angka ambang TIDAK boleh diubah diam-diam, dan halaman (UI +
 * Konsep) harus menyebut bahwa ambang dan penduduk desa adalah nilai
 * simulasi yang ditetapkan bersama Dinkes saat implementasi.
 */
describe("verifikasi acuan Dinkes: status dibiarkan, angka tidak bergerak", () => {
  it("seluruh penyakit masih berstatus perlu verifikasi acuan Dinkes", () => {
    for (const p of PENYAKIT) {
      expect(AMBANG_SKDR[p].statusSumber).toBe("perlu verifikasi acuan Dinkes");
    }
  });

  it("tidak ada penyakit yang diam-diam ditandai 'tercatat'", () => {
    // Menandai "tercatat" tanpa bukti acuan sama saja dengan mengarang
    // sumber, jadi harus gagal kalau ditambahkan tanpa keputusan Dinkes.
    const tercatat = PENYAKIT.filter((p) => AMBANG_SKDR[p].statusSumber === "tercatat");
    expect(tercatat).toEqual([]);
  });
  it("kolom sumber jujur: menyebut pedoman, bukan keputusan Dinkes", () => {
    // Kolom sumber menunjuk dokumen acuan (pedoman nasional), bukan
    // mengklaim angka ini sudah disahkan Dinkes. Kalau suatu saat diubah
    // menjadi keputusan Dinkes, statusSumber juga harus ikut berubah.
    for (const p of PENYAKIT) {
      const s = AMBANG_SKDR[p].sumber;
      expect(s.length).toBeGreaterThan(0);
      expect(s.toLowerCase()).not.toContain("disahkan");
      expect(s.toLowerCase()).not.toContain("ditetapkan");
    }
  });

  it("penduduk desa tetap kosong: tidak ada angka yang dikarang", () => {
    for (const p of POPULASI_DESA) {
      expect(p.penduduk).toBeNull();
      expect(p.sumber).toBeNull();
      expect(p.tahun).toBeNull();
    }
    expect(referensiDesaLengkap()).toBe(false);
  });

  it("halaman menyebut ambang dan penduduk desa sebagai nilai simulasi Dinkes", () => {
    // Membaca berkas sumber halaman, bukan merender: tujuannya menjaga
    // kejujuran teks, bukan tampilan.
    for (const f of HALAMAN_AMBANG) {
      const isi = readFileSync(f, "utf8");
      expect(isi).toContain("perlu verifikasi acuan Dinkes");
      expect(isi).toMatch(/bersama Dinkes/i);
      expect(isi).toMatch(/ simulasi/i);
    }
  });
});

/**
 * Butir 3 lanjutan: status "perlu verifikasi acuan Dinkes" dibiarkan apa
 * adanya. Angka ambang TIDAK boleh diubah diam-diam, dan halaman (UI +
 * Konsep) harus menyebut bahwa ambang dan penduduk desa adalah nilai
 * simulasi yang ditetapkan bersama Dinkes saat implementasi.
 */
describe("verifikasi acuan Dinkes: status dibiarkan, angka tidak bergerak", () => {
  it("seluruh penyakit masih berstatus perlu verifikasi acuan Dinkes", () => {
    for (const p of PENYAKIT) {
      expect(AMBANG_SKDR[p].statusSumber).toBe("perlu verifikasi acuan Dinkes");
    }
  });

  it("tidak ada penyakit yang diam-diam ditandai 'tercatat'", () => {
    // Menandai "tercatat" tanpa bukti acuan sama saja dengan mengarang
    // sumber, jadi harus gagal kalau ditambahkan tanpa keputusan Dinkes.
    const tercatat = PENYAKIT.filter((p) => AMBANG_SKDR[p].statusSumber === "tercatat");
    expect(tercatat).toEqual([]);
  });

  it("penduduk desa tetap kosong: tidak ada angka yang dikarang", () => {
    for (const p of POPULASI_DESA) {
      expect(p.penduduk).toBeNull();
      expect(p.sumber).toBeNull();
      expect(p.tahun).toBeNull();
    }
    expect(referensiDesaLengkap()).toBe(false);
  });

  it("halaman menyebut ambang dan penduduk desa sebagai nilai simulasi Dinkes", () => {
    // Membaca berkas sumber halaman, bukan merender: tujuannya menjaga
    // kejujuran teks, bukan tampilan.
    for (const f of HALAMAN_AMBANG) {
      const isi = readFileSync(f, "utf8");
      expect(isi).toContain("perlu verifikasi acuan Dinkes");
      expect(isi).toMatch(/bersama Dinkes/i);
      expect(isi).toMatch(/ simulasi/i);
    }
  });
});
