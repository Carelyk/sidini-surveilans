import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Butir 5b: berkas sumber bersih dari karakter korup.
 *
 * Latar: penulisan berkas panjang di proyek ini beberapa kali menyisipkan
 * karakter CJK atau potongan kata asing di tengah kalimat Indonesia. Contoh
 * yang ditemukan di src/: "sumber danCCNAMA tahun datanya", "riset/pemSDM",
 * dan "Deaths suffers the same problem far worse". Semuanya menutupi
 * maksud komentar yang seharusnya menjelaskan keputusan teknis.
 *
 * Test ini memindai seluruh src/ setiap kali test jalan. Tujuannya bukan
 * menilai gaya bahasa, hanya memastikan tidak ada karakter dari blok CJK,
 * kana, hangul, atau byte pengganti di kode dan teks antarmuka.
 *
 * Kata asing Latin ("CCNAMA") tidak bisa ditangkap pola ini. Untuk itu
 * ada test regresi di bawah yang mengunci frasa yang sudah dibersihkan.
 */

/** Folder yang wajib bersih. */
const AKAR = "src";

/** Hanya berkas teks sumber yang dipindai. */
const EKSTENSI = new Set([".ts", ".tsx"]);

/** Nama berkas yang sengaja tidak dipindai. */
const KECUALI = new Set(["routeTree.gen.ts"]);

/**
 * Karakter korup yang dicari: U+FFFD (byte pengganti), tanda baca CJK,
 * kana, han, hangul, dan bentuk penuh ASCII.
 */
const KORUP =
  /[\u{FFFD}\u{3000}-\u{303F}\u{3040}-\u{30FF}\u{4E00}-\u{9FFF}\u{AC00}-\u{D7AF}\u{FF00}-\u{FFEF}]/u;

/** Frasa asing yang pernah muncul dan sudah dibersihkan. */
const FRASA_LAMA = [
  { berkas: "src/data/populasi-desa.ts", frasa: "CCNAMA" },
  { berkas: "src/data/populasi-desa.ts", frasa: "ResidentsOfDesa" },
  { berkas: "src/data/wilayah.ts", frasa: "riset/pemSDM" },
  { berkas: "src/lib/skdr.ts", frasa: "insidensi weekly" },
  { berkas: "src/lib/skdr.ts", frasa: "readership Dinkes" },
  { berkas: "src/data/skdr.ts", frasa: "Deaths suffers the same problem" },
];

function berkasSumber(dir: string): string[] {
  const keluar: string[] = [];
  for (const nama of readdirSync(dir)) {
    const penuh = join(dir, nama);
    if (statSync(penuh).isDirectory()) {
      keluar.push(...berkasSumber(penuh));
    } else if (EKSTENSI.has(nama.slice(nama.lastIndexOf("."))) && !KECUALI.has(nama)) {
      keluar.push(penuh.replace(/\\/g, "/"));
    }
  }
  return keluar;
}

describe("kebersihan teks repositori", () => {
  const berkas = berkasSumber(AKAR);

  it("memindai berkas sumber yang cukup banyak", () => {
    // Kalau pola folder berubah dan pemindaian kembali kosong, test lain
    // akan lulus tanpa memeriksa apa pun. Penjaga ini membuat itu gagal.
    expect(berkas.length).toBeGreaterThan(30);
  });

  it("tidak ada karakter CJK, kana, hangul, atau byte pengganti di src/", () => {
    const barisKorup: string[] = [];
    for (const b of berkas) {
      const baris = readFileSync(b, "utf8").split(/\r?\n/);
      for (let i = 0; i < baris.length; i++) {
        const isi = baris[i] ?? "";
        if (KORUP.test(isi)) barisKorup.push(`${b}:${i + 1}: ${isi.trim()}`);
      }
    }
    expect(barisKorup).toEqual([]);
  });

  it("frasa asing yang sudah dibersihkan tidak muncul lagi", () => {
    const tersisa: string[] = [];
    for (const target of FRASA_LAMA) {
      if (readFileSync(target.berkas, "utf8").includes(target.frasa)) {
        tersisa.push(`${target.berkas} masih memuat "${target.frasa}"`);
      }
    }
    expect(tersisa).toEqual([]);
  });
});
