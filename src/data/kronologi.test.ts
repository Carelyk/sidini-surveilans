import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BATAS_KEDALUWARSA_JAM,
  MINGGU_DATA_TERAKHIR,
  PEMBARUAN_TERAKHIR,
  TAHUN_DATA_TERAKHIR,
  TANGGAL_PEMBARUAN,
  dataKedaluwarsa,
  formatTanggal,
  jamSejakPembaruan,
  labelSnapshot,
  mingguISO,
  usiaData,
  waktuPembaruan,
} from "@/data/kronologi";

/**
 * Butir 7 dan 9 dari audit: satu sumber untuk waktu pembaruan data, dan
 * preset "seminggu terakhir" yang mengikuti tanggal data terakhir (bukan
 * minggu 46-52 yang ditulis mati di FilterSKDRBar).
 */
describe("waktu pembaruan data", () => {
  it("waktu pembaruan ditampilkan lengkap dengan zona WIB", () => {
    // Selalu memuat tahun, tanggal, jam, dan WIB. Tidak boleh ada "hari ini".
    const teks = waktuPembaruan();
    expect(teks).toMatch(/WIB$/);
    expect(teks).toMatch(/\d{2}\.\d{2}/);
    expect(teks).toContain("2026");
    expect(teks).not.toMatch(/hari ini/i);
  });

  it("kedaluwarsa mengikuti batas jam yang dikonfigurasi", () => {
    const dasar = new Date(PEMBARUAN_TERAKHIR).getTime();
    const jam = (n: number) => new Date(dasar + n * 3_600_000);

    expect(jamSejakPembaruan(jam(0))).toBe(0);
    expect(dataKedaluwarsa(jam(BATAS_KEDALUWARSA_JAM - 1))).toBe(false);
    expect(dataKedaluwarsa(jam(BATAS_KEDALUWARSA_JAM))).toBe(true);
    expect(dataKedaluwarsa(jam(BATAS_KEDALUWARSA_JAM + 1))).toBe(true);
  });

  it("usia data ditulis dalam bahasa manusia", () => {
    const dasar = new Date(PEMBARUAN_TERAKHIR).getTime();
    const jam = (n: number) => new Date(dasar + n * 3_600_000);
    expect(usiaData(jam(0.5))).toBe("baru saja");
    expect(usiaData(jam(3))).toBe("3 jam lalu");
    expect(usiaData(jam(50))).toBe("2 hari lalu");
  });
});

describe("nomor minggu ISO", () => {
  it("mengikuti aturan ISO-8601 (minggu 1 memuat 4 Januari)", () => {
    expect(mingguISO("2026-01-01")).toBe(1); // Kamis 1 Januari 2026
    expect(mingguISO("2026-09-25")).toBe(39); // Jumat minggu ke-39
    // 2026 punya 53 minggu ISO karena 1 Januari 2026 jatuh hari Kamis.
    expect(mingguISO("2026-12-28")).toBe(53); // Senin minggu ke-53
    expect(mingguISO("2026-12-31")).toBe(53);
  });

  it("minggu 1 bisa jatuh di tahun sebelumnya", () => {
    // 1 Januari 2021 = Jumat, jadi minggu 1 Iso 2021 mulai 28 Des 2020.
    expect(mingguISO("2021-01-01")).toBe(53);
    expect(mingguISO("2021-01-04")).toBe(1);
  });
});

describe("preset mingguan diturunkan dari tanggal data", () => {
  it("minggu data terakhir adalah minggu 39 tahun 2026", () => {
    expect(MINGGU_DATA_TERAKHIR).toBe(39);
    expect(TAHUN_DATA_TERAKHIR).toBe(2026);
  });
});

/**
 * Butir 5 lanjutan: penanda "kedaluwarsa" pada demo statis diganti label
 * snapshot. Demo ini tidak punya unggah otomatis, jadi penanda basi akan
 * menyala terus tanpa ada yang bisa diperbaiki.
 */
describe("label snapshot menggantikan penanda kedaluwarsa", () => {
  it("label menyebut tanggal snapshot secara langsung", () => {
    expect(labelSnapshot()).toBe("snapshot simulasi per 25 Sep 2026");
  });

  it("label tidak berubah seiring waktu berjalan", () => {
    // Ini inti perlakuannya: kalau label ikut jam sistem, bunyinya berubah
    // setiap hari tanpa ada data yang diperbarui.
    expect(labelSnapshot()).toBe(labelSnapshot());
  });

  it("label memuat tanggal data, bukan tanggal hari ini", () => {
    expect(labelSnapshot()).toContain(formatTanggal(TANGGAL_PEMBARUAN));
  });

  it("banner tidak lagi menampilkan peringatan kedaluwarsa", () => {
    // Komentar berkas diabaikan: yang diperiksa hanya bagian JSX yang
    // benar-benar dirender ke pembaca.
    const banner = jsx(readFileSync("src/components/BannerDemo.tsx", "utf8"));
    expect(banner).not.toMatch(/jam sejak pembaruan/i);
    expect(banner).not.toMatch(/Data lebih dari/);
    // Teks banner satu baris memakai tanggal snapshot dari sumber waktu data.
    expect(banner).toContain("labelSnapshot");
    expect(banner).toMatch(/bukan laporan kasus sebenarnya/);
    expect(banner).toMatch(/tanpa login/);
    expect(banner).toContain("Selengkapnya");
    // Tombol tutup dengan nama yang bisa dibaca alat bantu.
    expect(banner).toContain('aria-label="Tutup pemberitahuan demo"');
    // Kalimat panjang lama tidak boleh kembali.
    expect(banner).not.toMatch(/Tidak ada pembaruan setelah tanggal itu/);
  });

  it("label DEMO di header wajib ada (dipakai di layout akar untuk semua halaman)", () => {
    const nav = jsx(readFileSync("src/components/Navbar.tsx", "utf8")).replace(/\s+/g, " ");
    expect(nav).toContain("> DEMO <");
    expect(nav).toContain('title="Data simulasi, bukan laporan kasus sebenarnya"');
    // Label DEMO ditaruh di komponen header yang dirender layout akar, jadi
    // selalu tampil di semua halaman tanpa perlu diulang per halaman.
    const akar = readFileSync("src/routes/__root.tsx", "utf8");
    expect(akar).toContain("Navbar");
    expect(akar).toMatch(/<Navbar \/>/);
  });

  it("banner demo bisa ditutup; status tersimpan dan banner tidak dirender saat dimuat ulang", () => {
    const banner = jsx(readFileSync("src/components/BannerDemo.tsx", "utf8"));
    // Ada tombol tutup, dan status dibaca dari sessionStorage lewat lib.
    expect(banner).toMatch(/tutup/);
    expect(banner).toContain("bacaStatusTertutup");
    expect(banner).toContain("tulisStatusTertutup");
    expect(banner).toContain("haruskahTampil");
  });

  it("penanda snapshot tetap tampil di banner dan di Konsep", () => {
    const banner = jsx(readFileSync("src/components/BannerDemo.tsx", "utf8"));
    // labelSnapshot() di banner menghasilkan "snapshot simulasi per 25 Sep
    // 2026"; dipakai via fungsi sumber, bukan ditulis mati.
    expect(banner).toContain("labelSnapshot");
    expect(labelSnapshot()).toBe("snapshot simulasi per 25 Sep 2026");
    const konsep = teks(readFileSync("src/routes/tentang.tsx", "utf8"));
    expect(konsep).toMatch(/snapshot simulasi per 25 Sep 2026/);
  });

  it("halaman Konsep menyebut sifat snapshot dan tidak ada unggah", () => {
    const isi = teks(readFileSync("src/routes/tentang.tsx", "utf8"));
    expect(isi).toMatch(/snapshot simulasi per 25 Sep 2026/);
    expect(isi).toMatch(/tidak punya jadwal unggah/);
  });

  it("fungsi kedaluwarsa tetap ada untuk dipakai saat ada sumber data nyata", () => {
    // Dihapus dari UI, bukan dihapus dari kode: begitu prototipe
    // dihubungkan ke unggah berkala, penanda ini diperlukan lagi.
    expect(typeof dataKedaluwarsa).toBe("function");
    expect(BATAS_KEDALUWARSA_JAM).toBe(24);
  });
});

/** Buang komentar berkas, sisakan kode yang benar-benar dirender. */
function jsx(isi: string): string {
  return isi.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/** Rapatkan baris yang terpotong oleh prettier agar bisa dicocokkan utuh. */
function teks(isi: string): string {
  return isi.replace(/\s+/g, " ");
}
