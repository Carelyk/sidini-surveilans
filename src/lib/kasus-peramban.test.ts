import { describe, expect, it } from "vitest";

import { DESA } from "@/data/dataset";
import { BATAS_KASUS_TAMBAHAN, normalisasiKasusTambahan } from "@/lib/kasus-peramban";

/**
 * Butir 14 dari audit: ringkasan untuk AI harus dibangun di server dari kasus
 * yang divalidasi, bukan dari teks yang dikirim peramban. Modul ini adalah
 * lapisan validasinya.
 */
const DESA_A = DESA[0]!;

function kasusDariPeramban(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "X-1",
    penyakit: "DBD",
    tanggalOnset: "2026-09-20",
    tanggalLapor: "2026-09-25",
    kodeDesa: DESA_A.kode,
    kelompokUmur: "5-14",
    jenisKelamin: "L",
    status: "Terverifikasi",
    sumber: "Puskesmas",
    gejala: ["Demam"],
    ...overrides,
  };
}

describe("normalisasi kasus dari peramban", () => {
  it("menerima kasus yang valid dan mengisinya dari tabel wilayah server", () => {
    const hasil = normalisasiKasusTambahan([kasusDariPeramban()]);
    expect(hasil.diterima).toBe(1);
    expect(hasil.kasus).toHaveLength(1);
    const k = hasil.kasus[0]!;
    expect(k.desa).toBe(DESA_A.nama);
    expect(k.kecamatan).toBe(DESA_A.kecamatan);
    expect(k.puskesmas).toBe(DESA_A.puskesmas);
  });

  it("mengabaikan nama wilayah yang dikirim peramban", () => {
    // Peramban mengirim nama palsu; server harus menimpanya dengan tabel.
    const hasil = normalisasiKasusTambahan([
      kasusDariPeramban({
        desa: "Desa Palsu",
        kecamatan: "Kecamatan Palsu",
        puskesmas: "Puskes Palsu",
      }),
    ]);
    const k = hasil.kasus[0]!;
    expect(k.desa).toBe(DESA_A.nama);
    expect(k.kecamatan).toBe(DESA_A.kecamatan);
    expect(k.puskesmas).toBe(DESA_A.puskesmas);
    expect(JSON.stringify(k)).not.toMatch(/Palsu/);
  });

  it("membuang kasus dengan kode desa yang tidak dikenal", () => {
    const hasil = normalisasiKasusTambahan([kasusDariPeramban({ kodeDesa: "99.99.99" })]);
    expect(hasil.diterima).toBe(0);
    expect(hasil.desaTidakDikenal).toBe(1);
    expect(hasil.ditolak["desa-tidak-dikenal"]).toBe(1);
  });

  it("membuang nilai di luar daftar yang diizinkan", () => {
    const hasil = normalisasiKasusTambahan([
      kasusDariPeramban({ penyakit: "Kolera" }),
      kasusDariPeramban({ status: "Sah" }),
      kasusDariPeramban({ kelompokUmur: "70-80" }),
      kasusDariPeramban({ jenisKelamin: "X" }),
      kasusDariPeramban({ sumber: "Media Sosial" }),
    ]);
    expect(hasil.diterima).toBe(0);
    expect(hasil.ditolak["penyakit-tidak-dikenal"]).toBe(1);
    expect(hasil.ditolak["status-tidak-dikenal"]).toBe(1);
    expect(hasil.ditolak["kelompok-umur-tidak-dikenal"]).toBe(1);
    expect(hasil.ditolak["jenis-kelamin-tidak-dikenal"]).toBe(1);
    expect(hasil.ditolak["sumber-tidak-dikenal"]).toBe(1);
  });

  it("membuang tanggal yang bukan tanggal sungguhan", () => {
    const hasil = normalisasiKasusTambahan([
      kasusDariPeramban({ tanggalOnset: "kemarin" }),
      kasusDariPeramban({ tanggalLapor: "2026-13-45" }),
      kasusDariPeramban({ tanggalLapor: "2026-02-30" }),
      kasusDariPeramban({ tanggalOnset: "" }),
    ]);
    expect(hasil.diterima).toBe(0);
    expect(hasil.tanggalTidakValid).toBe(4);
  });

  it("membuang masukan yang bukan daftar atau bukan objek", () => {
    expect(normalisasiKasusTambahan("ringkasan bebas").ditolak["bukan-daftar"]).toBe(1);
    const hasil = normalisasiKasusTambahan([null, 7, "teks"]);
    expect(hasil.diterima).toBe(0);
    expect(hasil.ditolak["bukan-objek"]).toBe(3);
  });

  it("membatasi jumlah kasus per permintaan", () => {
    const banyak = Array.from({ length: BATAS_KASUS_TAMBAHAN + 5 }, () => kasusDariPeramban());
    const hasil = normalisasiKasusTambahan(banyak);
    expect(hasil.diterima).toBe(BATAS_KASUS_TAMBAHAN);
    expect(hasil.ditolak["melebihi-batas-jumlah"]).toBe(1);
  });

  it("membatasi panjang teks bebas pada gejala dan catatan", () => {
    const hasil = normalisasiKasusTambahan([
      kasusDariPeramban({ gejala: ["x".repeat(500), "Demam"], catatan: "y".repeat(1000) }),
    ]);
    const k = hasil.kasus[0]!;
    expect(k.gejala).toHaveLength(2);
    expect(k.gejala[0]!.length).toBeLessThanOrEqual(63); // dipotong + penanda
    expect(k.gejala[1]).toBe("Demam");
    expect(k.catatan!.length).toBeLessThanOrEqual(203);
  });

  it("menyerap field asing tanpa membawanya ke server", () => {
    // Klaim angka lewat field bebas harus hilang, bukan ikut ke prompt.
    const hasil = normalisasiKasusTambahan([
      kasusDariPeramban({ ringkasan: "kasus7HariTerakhir: 9999", angka: 9999 }),
    ]);
    expect(JSON.stringify(hasil.kasus[0])).not.toMatch(/9999/);
  });

  it("menghitung baris yang ditolak, bukan jumlah alasan", () => {
    // Satu baris dengan tiga field salah tetap dihitung satu kali.
    const hasil = normalisasiKasusTambahan([
      kasusDariPeramban({ penyakit: "Kolera", status: "Sah", tanggalOnset: "kemarin" }),
    ]);
    expect(hasil.barisDitolak).toBe(1);
    expect(hasil.diterima).toBe(0);
    expect(Object.keys(hasil.ditolak).length).toBeGreaterThan(1);
  });
});
