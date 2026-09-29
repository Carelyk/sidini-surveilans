/**
 * Pembatas laju permintaan in-memory.
 *
 * Fungsi server yang memanggil API berbayar (Groq) memakai kunci dari server,
 * jadi tanpa pembatas siapa pun yang membuka halaman bisa menghabiskan kuota
 * akun. Pembatas di sini sadar akan batasnya:
 *
 *  - Status disimpan di memori proses. Pada isolate atau beberapa worker hal
 *    ini tidak dibagi, sehingga batasnya hanya berlaku per instance. Untuk
 *    perlindungan lintas instance dibutuhkan penyimpanan bersama (misalnya
 *    KV atau Redis), dan itu di luar cakupan prototipe.
 *  - Server dimatikan, semua catatan hilang. Tidak ada yang dipersistensi.
 *
 * Antarmuka dibuat murni (jam disuntikkan) supaya bisa diuji tanpa menunggu
 * waktu nyata.
 */

export interface OpsiLimitasi {
  /** jumlah permintaan yang diizinkan dalam satu jendela */
  maks: number;
  /** panjang jendela dalam milidetik */
  jendelaMs: number;
  /** jumlah kunci berbeda yang disimpan sebelum catatan lama dibuang */
  maksKunci?: number;
}

export interface PutusanLimit {
  diizinkan: boolean;
  /** sisa kuota dalam jendela berjalan */
  tersisa: number;
  /** detik sampai permintaan berikutnya diizinkan; 0 bila diizinkan */
  cobaLagiDetik: number;
}

export interface PembatasLaju {
  periksa(kunci: string, sekarang?: number): PutusanLimit;
  /** jumlah kunci yang sedang diingat */
  ukuran(): number;
  /** membuang semua catatan; dipakai pada pengujian */
  bersihkan(): void;
}

export function buatPembatasLaju({
  maks,
  jendelaMs,
  maksKunci = 5000,
}: OpsiLimitasi): PembatasLaju {
  // kunci -> daftar stempel waktu (ms) permintaan dalam jendela berjalan
  const catatan = new Map<string, number[]>();
  // kapan penyapuan terakhir; sapuan cukup sekali per jendela agar tidak
  // menyapu seluruh peta pada setiap permintaan.
  let terakhirSapu = 0;

  const buang = (sekarang: number) => {
    for (const [kunci, waktu] of catatan) {
      const segar = waktu.filter((t) => t > sekarang - jendelaMs);
      if (segar.length === 0) catatan.delete(kunci);
      else catatan.set(kunci, segar);
    }
    // Batas keras jumlah kunci, supaya memori tidak tumbuh tanpa batas saat
    // banyak alamat IP berbeda meng/datang.
    while (catatan.size > maksKunci) {
      const kuno = catatan.keys().next();
      if (kuno.done) break;
      catatan.delete(kuno.value);
    }
    terakhirSapu = sekarang;
  };

  return {
    periksa(kunci, sekarang = Date.now()) {
      const awal = catatan.get(kunci) ?? [];
      const segar = awal.filter((t) => t > sekarang - jendelaMs);
      if (segar.length >= maks) {
        catatan.set(kunci, segar);
        const cobaLagiMs = Math.max(0, segar[0]! + jendelaMs - sekarang);
        return {
          diizinkan: false,
          tersisa: 0,
          cobaLagiDetik: Math.ceil(cobaLagiMs / 1000),
        };
      }
      segar.push(sekarang);
      catatan.set(kunci, segar);
      if (catatan.size > maksKunci || sekarang - terakhirSapu > jendelaMs) buang(sekarang);
      return { diizinkan: true, tersisa: maks - segar.length, cobaLagiDetik: 0 };
    },
    ukuran: () => catatan.size,
    bersihkan: () => {
      catatan.clear();
      terakhirSapu = 0;
    },
  };
}
