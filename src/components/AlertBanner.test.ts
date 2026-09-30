import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Penjaga perampingan kartu alert (AlertBanner.tsx).
 *
 * Latar: kartu alert awalnya selalu menampilkan kotak "Insidensi/100k"
 * (berisi "penduduk belum tersedia" bila penduduk desa null) dan menyalin
 * kembali kalimat "aturan insidensi tidak dinilai" ke deskripsi tiap kartu.
 * Setelah perampingan:
 *
 *  1. kotak insidensi hanya dirender bila pemicu.insidensi !== null,
 *  2. bila penduduk desa belum tersedia, satu catatan tampil di atas daftar
 *     alert dan kalimat serupa tidak diulang di deskripsi kartu,
 *  3. grid kotak memakai 3 kolom desktop (kasus, baseline, rasio) saat
 *     insidensi disembunyikan, dan 4 kolom bila insidensi tersedia,
 *  4. daftar "Penerima notifikasi yang direncanakan" bisa dilipat dan
 *     tertutup secara default.
 *
 * Test membaca kode sumber, bukan mengevaluasi JSX (proyek ini menguji
 * logika murni tanpa DOM). Komentar diabaikan supaya yang diperiksa hanya
 * kode yang benar-benar dirender.
 */
describe("kartu alert setelah perampingan", () => {
  it("kotak insidensi hanya dirender bila nilai insidensi ada", () => {
    const kartu = jsx(readFileSync("src/components/AlertBanner.tsx", "utf8"));
    // Kotak diberi syarat di sisi JSX, bukan ditampilkan tanpa syarat.
    expect(kartu).toContain("pemicu.insidensi !== null && (");
    expect(kartu).toContain('label="Insidensi/100k"');
  });

  it("ada catatan di atas daftar saat penduduk desa belum tersedia", () => {
    const kartu = jsx(readFileSync("src/components/AlertBanner.tsx", "utf8"));
    expect(kartu).toContain("adaInsidensiKosong");
    expect(kartu).toContain("Insidensi per 100.000 tidak dinilai: penduduk desa belum tersedia.");
  });

  it("deskripsi kartu memakai konstanta yang sama saat menghapus pengulangan", () => {
    const kartu = jsx(readFileSync("src/components/AlertBanner.tsx", "utf8"));
    const analitik = readFileSync("src/lib/analitik.ts", "utf8");
    // Deskripsi kartu memanggil deskripsiKartu yang mengganti konstanta itu.
    expect(kartu).toContain("{deskripsiKartu(pemicu)}");
    expect(kartu).toContain("CATATAN_INSIDENSI_TIDAK_DINILAI");
    // Konstanta diekspor dan dipakai untuk membentuk catatan alasan.
    expect(analitik).toContain("export const CATATAN_INSIDENSI_TIDAK_DINILAI");
    expect(analitik).toContain("CATATAN_INSIDENSI_TIDAK_DINILAI");
  });

  it("grid kotak memakai 3 kolom desktop saat insidensi disembunyikan", () => {
    const kartu = jsx(readFileSync("src/components/AlertBanner.tsx", "utf8"));
    expect(kartu).toContain('pemicu.insidensi === null ? "sm:grid-cols-3" : "sm:grid-cols-4"');
  });

  it("daftar penerima notifikasi bisa dilipat dan tertutup secara default", () => {
    const kartu = jsx(readFileSync("src/components/AlertBanner.tsx", "utf8")).replace(/\s+/g, " ");
    // <details> tanpa atribut open = tertutup secara default.
    expect(kartu).toMatch(/<details className/);
    expect(kartu).toMatch(/>\s*Penerima notifikasi \(rencana, tidak dikirim\)\s*<\/summary>/);
    expect(kartu).not.toMatch(/<details[^>]* open=/);
  });
});

/** Buang komentar berkas dan baris komentar, sisakan kode yang dirender. */
function jsx(isi: string): string {
  return isi.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}
