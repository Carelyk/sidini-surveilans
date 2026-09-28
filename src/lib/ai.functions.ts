import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const skema = z.object({
  ringkasan: z.string().min(2).max(20000),
  pertanyaan: z.string().max(500).optional(),
  mode: z.enum(["warga", "petugas"]).optional(),
});

/** Batas panjang pertanyaan kesehatan. Lebih pendek daripada pertanyaan analisis. */
const skemaTanya = z.object({
  pertanyaan: z.string().min(3).max(1000),
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
**1. Ringkasan Keluhan** — dua kalimat. Kembalikan keluhan itu dengan kalimat sendiri, supaya pengguna tahu apa yang Anda pahami.
**2. Tanda Bahaya** — daftar tanda yang berarti harus berobat sekarang, bukan menunggu. Tulis "Belum ada" kalau dari keluhan yang diberikan tidak ada. Sebutkan cara memeriksanya sendiri, misalnya "apakah ruamnya memudar saat ditekan".
**3. Kemungkinan Penyebab Umum** — daftar penyebab yang lazim untuk keluhan seperti itu secara umum. Kalimat pertama bagian ini wajib berupa penegas bahwa ini daftar umum, BUKAN diagnosis untuk orang ini.
**4. Yang Bisa Dilakukan di Rumah** — langkah praktis bernomor 1. 2. 3. Sebutkan apa yang jelas boleh dan apa yang tidak boleh.
**5. Ke Mana Harus Pergi** — puskesmas lebih dulu, dan pada kondisi apa harus ke IGD. Sebutkan nama puskesmas hanya bila ada di data.

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
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      return {
        ok: false as const,
        error:
          "Kunci GROQ_API_KEY belum tersedia di server. Simpan kunci API Groq terlebih dahulu.",
      };
    }

    const model = process.env["GROQ_MODEL"] || "openai/gpt-oss-120b";

    // Daftar puskesmas hanya sebagai nama yang boleh disebut, bukan data
    // statistic. Tidak ada di environment pun jawabannya tetap benar.
    const konteks = (process.env["DAFTAR_PUSKESMAS"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 60);

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
          { role: "system", content: SYSTEM_TANYA },
          {
            role: "user",
            content:
              (konteks.length
                ? `Nama puskesmas yang ada di wilayah ini (boleh disebut bila relevan, jangan mengarang yang lain): ${konteks.join(", ")}.\n\n`
                : "") + `Keluhan atau pertanyaan dari pengguna:\n"${data.pertanyaan}"`,
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
