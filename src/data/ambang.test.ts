import { describe, expect, it } from "vitest";

import {
  AMBANG_SKDR,
  ATURAN_HARIAN,
  KASUS_MIN_SINYAL_HARIAN,
  KASUS_MIN_WASPADA_HARIAN,
} from "@/data/ambang";
import { AMBANG as AMBANG_DARI_LIB, type Ambang as AmbangDariLib } from "@/lib/skdr";
import { PENYAKIT } from "@/data/skdr";

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
