import { describe, expect, it } from "vitest";

import { buatPembatasLaju } from "@/lib/rate-limit";

/**
 * Butir 14 dari audit: fungsi server yang memanggil Groq memakai kunci API di
 * server, jadi tanpa pembatas laju siapa pun yang membuka halaman bisa
 * menghabiskan kuota akun.
 */
describe("pembatas laju", () => {
  it("mengizinkan sampai batas, lalu menolak", () => {
    const p = buatPembatasLaju({ maks: 3, jendelaMs: 60_000 });
    const t0 = 1_000_000;

    expect(p.periksa("ip-a", t0).diizinkan).toBe(true);
    expect(p.periksa("ip-a", t0).diizinkan).toBe(true);
    const ketiga = p.periksa("ip-a", t0);
    expect(ketiga.diizinkan).toBe(true);
    expect(ketiga.tersisa).toBe(0);

    const keempat = p.periksa("ip-a", t0);
    expect(keempat.diizinkan).toBe(false);
    expect(keempat.tersisa).toBe(0);
  });

  it("memberi tahu berapa detik harus menunggu", () => {
    const p = buatPembatasLaju({ maks: 1, jendelaMs: 60_000 });
    const t0 = 0;
    p.periksa("ip-b", t0);

    // 20 detik kemudian: jendela kedua belum masuk, jadi harus tunggu 40 detik.
    const tolak = p.periksa("ip-b", t0 + 20_000);
    expect(tolak.diizinkan).toBe(false);
    expect(tolak.cobaLagiDetik).toBe(40);
  });

  it("memisahkan kuota antar kunci (per alamat IP)", () => {
    const p = buatPembatasLaju({ maks: 1, jendelaMs: 60_000 });
    const t0 = 5_000_000;
    expect(p.periksa("ip-c", t0).diizinkan).toBe(true);
    expect(p.periksa("ip-d", t0).diizinkan).toBe(true);
    expect(p.periksa("ip-c", t0).diizinkan).toBe(false);
  });

  it("jendela bergulir: hanya stempel yang sudah keluar jendela yang dihitung", () => {
    const p = buatPembatasLaju({ maks: 2, jendelaMs: 10_000 });
    const t0 = 0;
    expect(p.periksa("ip-e", t0).diizinkan).toBe(true);
    expect(p.periksa("ip-e", t0 + 1_000).diizinkan).toBe(true);
    expect(p.periksa("ip-e", t0 + 2_000).diizinkan).toBe(false);

    // Di t0+10.001 stempel t0 sudah keluar jendela (10.001 - 10.000 = 1),
    // jadi satu kuota terbebas sementara dua stempel lain masih dihitung.
    expect(p.periksa("ip-e", t0 + 10_001).diizinkan).toBe(true);
    expect(p.periksa("ip-e", t0 + 10_002).diizinkan).toBe(false);

    // Stempel 10.001 masih di dalam jendela (10.001 > 2.002), jadi hanya satu
    // kuota yang terbebas pada t0+12.001, bukan dua.
    expect(p.periksa("ip-e", t0 + 12_001).diizinkan).toBe(true);
    expect(p.periksa("ip-e", t0 + 12_002).diizinkan).toBe(false);

    // Setelah semua stempel lama keluar dari jendela, kuota penuh lagi.
    expect(p.periksa("ip-e", t0 + 32_001).diizinkan).toBe(true);
    expect(p.periksa("ip-e", t0 + 32_002).diizinkan).toBe(true);
    expect(p.periksa("ip-e", t0 + 32_003).diizinkan).toBe(false);
  });

  it("kunci yang sudah lewat jendela tidak lagi dihitung di memori", () => {
    const p = buatPembatasLaju({ maks: 1, jendelaMs: 1_000 });
    p.periksa("ip-f", 0);
    expect(p.ukuran()).toBe(1);
    p.periksa("ip-g", 100_000);
    // Kunci baru membuat penyaringan berjalan, kunci lama yang kosong dibuang.
    expect(p.ukuran()).toBe(1);
  });

  it("membatasi jumlah kunci agar memori tidak tumbuh tanpa batas", () => {
    const p = buatPembatasLaju({ maks: 5, jendelaMs: 60_000, maksKunci: 10 });
    for (let i = 0; i < 40; i++) p.periksa(`ip-${i}`, 0);
    expect(p.ukuran()).toBeLessThanOrEqual(10);
  });
});
