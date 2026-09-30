import { describe, expect, it } from "vitest";

import {
  KUNCI_BANNER_DEMO,
  bacaStatusTertutup,
  haruskahTampil,
  tulisStatusTertutup,
  type PenyimpananSesi,
} from "@/lib/banner-demo-session";

/**
 * Test status tutup banner demo.
 *
 * Latar: tombol tutup banner menyimpan status di sessionStorage. Test ini
 * memastikan tiga hal:
 *  1) setelah ditutup kunci tersimpan, dan saat "komponen dimuat ulang"
 *     (baca ulang storage dengan memori yang sama) statusnya tertutup,
 *  2) bila storage gagal dibaca atau ditulis, banner tetap tampil,
 *  3) keputusan render menunggu status terbaca (tidak ada kedipan hidrasi).
 */

/** Storage tiruan dengan memori sederhana. */
function penyimpananMemori() {
  const isi = new Map<string, string>();
  const penyimpanan: PenyimpananSesi = {
    getItem: (kunci) => isi.get(kunci) ?? null,
    setItem: (kunci, nilai) => {
      isi.set(kunci, nilai);
    },
  };
  return { penyimpanan, isi };
}

describe("status tutup banner demo", () => {
  it("sebelum ditutup, banner tetap dirender", () => {
    expect(bacaStatusTertutup(null)).toBe(false);
    expect(bacaStatusTertutup(undefined)).toBe(false);
    expect(haruskahTampil(true, false)).toBe(true);
  });

  it("setelah ditutup, kunci tersimpan dan banner tidak dirender saat komponen dimuat ulang", () => {
    const { penyimpanan, isi } = penyimpananMemori();

    // Muat pertama: belum tertutup, banner tampil.
    expect(bacaStatusTertutup(penyimpanan)).toBe(false);
    expect(haruskahTampil(true, bacaStatusTertutup(penyimpanan))).toBe(true);

    // Pengguna menutup banner.
    tulisStatusTertutup(penyimpanan);
    expect(isi.get(KUNCI_BANNER_DEMO)).toBe("1");

    // "Komponen dimuat ulang": baca storage yang sama seolah baru mount.
    expect(bacaStatusTertutup(penyimpanan)).toBe(true);
    expect(haruskahTampil(true, bacaStatusTertutup(penyimpanan))).toBe(false);
  });

  it("sebelum status terbaca, banner tidak dirender (tanpa kedipan hidrasi)", () => {
    // HaruskahTampil(false, ...) = belum terbaca -> tidak ada banner.
    expect(haruskahTampil(false, false)).toBe(false);
    expect(haruskahTampil(false, true)).toBe(false);
  });

  it("bila storage gagal dibaca, banner tetap dirender", () => {
    const gagal: PenyimpananSesi = {
      getItem: () => {
        throw new Error("storage diblokir");
      },
      setItem: () => {
        throw new Error("storage diblokir");
      },
    };
    expect(bacaStatusTertutup(gagal)).toBe(false);
    expect(haruskahTampil(true, bacaStatusTertutup(gagal))).toBe(true);
    expect(() => tulisStatusTertutup(gagal)).not.toThrow();
  });

  it("bila storage gagal ditulis, pemanggilan tidak melempar", () => {
    const gagal: PenyimpananSesi = {
      getItem: () => null,
      setItem: () => {
        throw new Error("kuota penuh");
      },
    };
    expect(() => tulisStatusTertutup(gagal)).not.toThrow();
  });
});
