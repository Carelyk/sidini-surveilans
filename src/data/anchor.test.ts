import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ANGKA_ACUAN } from "@/data/skdr";

/**
 * Tugas 2: perkiraan acuan 90.337 kasus/tahun harus tercatat lengkap dengan
 * sumber dan tahunnya, dan tidak boleh tampil sebagai angka resmi.
 *
 * Latar: kolom sumber pada kode sebelumnya menulis "2016, terverifikasi".
 * Angka 90.337 dan 3.466 tidak pernah dicocokkan ulang dengan berkas
 * sumbernya, dan berkas itu tidak ada di repository. Yang bisa dilacak
 * hanya nama dataset dan penerbitnya. Karena itu labelnya diturunkan
 * menjadi "perkiraan acuan", dan test ini menjaga agar tidak naik lagi
 * tanpa bukti.
 */
describe("perkiraan acuan Dinkes Jawa Barat", () => {
  it("angka 90.337 kasus/tahun dicatat bersama tahun dan penerbitnya", () => {
    expect(ANGKA_ACUAN.diareKabupatenBandung).toBe(90337);
    expect(ANGKA_ACUAN.tahun).toBe(2016);
    // Sumber menyebut penerbit dan domain tempat dataset terdaftar, supaya
    // jejaknya bisa dicari orang lain tanpa bergantung pada kode ini.
    expect(ANGKA_ACUAN.sumber).toContain("Dinas Kesehatan Jawa Barat");
    expect(ANGKA_ACUAN.sumber).toContain("data.go.id");
  });

  it("statusnya perkiraan acuan, bukan angka resmi", () => {
    // Dua penjaga: nilai status, dan penanda bahwa angkanya belum
    // diverifikasi ulang. Kalau suatu saat angka resmi benar-benar diperoleh
    // dari Dinkes, keduanya harus ikut diubah di commit yang sama.
    expect(ANGKA_ACUAN.status).toBe("perkiraan acuan");
    expect(ANGKA_ACUAN.nilaiBelumDiverifikasiUlang).toBe(true);
  });

  it("kolom sumber tidak pernah mengklaim sudah terverifikasi", () => {
    // Ringkasan kolom sumber adalah tempat yang paling mudah bocor kembali
    // menjadi klaim resmi, jadi diperiksa terpisah.
    expect(ANGKA_ACUAN.sumber).not.toMatch(/terverifikasi/i);
    expect(ANGKA_ACUAN.sumber).not.toMatch(/resmi/i);
  });

  it("halaman Konsep menyebut angkanya sebagai perkiraan acuan", () => {
    // Angka boleh tampil, tapi harus tampil bersama statusnya. Komentar
    // berkas diabaikan: yang diperiksa hanya teks yang dirender ke pembaca.
    const isi = readFileSync("src/routes/tentang.tsx", "utf8").replace(/\s+/g, " ");
    expect(isi).toContain("90.337");
    expect(isi).toMatch(/perkiraan acuan/i);
    expect(isi).not.toMatch(/jangkar resmi/i);
  });
});
