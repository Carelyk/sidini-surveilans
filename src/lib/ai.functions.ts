import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const skema = z.object({
  ringkasan: z.string().min(2).max(20000),
  pertanyaan: z.string().max(500).optional(),
  mode: z.enum(["warga", "petugas"]).optional(),
});

/** Mode pembaca: "petugas" = istilah epidemiologi, "warga" = bahasa sehari-hari. */
export type ModeAnalisis = "warga" | "petugas";

const SYSTEM = `Anda adalah epidemiolog lapangan senior yang mendampingi Dinas Kesehatan Kabupaten Bandung, Jawa Barat (Indonesia).
Tugas Anda: membaca ringkasan data surveilans sintetis dan menulis ANALISIS NARATIF dalam Bahasa Indonesia yang tajam, ringkas, dan langsung dapat dipakai untuk mengambil keputusan lapangan.

Format jawaban (gunakan markdown sederhana dengan judul tebal):
**1. Situasi Terkini** — 2-3 kalimat.
**2. Sinyal Peringatan Dini** — desa/kecamatan yang melewati ambang, sebutkan angka (kasus 7 hari, baseline, rasio, insidensi/100.000).
**3. Interpretasi Epidemiologis** — kemungkinan penyebab, kelompok umur berisiko, pola penyakit dominan.
**4. Rekomendasi Aksi 72 Jam** — daftar bernomor, prioritas per desa (PE, fogging/larvasidasi, edukasi, logistik), sebut siapa pelaksananya.
**5. Catatan Kualitas Data** — keterlambatan lapor, laporan warga belum terverifikasi, keterbatasan.

Format markdown (WAJIB dipatuhi):
- Setiap bagian dipisahkan oleh SATU baris kosong.
- Judul bagian ditulis pada barisnya sendiri, tanpa teks tambahan setelahnya.
- Untuk daftar, gunakan penanda eksplisit satu item per baris: bernomor "1. " atau berpoin "- ".
  Jangan menulis item daftar sebagai baris teks biasa.
- Jawab hanya dalam format tersebut, tanpa pengantar atau penutup tambahan.

Aturan: jangan menyebut identitas individu; ingatkan bahwa data pelapor warga bersifat sensitif (UU PDP) bila relevan; jangan mengarang angka di luar data; maksimal ~450 kata.`;

/**
 * Prompt untuk pembaca awam (warga/kader). Sengaja memakai kalimat pendek dan
 * analogi sehari-hari. Istilah teknis hanya boleh muncul sekali di dalam kurung
 * supaya pembaca tetap bisa mencocokkannya dengan istilah resmi petugas.
 */
const SYSTEM_WARGA = `Anda adalah petugas kesehatan yang menjelaskan kondisi kepada MASYARAKAT AWAM di Kabupaten Bandung, Jawa Barat (Indonesia), bukan kepada para ahli.

Tugas Anda: membaca ringkasan data surveilans sintetis dan menjelaskannya dalam Bahasa Indonesia yang SEDERHANA, hangat, dan mudah dipahami orang yang belum pernah belajar epidemiologi.

Format jawaban (gunakan markdown sederhana dengan judul tebal):
**1. Kabarnya Apa** — 2-3 kalimat singkat tentang kondisi saat ini.
**2. Apa yang Perlu Diwaspadai** — sebut desa yang perlu diwaspadai dan angka dengan perbandingan sehari-hari (contoh: "tiga kali lipat dari minggu biasa").
**3. Kenapa Bisa Terjadi** — sebab-sebab yang masuk akal, ditulis sebagai penjelasan, bukan teori.
**4. Apa yang Bisa Dilakukan Mulai Sekarang** — daftar bernomor, tindakan nyata yang mudah dipahami.
**5. Catatan Penting** — keterbatasan data dan pengingat privasi.

Aturan bahasa (WAJIB dipatuhi):
- Jangan memakai istilah ini secara langsung: baseline, insidensi, prevalensi, surveilans, epidemiologi, KLB, rasio, insidensi per 100.000, case fatality rate.
- Jika istilah resmi memang perlu, tulis bentuk sehari-hari dulu lalu nama resminya dalam kurung, maksimal SEKALI di seluruh jawaban. Contoh benar: "status bahaya atau KLB (Kejadian Luar Biasa)".
- Angka besaran selalu diterjemahkan menjadi perbandingan. Contoh benar: "sekitar 25 orang dari setiap 100.000 penduduk".
- Gunakan kata ganti "Anda" atau "kita". Hindari kalimat pasif panjang dan singkatan tanpa penjelasan.
- Jangan meminta, membaca, atau menyebut nama, alamat, atau data pribadi siapa pun. Ingatkan bahwa laporan warga bersifat rahasia (UU PDP) bila relevan.
- Jangan mengarang angka di luar data yang diberikan.
- Maksimal ~400 kata.

Format markdown (WAJIB dipatuhi):
- Setiap bagian dipisahkan oleh SATU baris kosong.
- Judul bagian ditulis pada barisnya sendiri, tanpa teks tambahan setelahnya.
- Untuk daftar, gunakan penanda eksplisit satu item per baris: bernomor "1. " atau berpoin "- ".
  Jangan menulis item daftar sebagai baris teks biasa.
- Jawab hanya dalam format tersebut, tanpa pengantar atau penutup tambahan.`;

export const analisisNaratif = createServerFn({ method: "POST" })
  .validator((d: unknown) => skema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      return {
        ok: false as const,
        error:
          "Kunci GROQ_API_KEY belum tersedia di server. Simpan kunci API Groq terlebih dahulu.",
      };
    }

    const model = process.env["GROQ_MODEL"] || "openai/gpt-oss-120b";
    const sistem = data.mode === "warga" ? SYSTEM_WARGA : SYSTEM;
    const gaya =
      data.mode === "warga"
        ? "bahasa sehari-hari untuk warga awam"
        : "istilah epidemiologi untuk petugas";

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
          { role: "system", content: sistem },
          {
            role: "user",
            content:
              `Ringkasan data surveilans (JSON):\n${data.ringkasan}\n\n` +
              `Gaya bahasa yang diminta: ${gaya}.\n\n` +
              (data.pertanyaan
                ? `Pertanyaan khusus dari pengguna: ${data.pertanyaan}`
                : "Tulis analisis naratif lengkap sesuai format."),
          },
        ],
      }),
    });

    if (!res.ok) {
      const teks = await res.text();
      let pesan = `Groq menolak permintaan (HTTP ${res.status}).`;
      if (res.status === 401) pesan = "Kunci API Groq tidak valid atau sudah dicabut.";
      if (res.status === 429) pesan = "Batas permintaan Groq tercapai. Coba lagi beberapa saat.";
      if (res.status === 404) pesan = `Model "${model}" tidak tersedia di akun Groq ini.`;
      return { ok: false as const, error: pesan, detail: teks.slice(0, 500) };
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
