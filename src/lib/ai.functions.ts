import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

import { DATASET_AWAL } from "@/data/dataset";
import { normalisasiKasusTambahan } from "@/lib/kasus-peramban";
import { buatPembatasLaju, type PembatasLaju } from "@/lib/rate-limit";
import { ringkasanUntukAI } from "@/lib/analitik";
import { ATURAN_INPUT_TAK_TEPERCAYA, blokTeks } from "@/lib/teks-tak-terpercaya";

/** Batas panjang pertanyaan. Dikunci di server, tidak bisa diatur peramban. */
const MAKS_PERTANYAAN = 500;
const MAKS_PERTANYAAN_KESEHATAN = 1000;

/**
 * Skema masukan analisis naratif.
 *
 * Perhatikan apa yang TIDAK ada di sini: tidak ada `ringkasan`. Sebelumnya
 * peramban mengirim ringkasan siap pakai sebagai teks, lalu server menempelkan
 * teks itu ke prompt apa adanya. Dua akibatnya: angka di prompt tidak bisa
 * diverifikasi server, dan teks peramban punya jalur langsung ke prompt.
 *
 * Sekarang peramban hanya mengirim daftar kasus (baris demi baris), dan server
 * yang membangun ringkasan memakai fungsi analitik yang sama dengan dashboard.
 */
const skema = z.object({
  kasusTambahan: z.array(z.unknown()).max(3000).optional().default([]),
  pertanyaan: z.string().max(MAKS_PERTANYAAN).optional(),
  mode: z.enum(["warga", "petugas"]).optional(),
});

/** Batas panjang pertanyaan kesehatan. Lebih pendek daripada pertanyaan analisis. */
const skemaTanya = z.object({
  pertanyaan: z.string().min(3).max(MAKS_PERTANYAAN_KESEHATAN),
});

/** Mode pembaca: "petugas" = istilah epidemiologi, "warga" = bahasa sehari-hari. */
export type ModeAnalisis = "warga" | "petugas";

/**
 * Pembatas laju permintaan, per pemohon.
 *
 * Groq dipanggil dengan kunci yang tersimpan di server, jadi setiap permintaan
 * menghabiskan kuota akun. Tanpa pembatas, satu peramban bisa sengaja memanggil
 * endpoint ini berulang kali.
 *
 * BATASAN YANG PERLU DIKETAHUI: catatan pembatas disimpan di memori proses. Pada
 * platform dengan lebih dari satu instance (V8 isolate, beberapa worker), kuota
 * dihitung terpisah per instance sehingga batas efektifnya lebih longgar dari
 * angka di sini. Pembatasan lintas instance butuh penyimpanan bersama
 * (KV atau Redis) yang belum ada di prototipe ini.
 */
const BATAS = {
  analisis: { maks: 6, jendelaMs: 60_000 },
  tanya: { maks: 10, jendelaMs: 60_000 },
} as const;

const pembatas: Record<keyof typeof BATAS, PembatasLaju> = {
  analisis: buatPembatasLaju(BATAS.analisis),
  tanya: buatPembatasLaju(BATAS.tanya),
};

/**
 * Kunci pembatas laju: alamat IP pemohon.
 *
 * Header x-forwarded-for bisa dipalsukan bila prototipe dijalankan tanpa
 * reverse proxy tepercaya. Pada deployment nyata, nilai ini harus berasal dari
 * proxy yang membersihkan header tersebut lebih dulu.
 */
function kunciPemohon(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? "tanpa-ip";
  } catch {
    // Tidak ada konteks permintaan, misalnya saat fungsi dipanggil langsung
    // pada pengujian.
    return "tanpa-ip";
  }
}

function pesanKuat(grup: keyof typeof BATAS, cobaLagiDetik: number): string {
  return (
    `Terlalu banyak permintaan. Batas ${BATAS[grup].maks} permintaan per menit per alamat. ` +
    `Coba lagi dalam ${cobaLagiDetik} detik.`
  );
}

/** Ambil kunci API dan model, atau pesan galat bila kunci tidak ada. */
function konfigurasiGroq(): { apiKey: string; model: string } | { galat: string } {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    return {
      galat: "Kunci GROQ_API_KEY belum tersedia di server. Simpan kunci API Groq terlebih dahulu.",
    };
  }
  return { apiKey, model: process.env["GROQ_MODEL"] || "qwen/qwen3.8-27b" };
}

/** Terjemahkan status HTTP Groq menjadi pesan yang bisa dibaca pengguna. */
async function pesanGroq(res: Response, model: string): Promise<string> {
  const detail = await res.text();
  let pesan = `Groq menolak permintaan (HTTP ${res.status}).`;
  if (res.status === 401) pesan = "Kunci API Groq tidak valid atau sudah dicabut.";
  if (res.status === 429) pesan = "Batas permintaan Groq tercapai. Coba lagi beberapa saat.";
  if (res.status === 404) pesan = `Model "${model}" tidak tersedia di akun Groq ini.`;
  return `${pesan} Rincian: ${detail.slice(0, 300)}`;
}

const SYSTEM = `Anda adalah epidemiolog lapangan senior yang mendampingi Dinas Kesehatan Kabupaten Bandung, Jawa Barat (Indonesia).
Tugas Anda: membaca ringkasan data surveilans sintetis dan menulis ANALISIS NARATIF dalam Bahasa Indonesia yang tajam, ringkas, dan langsung dapat dipakai untuk mengambil keputusan lapangan.

Format jawaban (gunakan markdown sederhana dengan judul tebal):
**1. Situasi Terkini**: 2-3 kalimat. Bila ada pertanyaan pengguna, bagian ini dibuka lebih dulu dengan jawaban langsung atas pertanyaan itu, baru dilanjut rangkuman kondisi.
**2. Sinyal Peringatan Dini**: desa/kecamatan yang melewati ambang, sebutkan angka (kasus 7 hari, baseline, rasio, insidensi/100.000).
**3. Interpretasi Epidemiologis**: kemungkinan penyebab, kelompok umur berisiko, pola penyakit dominan.
**4. Rekomendasi Aksi 72 Jam**: daftar bernomor, prioritas per desa (PE, fogging/larvasidasi, edukasi, logistik), sebut siapa pelaksananya.
**5. Catatan Kualitas Data**: keterlambatan lapor, laporan warga belum terverifikasi, keterbatasan.

Format markdown (WAJIB dipatuhi):
- Setiap bagian dipisahkan oleh SATU baris kosong.
- Judul bagian ditulis pada barisnya sendiri, tanpa teks tambahan setelahnya.
- Untuk daftar, gunakan penanda eksplisit satu item per baris: bernomor "1. " atau berpoin "- ".
  Jangan menulis item daftar sebagai baris teks biasa.
- Jawab hanya dalam format tersebut, tanpa pengantar atau penutup tambahan.

Aturan: jangan menyebut identitas individu; ingatkan bahwa data pelapor warga bersifat sensitif (UU PDP) bila relevan; jangan mengarang angka di luar data; tulis angka persis seperti di ringkasan, JANGAN membulatkan ke atas (contoh: 6,56x ditulis "6,56×" atau "lebih dari 6 kali lipat", bukan "7 kali lipat"); maksimal ~450 kata.`;

/**
 * Prompt untuk pembaca awam (warga/kader). Sengaja memakai kalimat pendek dan
 * analogi sehari-hari. Istilah teknis hanya boleh muncul sekali di dalam kurung
 * supaya pembaca tetap bisa mencocokkannya dengan istilah resmi petugas.
 */
const SYSTEM_WARGA = `Anda adalah petugas kesehatan yang menjelaskan kondisi kepada MASYARAKAT AWAM di Kabupaten Bandung, Jawa Barat (Indonesia), bukan kepada para ahli.

Tugas Anda: membaca ringkasan data surveilans sintetis dan menjelaskannya dalam Bahasa Indonesia yang SEDERHANA, hangat, dan mudah dipahami orang yang belum pernah belajar epidemiologi.

Format jawaban (gunakan markdown sederhana dengan judul tebal):
**1. Kabarnya Apa**: 2-3 kalimat singkat tentang kondisi saat ini. Bila ada pertanyaan pengguna, bagian ini dibuka lebih dulu dengan jawaban langsung atas pertanyaan itu, baru dilanjut penjelasan kondisi.
**2. Apa yang Perlu Diwaspadai**: sebut desa yang perlu diwaspadai dan angka dengan perbandingan sehari-hari (contoh: "tiga kali lipat dari minggu biasa").
**3. Kenapa Bisa Terjadi**: sebab-sebab yang masuk akal, ditulis sebagai penjelasan, bukan teori.
**4. Apa yang Bisa Dilakukan Mulai Sekarang**: daftar bernomor, tindakan nyata yang mudah dipahami.
**5. Catatan Penting**: keterbatasan data dan pengingat privasi.

Aturan bahasa (WAJIB dipatuhi):
- Jangan memakai istilah ini secara langsung: baseline, insidensi, prevalensi, surveilans, epidemiologi, KLB, rasio, insidensi per 100.000, case fatality rate.
- Jika istilah resmi memang perlu, tulis bentuk sehari-hari dulu lalu nama resminya dalam kurung, maksimal SEKALI di seluruh jawaban. Contoh benar: "status bahaya atau KLB (Kejadian Luar Biasa)".
- Angka besaran selalu diterjemahkan menjadi perbandingan. Contoh benar: "sekitar 25 orang dari setiap 100.000 penduduk".
- Gunakan kata ganti "Anda" atau "kita". Hindari kalimat pasif panjang dan singkatan tanpa penjelasan.
- Jangan meminta, membaca, atau menyebut nama, alamat, atau data pribadi siapa pun. Ingatkan bahwa laporan warga bersifat rahasia (UU PDP) bila relevan.
- Jangan mengarang angka di luar data yang diberikan.
- Tulis angka persis seperti di ringkasan, JANGAN membulatkan ke atas (contoh: 6,56x ditulis "6,56×" atau "lebih dari 6 kali lipat", bukan "7 kali lipat").
- Maksimal ~400 kata.

Format markdown (WAJIB dipatuhi):
- Setiap bagian dipisahkan oleh SATU baris kosong.
- Judul bagian ditulis pada barisnya sendiri, tanpa teks tambahan setelahnya.
- Untuk daftar, gunakan penanda eksplisit satu item per baris: bernomor "1. " atau berpoin "- ".
  Jangan menulis item daftar sebagai baris teks biasa.
- Jawab hanya dalam format tersebut, tanpa pengantar atau penutup tambahan.`;

/**
 * Prompt untuk pertanyaan orang tentang kesehatan orang terdekat, misalnya
 * "anak saya demam tiga hari".
 *
 * Sengaja prompt terpisah, bukan nilai ketiga dari ModeAnalisis. Kalau
 * digabung ke prompt surveilans, pertanyaan tentang satu anak akan dipaksa
 * masuk ke format laporan epidemiologi lima bagian, sehingga jawabannya jadi
 * tidak relevan atau dikarang. Prompt surveilans tidak pernah menerima
 * pertanyaan kesehatan, dan prompt ini tidak memakai angka surveilans sebagai
 * bukti tentang satu orang.
 *
 * Batas yang ditulis ke dalam prompt:
 *   - tidak pernah menyebut diagnosis untuk orang yang bertanya
 *   - tanda bahaya selalu didahulukan
 *   - data epidemiologi hanya latar belakang, tidak pernah bukti soal satu orang
 */
const SYSTEM_TANYA = `Anda adalah petugas kesehatan masyarakat yang menjawab pertanyaan orang biasa tentang kesehatan dirinya atau keluarganya, di Kabupaten Bandung, Jawa Barat (Indonesia).

Pengguna akan menulis keluhan, misalnya "anak saya demam tiga hari", "batuk anak sudah seminggu", "ibu saya pusing dan mual". Tugas Anda BUKAN mendiagnosis, dan BUKAN menulis laporan epidemiologi.

Format jawaban, pakai markdown sederhana dengan judul tebal:
**1. Ringkasan Keluhan**: dua kalimat. Kembalikan keluhan itu dengan kalimat sendiri, supaya pengguna tahu apa yang Anda pahami.
**2. Tanda Bahaya**: daftar tanda yang berarti harus berobat sekarang, bukan menunggu. Tulis "Belum ada" kalau dari keluhan yang diberikan tidak ada. Sebutkan cara memeriksanya sendiri, misalnya "apakah ruamnya memudar saat ditekan".
**3. Kemungkinan Penyebab Umum**: daftar penyebab yang lazim untuk keluhan seperti itu secara umum. Kalimat pertama bagian ini wajib berupa penegas bahwa ini daftar umum, BUKAN diagnosis untuk orang ini.
**4. Yang Bisa Dilakukan di Rumah**: langkah praktis bernomor 1. 2. 3. Sebutkan apa yang jelas boleh dan apa yang tidak boleh.
**5. Ke Mana Harus Pergi**: puskesmas lebih dulu, dan pada kondisi apa harus ke IGD. Sebutkan nama puskesmas hanya bila ada di data.

Aturan keselamatan, WAJIB dipatuhi dan mengungguli semua aturan lain:
- JANGAN PERNAH menyebut diagnosis untuk orang ini. Contoh yang dilarang: "kemungkinan besar anak Anda demam brucellosis", "pasti gastroenteritis", "gejalanya khas tipes". Yang boleh hanya kalimat umum, misalnya "penyebab demam pada anak itu beragam, bisa karena pilek, gastroenteritis, atau infeksi yang lain".
- JANGAN menyuruh menebak diagnosis sendiri. Jangan menyebut nama obat maupun dosis.
- JANGAN meredam, menunda, atau memberi alasan untuk tidak berobat ketika ada tanda bahaya.
- Bila di bagian 2 ada satu saja tanda bahaya, maka kalimat pertama bagian 5 harus persis: "Pergilah ke fasilitas kesehatan sekarang, jangan menunggu besok."
- Gunakan kata "Anda" dan "anak" atau "ibu". Hangat dan tenang. Jangan menakut-nakuti, jangan juga meremehkan.
- Jangan meminta, membaca, atau menyebut nama, alamat, nomor telepon, atau data pribadi siapa pun.
- Jangan mengarang angka, nama puskesmas, atau nama penyakit dari luar data yang diberikan.
- Bila pertanyaannya sebenarnya tentang data epidemiologi, bukan tentang kesehatan seseorang, jawab singkat saja di luar format di atas dan arahkan ke ringkasan surveilans.
- Maksimal 350 kata. Selalu tutup di bagian 5.`;

/**
 * Instruksi penutup yang dikirim ke model.
 *
 * Dua bentuk, dan pemisahan itu disengaja. Tanpa pertanyaan, model diminta
 * menulis laporan sesuai format. Dengan pertanyaan, lima bagian tetap WAJIB
 * ada lengkap; yang berubah hanya bagian 1, karena bagian 1 wajib dibuka dengan
 * jawaban langsung atas pertanyaan itu.
 *
 * Kenapa ini harus dipisah dan bukan satu kalimat untuk dua-duanya: lima bagian
 * beserta batas kata sudah memenuhi kuota jawaban model dengan sendirinya.
 * Kalau pertanyaan diperlakukan sebagai konteks tambahan — seperti versi
 * sebelumnya — laporan tetap keluar utuh, dan pertanyaan pengguna hanya
 * disinggung sekali tanpa pernah dijawab. Gejalanya mudah dikenali: pengguna
 * bertanya "rasio 6 itu apa", keluarnya laporan lima bagian yang angka-enamnya
 * hanya disebut sekilas tanpa dijelaskan artinya.
 *
 * Fungsi ini diekspor supaya kontrak lima bagian bisa diuji tanpa memanggil API.
 */
export function instruksiAnalisis(blokTanya: string): string {
  if (!blokTanya) return "Tulis analisis naratif lengkap sesuai format.";
  return (
    `${blokTanya}\n\n` +
    "Kelima bagian pada format di atas tetap WAJIB ada lengkap, tidak boleh ada yang dilewati. " +
    "Perbedaannya hanya di bagian 1: bagian 1 WAJIB dibuka dengan jawaban langsung atas " +
    "pertanyaan pengguna di atas, 1-2 kalimat. Kalau pengguna memakai istilah yang belum umum, " +
    "seperti rasio, baseline, atau insidensi, jelaskan lebih dulu maksudnya memakai bahasa sesuai " +
    "mode ini. Jawaban itu hanya boleh memakai angka yang benar-benar ada di ringkasan; kalau " +
    "angka yang ditanyakan tidak ada di ringkasan, katakan tidak tersedia. Setelah jawaban itu, " +
    "bagian 1 terus merangkum kondisi saat ini, lalu bagian 2 sampai 5 ditulis persis seperti format."
  );
}

/**
 * Analisis naratif dari data surveilans.
 *
 * Ringkasan TIDAP lagi dikirim dari peramban. Peramban hanya mengirim kasus
 * tambahannya; server menggabungkannya dengan dataset bawaan, menghitung
 * ringkasan dengan `ringkasanUntukAI` (fungsi yang sama dengan dashboard), lalu
 * hanya ringkasan hasil perhitungan itu yang masuk ke prompt. Dengan begitu
 * semua angka di prompt berasal dari server.
 */
export const analisisNaratif = createServerFn({ method: "POST" })
  .validator((d: unknown) => skema.parse(d))
  .handler(async ({ data }) => {
    const limit = pembatas.analisis.periksa(kunciPemohon());
    if (!limit.diizinkan) {
      return { ok: false as const, error: pesanKuat("analisis", limit.cobaLagiDetik) };
    }

    const konf = konfigurasiGroq();
    if ("galat" in konf) return { ok: false as const, error: konf.galat };
    const { apiKey, model } = konf;

    const normalisasi = normalisasiKasusTambahan(data.kasusTambahan);
    const ringkasan = ringkasanUntukAI([...DATASET_AWAL, ...normalisasi.kasus]);
    const json = JSON.stringify(ringkasan, null, 2);

    const sistem = data.mode === "warga" ? SYSTEM_WARGA : SYSTEM;
    const gaya =
      data.mode === "warga"
        ? "bahasa sehari-hari untuk warga awam"
        : "istilah epidemiologi untuk petugas";

    // Pertanyaan pengguna ikut sebagai blok data, bukan instruksi.
    const blokTanya = data.pertanyaan
      ? blokTeks("PERTANYAAN", data.pertanyaan, MAKS_PERTANYAAN)
      : "";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: `${sistem}\n\n${ATURAN_INPUT_TAK_TEPERCAYA}` },
          {
            role: "user",
            content:
              `Ringkasan data surveilans hasil perhitungan server (JSON):\n${json}\n\n` +
              `Gaya bahasa yang diminta: ${gaya}.\n\n` +
              instruksiAnalisis(blokTanya),
          },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: await pesanGroq(res, model) };
    }

    const jsonRes = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const teks = jsonRes.choices?.[0]?.message?.content?.trim();
    if (!teks) {
      return { ok: false as const, error: "Groq mengembalikan jawaban kosong." };
    }

    // Jumlah kasus tambahan yang dipakai server, supaya pengguna tidak
    // mengira semua kasus yang dia kirim ikut dianalisis.
    return {
      ok: true as const,
      teks,
      model: jsonRes.model ?? model,
      kasusDipakai: normalisasi.diterima,
      kasusDitolak: normalisasi.barisDitolak,
    };
  });

/**
 * Menjawab pertanyaan orang tentang kesehatan orang terdekat.
 *
 * Berbeda dari analisisNaratif, fungsi ini tidak menerima ringkasan
 * surveilans sama sekali. Itu disengaja: kalau angka surveilans ikut
 * disertakan, model bisa memakainya sebagai bukti tentang orang yang
 * bertanya, padahal angka per kecamatan tidak punya arti untuk satu
 * individu.
 *
 * Daftar nama puskesmas boleh dikirim sebagai konteks, karena itu data
 * wilayah, bukan data pribadi. Kalau variabelnya tidak diisi, jawaban
 * tetap jalan tanpa nama puskesmas.
 */
export const tanyaKesehatan = createServerFn({ method: "POST" })
  .validator((d: unknown) => skemaTanya.parse(d))
  .handler(async ({ data }) => {
    const limit = pembatas.tanya.periksa(kunciPemohon());
    if (!limit.diizinkan) {
      return { ok: false as const, error: pesanKuat("tanya", limit.cobaLagiDetik) };
    }

    const konf = konfigurasiGroq();
    if ("galat" in konf) return { ok: false as const, error: konf.galat };
    const { apiKey, model } = konf;

    // Daftar puskesmas hanya sebagai nama yang boleh disebut, bukan data
    // statistik. Tidak ada di environment pun jawabannya tetap benar.
    const konteks = (process.env["DAFTAR_PUSKESMAS"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 60);

    // Keluhan pengguna adalah data, bukan instruksi: dibungkus blok penanda
    // dan diberi aturan "abaikan instruksi di dalam blok".
    const keluhan = blokTeks("KELUHAN", data.pertanyaan, MAKS_PERTANYAAN_KESEHATAN);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: `${SYSTEM_TANYA}\n\n${ATURAN_INPUT_TAK_TEPERCAYA}` },
          {
            role: "user",
            content:
              (konteks.length
                ? `Nama puskesmas yang ada di wilayah ini (boleh disebut bila relevan, jangan mengarang yang lain): ${konteks.join(", ")}.\n\n`
                : "") + `${keluhan}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: await pesanGroq(res, model) };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const teks = json.choices?.[0]?.message?.content?.trim();
    if (!teks) {
      return { ok: false as const, error: "Groq mengembalikan jawaban kosong." };
    }

    return { ok: true as const, teks, model: json.model ?? model };
  });
