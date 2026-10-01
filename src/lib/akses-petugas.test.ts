import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DATASET_AWAL, KELOMPOK_UMUR, NAMA_KELOMPOK_UMUR, type KelompokUmur } from "@/data/dataset";
import { normalisasiKasusTambahan } from "@/lib/kasus-peramban";
import { perUmurPenyakit } from "@/lib/analitik";

/**
 * Pengelompokan umur yang diminta: bayi & balita di bawah 5 tahun, anak,
 * remaja sampai 18 tahun, dewasa, dan lanjut usia.
 *
 * Dua hal yang diuji di sini bukan sekadar tampilan. Pertama, batas kelompok
 * tidak boleh tumpang tindih maupun bolong, karena kalau 18 tahun masuk dua
 * kelompok sekaligus maka jumlah kasus per kelompok tidak akan sama dengan
 * jumlah kasus seluruhnya. Kedua, daftar yang dipakai server untuk memeriksa
 * kasus tambahan harus diturunkan dari tabel yang sama, bukan ditulis ulang,
 * supaya kasus yang ditolak dan yang diterima tidak berbeda untuk kelompok umur
 * yang sama.
 */
describe("kelompok umur kasus", () => {
  /** Batas atas tiap kelompok dalam tahun; 60+ berarti tanpa batas atas. */
  function batasAtas(k: KelompokUmur): number {
    if (k === "60+") return Number.POSITIVE_INFINITY;
    return Number(k.split("-")[1]);
  }

  /** Batas bawah tiap kelompok dalam tahun. */
  function batasBawah(k: KelompokUmur): number {
    return Number(k.replace("+", "").split("-")[0]);
  }

  it("lima kelompok, berurutan dari yang paling muda", () => {
    expect(KELOMPOK_UMUR).toEqual(["0-4", "5-9", "10-18", "19-59", "60+"]);
  });

  it("tidak ada celah dan tidak ada tumpang tindih antar kelompok", () => {
    for (let i = 1; i < KELOMPOK_UMUR.length; i++) {
      const sebelum = KELOMPOK_UMUR[i - 1]!;
      const sekarang = KELOMPOK_UMUR[i]!;
      // Kelompok berikutnya mulai tepat satu tahun setelah batas atas sebelumnya.
      expect(batasBawah(sekarang)).toBe(batasAtas(sebelum) + 1);
      expect(batasAtas(sekarang)).toBeGreaterThan(batasBawah(sekarang));
    }
  });

  it("usia 18 tahun masuk remaja, bukan dewasa", () => {
    const menampung = (umur: number) =>
      KELOMPOK_UMUR.filter((k) => batasBawah(k) <= umur && umur <= batasAtas(k));
    expect(menampung(18)).toEqual(["10-18"]);
    expect(menampung(19)).toEqual(["19-59"]);
    expect(menampung(4)).toEqual(["0-4"]);
    expect(menampung(5)).toEqual(["5-9"]);
    expect(menampung(60)).toEqual(["60+"]);
  });

  it("setiap kelompok punya nama tampilan", () => {
    expect(Object.keys(NAMA_KELOMPOK_UMUR).sort()).toEqual([...KELOMPOK_UMUR].sort());
    expect(NAMA_KELOMPOK_UMUR["0-4"]).toBe("Bayi & balita");
    expect(NAMA_KELOMPOK_UMUR["60+"]).toBe("Lansia");
  });

  it("dataset hanya memakai kelompok umur yang ada di tabel", () => {
    for (const k of DATASET_AWAL) {
      expect(KELOMPOK_UMUR).toContain(k.kelompokUmur);
    }
  });

  it("jumlah kasus per kelompok tetap sama dengan jumlah kasus seluruhnya", () => {
    const titik = perUmurPenyakit(DATASET_AWAL);
    const total = titik.reduce((acc, t) => acc + t.jumlah, 0);
    expect(total).toBe(DATASET_AWAL.length);
    // Nama tampilan ikut disertakan, supaya grafik dashboard tidak memakai
    // kode angka mentah sebagai label sumbu.
    expect(titik.map((t) => t.nama)).toEqual(KELOMPOK_UMUR.map((u) => NAMA_KELOMPOK_UMUR[u]));
  });

  it("pemeriksaan server menerima kelompok baru dan menolak kelompok lama", () => {
    const dasar = {
      penyakit: "DBD" as const,
      tanggalOnset: "2026-09-25",
      tanggalLapor: "2026-09-25",
      puskesmas: "Puskesmas Cimenyan",
      kodeDesa: DATASET_AWAL[0]!.kodeDesa,
      desa: DATASET_AWAL[0]!.desa,
      kecamatan: DATASET_AWAL[0]!.kecamatan,
      jenisKelamin: "L" as const,
      status: "Terverifikasi" as const,
      sumber: "Warga" as const,
      gejala: ["Demam"],
    };
    for (const u of KELOMPOK_UMUR) {
      const hasil = normalisasiKasusTambahan([{ ...dasar, id: "BB-99999", kelompokUmur: u }]);
      expect(hasil.kasus).toHaveLength(1);
      expect(hasil.kasus[0]!.kelompokUmur).toBe(u);
    }
    // "5-14" dan "15-44" kelompok lama: kalau masih diterima berarti daftar
    // di server ditulis ulang terpisah dari tabelnya.
    for (const lama of ["5-14", "15-44", "45-64", "65+"] as const) {
      const hasil = normalisasiKasusTambahan([
        { ...dasar, id: "BB-99999", kelompokUmur: lama as KelompokUmur },
      ]);
      expect(hasil.kasus).toHaveLength(0);
      expect(hasil.barisDitolak).toBe(1);
    }
  });
});

/**
 * Gerbang akses dan konfirmasi aksi.
 *
 * Diuji dengan membaca sumber, bukan merender: yang dijaga di sini adalah
 * keputusan yang sudah tercatat, yaitu halaman mana yang dibungkus login,
 * bahwa aksi triase tidak lagi langsung mengubah status tanpa konfirmasi, dan
 * bahwa pesan setelah laporan warga tidak lagi berbunyi seperti catatan
 * internal peramban.
 */
describe("akses petugas dan konfirmasi aksi", () => {
  const sumber = (berkas: string) => jsx(readFileSync(berkas, "utf8"));

  it("hanya input puskesmas dan verifikasi yang memakai gerbang login", () => {
    expect(sumber("src/routes/puskesmas.tsx")).toContain("<PintuPetugas");
    expect(sumber("src/routes/verifikasi.tsx")).toContain("<PintuPetugas");
    // Halaman agregat tetap terbuka: isinya bukan data per kasus.
    for (const halaman of ["src/routes/index.tsx", "src/routes/peta.tsx", "src/routes/lapor.tsx"]) {
      expect(sumber(halaman)).not.toContain("<PintuPetugas");
    }
  });

  it("navbar tetap menampilkan semua tautan untuk semua orang", () => {
    const nav = sumber("src/components/Navbar.tsx");
    for (const label of [
      "Dashboard",
      "Peta & Alert",
      "Lapor Warga",
      "Input Puskesmas",
      "Verifikasi",
    ]) {
      expect(nav).toContain(label);
    }
    // Tidak ada penyembunyian tautan berdasarkan sesi.
    expect(nav).not.toContain("sesi");
    expect(nav).not.toContain("useSesiPetugas");
  });

  it("aksinya baru mengubah status setelah petugas mengonfirmasi dialog", () => {
    const isi = sumber("src/routes/verifikasi.tsx");
    // Tombol triase hanya menyimpan pilihan dan membuka dialog.
    expect(isi).toContain('mintaKonfirmasi("sahkan", k)');
    expect(isi).toContain('mintaKonfirmasi("tolak", k)');
    expect(isi).toContain('mintaKonfirmasi("investigasi", k)');
    // Penulisan status hanya ada di dalam fungsi yang dipanggil dialog.
    const penulisan = isi.match(/ubahStatus\([^)]*\)/g) ?? [];
    expect(penulisan).toHaveLength(3);
    const mulai = isi.indexOf("const jalankan");
    const badanJalankan = isi.slice(mulai, mulai + 900);
    for (const p of penulisan) expect(badanJalankan).toContain(p);
  });

  it("konfirmasi menjelaskan akibat tiap aksi, dan penolakan tidak bisa dibatalkan", () => {
    const isi = sumber("src/routes/verifikasi.tsx");
    expect(isi).toContain("AKSI_DIALOG");
    expect(isi).toMatch(/tidak dapat dibatalkan/);
    expect(isi).toMatch(/BELUM dihitung sebagai kasus/);
    expect(isi).toMatch(/langsung masuk ke angka dashboard/);
  });

  it("pesan laporan warga memakai terima kasih dan menunggu verifikasi", () => {
    const isi = sumber("src/routes/lapor.tsx");
    expect(isi).toContain("Terima kasih, laporan Anda sudah kami terima.");
    expect(isi).toContain("menunggu verifikasi petugas puskesmas");
    // Kalimat lama berbunyi seperti catatan internal dan tidak boleh kembali.
    expect(isi).not.toContain("Tidak ada pesan dikirim ke petugas");
    expect(isi).not.toContain("Laporan tersimpan di peramban ini dan masuk antrean verifikasi");
  });

  it("input puskesmas memakai tombol Kirim dan popup hasil", () => {
    const isi = sumber("src/routes/puskesmas.tsx");
    expect(isi).toContain("Kasus berhasil dikirim ke dashboard.");
    expect(isi).toContain("<DialogKonfirmasi");
    expect(isi).not.toContain("Kirim ke dashboard sekarang");
    expect(isi).toContain("tampilkanBatal={false}");
  });

  it("popup yang hanya memberitahukan hasil tidak menampilkan tombol Batal", () => {
    const isi = sumber("src/components/DialogKonfirmasi.tsx");
    expect(isi).toContain("tampilkanBatal");
    expect(isi).toContain("{tampilkanBatal && (");
  });

  it("halaman petugas tidak lagi mengklaim terbuka tanpa autentikasi", () => {
    expect(sumber("src/routes/verifikasi.tsx")).not.toMatch(/terbuka tanpa autentikasi/);
    expect(sumber("src/routes/puskesmas.tsx")).not.toMatch(/Prototipe tanpa autentikasi/);
    // Klaim ini harus tetap jujur: login contoh bukan autentikasi. Berkas
    // sesi dibaca tanpa membuang komentar karena penjelasannya ada di sana.
    expect(readFileSync("src/lib/sesi-petugas.ts", "utf8")).toMatch(/BUKAN autentikasi/);
    expect(sumber("src/components/PintuPetugas.tsx")).toMatch(/diperiksa di peramban/);
  });
});

/** Buang komentar berkas, sisakan kode yang benar-benar dirender. */
function jsx(isi: string): string {
  return isi.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}
