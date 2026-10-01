import { describe, expect, it } from "vitest";

import { DESA } from "@/data/dataset";
import {
  POPULASI_DESA,
  jumlahPendudukDesa,
  pendudukDesa,
  referensiDesaLengkap,
  validasiReferensiDesa,
  type EntriPopulasiDesa,
} from "@/data/populasi-desa";
import { KECAMATAN } from "@/data/wilayah";

/**
 * Aturan yang diuji di sini berasal langsung dari permintaan:
 * "jumlah penduduk desa dalam satu kecamatan tidak boleh melebihi penduduk
 * kecamatan", "bila penduduk desa tidak tersedia jangan hitung insidensi",
 * dan tabel harus bisa diisi 23 desa tanpa mengubah kode.
 */
describe("tabel referensi penduduk desa", () => {
  it("mencakup seluruh desa di dataset, tanpa ada yang terlewat", () => {
    expect(POPULASI_DESA).toHaveLength(DESA.length);
    const kodeTabel = new Set(POPULASI_DESA.map((p) => p.kodeDesa));
    for (const d of DESA) {
      expect(kodeTabel.has(d.kode)).toBe(true);
    }
  });

  it("tabel referensi penduduk desa terisi (alokasi proporsional) dengan sumber yang tercatat", () => {
    for (const p of POPULASI_DESA) {
      expect(p.penduduk).not.toBeNull();
      expect(typeof p.penduduk).toBe("number");
      expect(p.penduduk).toBeGreaterThan(0);
      expect(p.sumber).not.toBeNull();
      expect(p.tahun).toBe(2025);
    }
    expect(referensiDesaLengkap()).toBe(true);
  });

  it("kode kecamatan pada entri cocok dengan wilayah.ts", () => {
    const namaKec = new Map(KECAMATAN.map((k) => [k.kode, k.nama]));
    for (const d of DESA) {
      const entri = pendudukDesa(d.kode);
      expect(entri).not.toBeNull();
      expect(namaKec.get(entri!.kodeKecamatan)).toBe(d.kecamatan);
    }
  });

  it("penduduk desa terisi dan fungsi kembaliannya sesuai, kode tidak dikenal tetap null", () => {
    expect(jumlahPendudukDesa(DESA[0]!.kode)).not.toBeNull();
    expect(jumlahPendudukDesa(DESA[0]!.kode)).toBeGreaterThan(0);
    expect(jumlahPendudukDesa("kode-tidak-ada")).toBeNull();
  });

  it("validasi lolos pada kondisi sekarang tanpa peringatan belum tersedia", () => {
    const { galat, peringatan } = validasiReferensiDesa();
    expect(galat).toEqual([]);
    const belumTersedia = peringatan.filter((p) => /belum tersedia/i.test(p));
    expect(belumTersedia).toHaveLength(0);
    const kurangSumber = peringatan.filter((p) => /sumber\/tahun belum dicatat/.test(p));
    expect(kurangSumber).toHaveLength(0);
  });
});

describe("aturan isi tabel (data sementara, tabel produksi tidak diubah)", () => {
  const cimenyan = KECAMATAN.find((k) => k.nama === "Cimenyan")!;

  function isiCimenyan(perDesa: number): EntriPopulasiDesa[] {
    return POPULASI_DESA.map((p) =>
      p.kodeKecamatan === cimenyan.kode
        ? { ...p, penduduk: perDesa, sumber: "Uji", tahun: 2025 }
        : p,
    );
  }

  it("menolak jumlah desa yang melebihi penduduk kecamatan", () => {
    const isi = isiCimenyan(60000);
    // 3 desa x 60.000 = 180.000 > 113.982 (penduduk Cimenyan).
    expect(isiCimenyanTotal(isi)).toBeGreaterThan(cimenyan.penduduk);

    const { galat } = validasiReferensiDesa(isi);
    expect(galat.some((g) => /melebihi penduduk kecamatan/.test(g))).toBe(true);
  });

  it("menerima jumlah desa yang tidak melebihi penduduk kecamatan", () => {
    const isi = isiCimenyan(37994);
    expect(isiCimenyanTotal(isi)).toBeLessThanOrEqual(cimenyan.penduduk);

    const { galat } = validasiReferensiDesa(isi);
    expect(galat).toEqual([]);
  });

  it("menolak jumlah entri yang tidak lengkap terhadap dataset", () => {
    const { galat } = validasiReferensiDesa(POPULASI_DESA.slice(0, 5));
    expect(galat.some((g) => /harus sama dengan jumlah desa/.test(g))).toBe(true);
  });

  it("menolak kode desa yang tidak dikenal", () => {
    const isi: EntriPopulasiDesa[] = [
      {
        kodeDesa: "9999999999",
        namaDesa: "Desa Hantu",
        kodeKecamatan: cimenyan.kode,
        penduduk: 10,
        sumber: "Uji",
        tahun: 2025,
      },
      ...POPULASI_DESA,
    ];
    const { galat } = validasiReferensiDesa(isi);
    expect(galat.some((g) => /tidak ada di dataset/.test(g))).toBe(true);
  });

  it("peringatan, bukan galat, bila penduduk terisi tapi sumber belum dicatat", () => {
    const isi = POPULASI_DESA.map((p) => ({ ...p, penduduk: 1000, sumber: null, tahun: null }));
    const { galat, peringatan } = validasiReferensiDesa(isi);
    // 23 x 1.000 = 23.000, jauh di bawah jumlah kecamatan mana pun.
    expect(galat).toEqual([]);
    expect(peringatan.some((p) => /sumber\/tahun belum dicatat/.test(p))).toBe(true);
  });

  function isiCimenyanTotal(isi: EntriPopulasiDesa[]): number {
    return isi
      .filter((p) => p.kodeKecamatan === cimenyan.kode && p.penduduk !== null)
      .reduce((a, p) => a + (p.penduduk ?? 0), 0);
  }
});
