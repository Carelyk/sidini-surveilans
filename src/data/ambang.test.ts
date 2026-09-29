import { describe, expect, it } from "vitest";

import { AMBANG_SKDR } from "@/data/ambang";
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
