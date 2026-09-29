import { describe, expect, it } from "vitest";

import { bandingkanPenyakit, MINGGU_SKDR_TERAKHIR } from "@/lib/skdr";
import { AMBANG } from "@/data/ambang";
import { KECAMATAN, TOTAL_PENDUDUK } from "@/data/wilayah";
import { SEMU_KEJADIAN, SKDR, TARGET_TAHUNAN } from "@/data/skdr";

/** Target tahunan diare pada versi sebelumnya, dipakai sebagai penjaga regresi. */
const TARGET_DIARE_LAMA = 95000;

/**
 * Butir 4 lanjutan: diare 2026 berstatus KLB di 39 dari 39 minggu.
 *
 * Penyebabnya bukan ambang, tapi cara simulasinya: target tahunan diare
 * (95.000) dikonsentrasikan di empat kecamatan "rawan" dengan pengali 2,4x.
 * Akibatnya insidensi mingguan di sana selalu di atas ambang 100/100.000,
 * sehingga ambang berhenti menjadi penanda apa pun.
 *
 * Perbaikannya dua, dan TIDAK menyentuh angka ambang:
 *   1) pengali kecamatan rawan hanya berlaku untuk penyakit yang ditularkan
 *      lewat vektor (PENGALI_RAWAN), karena diare ditularkan lewat air;
 *   2) level simulasi diare diturunkan, dan satu outbreak yang disengaja
 *      ditambahkan supaya KLB tetap terlihat bekerja.
 */
describe("simulasi diare: ambang bermakna, bukan setiap minggu", () => {
  const diare2026 = bandingkanPenyakit(2026, 1, MINGGU_SKDR_TERAKHIR).find(
    (p) => p.penyakit === "Diare",
  )!;

  it("minggu KLB diare sedikit, bukan seluruh rentang", () => {
    expect(diare2026.mingguKLB).toBeGreaterThan(0);
    expect(diare2026.mingguKLB).toBeLessThanOrEqual(MINGGU_SKDR_TERAKHIR / 4);
  });

  it("latar tenang: minggu Waspada juga sedikit", () => {
    expect(diare2026.mingguWaspada).toBeLessThanOrEqual(MINGGU_SKDR_TERAKHIR / 4);
  });

  it("KLB diare berasal dari outbreak yang dirancang, bukan dari kebetulan", () => {
    const outbreak = SEMU_KEJADIAN.filter((s) => s.penyakit === "Diare" && s.tahun === 2026);
    expect(outbreak.length).toBe(1);
    const s = outbreak[0]!;
    // Outbreak-nya berada di dalam rentang yang ditampilkan; kalau tidak, KLB
    // yang tampil di layar tidak punya penjelasan.
    expect(s.mingguDari).toBeGreaterThanOrEqual(1);
    expect(s.mingguSampai).toBeLessThanOrEqual(MINGGU_SKDR_TERAKHIR);
    expect(s.pengali).toBeGreaterThan(1);
  });

  it("penjaga regresi: level simulasi diare diturunkan, penyakit lain tidak", () => {
    // Kalau pengali rawan atau target tahunan dikembalikan ke nilai lama,
    // test "minggu KLB sedikit" di atas harus gagal sendiri.
    expect(TARGET_TAHUNAN.Diare).toBeLessThan(TARGET_DIARE_LAMA);
    expect(TARGET_TAHUNAN.DBD).toBe(4900);
    expect(TARGET_TAHUNAN.Chikungunya).toBe(620);
    expect(TARGET_TAHUNAN["Hepatitis A"]).toBe(310);
  });

  it("ambang diare tidak diubah sama sekali", () => {
    expect(AMBANG.Diare.insidensiMin).toBe(100);
    expect(AMBANG.Diare.rasioKLB).toBe(2);
    expect(AMBANG.Diare.rasioWaspada).toBe(1.5);
    expect(AMBANG.Diare.kasusMin).toBe(40);
  });

  it("insidensi mingguan rata-rata jauh di bawah ambang insidensi", () => {
    // Kalau level simulasi naik lagi, rata-rata ini menembus ambang dan KLB
    // kembali terjadi hampir setiap minggu.
    const total = SKDR.filter(
      (r) =>
        r.tahun === 2026 &&
        r.penyakit === "Diare" &&
        r.minggu >= 1 &&
        r.minggu <= MINGGU_SKDR_TERAKHIR,
    ).reduce((a, r) => a + r.penderita, 0);
    const perKecMinggu = total / (KECAMATAN.length * MINGGU_SKDR_TERAKHIR);
    const insidensi = (perKecMinggu / (TOTAL_PENDUDUK / KECAMATAN.length)) * 100000;
    expect(insidensi).toBeLessThan(AMBANG.Diare.insidensiMin * 0.6);
  });
});
