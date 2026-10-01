# Problem Analysis [Rubrik: Problem Understanding & Analysis]

> Versi lengkap dari Bagian 2 proposal; ringkasan pendeknya ditulis langsung di `DHIC2026_Proposal_Draft.md`.
> Catatan data: seluruh angka kasus pada dokumen ini **sintetis** (studi kasus). Yang resmi hanya batas wilayah, kode kecamatan/desa, dan jumlah penduduk tingkat kabupaten. Ambang status berstatus "perlu verifikasi acuan Dinkes" dan sengaja tidak diubah agar perbandingan antar versi tetap terbaca.

---

## Inti masalah

Kabupaten Bandung (3.873.653 jiwa, 31 kecamatan, 280 desa) menjalankan surveilans KLB melalui SKDR yang ritmenya **agregat mingguan** — data tidak kurang, tetapi tidak berubah menjadi tindakan tepat waktu. Akibatnya lonjakan kasus baru terlihat ketika rekap mingguan ditutup: hingga **tujuh hari setelah kejadian**. Pada snapshot sintetis 25 Sep 2026, **275 kasus mengalir dalam 7 hari (naik 58% dari 174 kasus minggu sebelumnya)** — dan dalam rentang itu wabah terus menyebar tanpa peringatan atau tindakan lapangan.

Dua lapisan sistem berjalan paralel dengan kualitas berbeda: alur **puskesmas** (terverifikasi) dan alur **warga** (94 laporan menggantung belum diverifikasi), tanpa stempel waktu verifikasi sehingga kinerja alur kedua **tidak terukur**. Tidak ada lapisan yang menerjemahkan angka menjadi status dan keputusan — petugas tetap membaca deretan tabel manual dan menghafal ambang sendiri.

---

## Akar masalah (bukan sekadar gejala)

| # | Akar masalah | Bukti di prototipe |
|---|---|---|
| 1 | **Latensi struktural: tidak ada lapisan perhitungan harian per desa sebelum rekap mingguan** | 275 kasus (naik 58%) baru terbaca saat rekap ditutup; jejak deteksi harian tidak ada yang memprosesnya. |
| 2 | **Dua kanal pelaporan dengan kualitas berbeda tanpa pengukuran** | 94 laporan warga menggantung belum diverifikasi; tanpa stempel waktu verifikasi, kinerja verifikasi tak bisa dinilai. |
| 3 | **Tidak ada lapisan "angka → keputusan"** | Deretan tabel dibaca manual; ambang tanpa syarat kasus minimum memicu *alert fatigue* — desa kecil dengan baseline 0 tampak "naik 99×". |
| 4 | **Denominator risiko per desa tidak tersedia** | Jumlah penduduk desa tidak dipublikasikan per desa, sehingga status harian hanya bisa bersandar pada rasio terhadap baseline — dan rasio tidak bermakna di desa kecil. Pada prototipe, angka penduduk desa diisi alokasi proporsional dari penduduk kecamatan (perkiraan, "perkiraan; perlu verifikasi Dinkes") supaya aturan insidensi bisa diuji; Rancaekek Kulon terpicu Sinyal justru lewat aturan insidensi itu. |

Gejala yang tampak di lapangan (lonjakan pasien, KLB yang terlewati) berakar pada keempat hal ini; menambal salah satunya tanpa yang lain tidak menyelesaikan keterlambatan.

---

## Stakeholders

- **Dinkes Kabupaten Bandung** — pemilik keputusan KLB; paling dirugikan ketika keputusan datang dari angka yang sudah usang.
- **Puskesmas & petugas surveilans/epidemiologi 31 kecamatan** — pengisi dan pemakai harian; terbebani entri berulang dan pembacaan tabel manual.
- **Warga pelapor** — kanal tercepat namun belum terverifikasi; kelompok yang paling terdampak respons lambat.
- **Pemerintah desa/kecamatan** — mobilisasi lapangan (PE, fogging, edukasi, logistik) yang butuh prioritas lokasi.
- **Dinkes Provinsi & Kemenkes** — penerima rekap SKDR; tidak dirugikan oleh SIDINI karena angka yang masuk ke SKDR tidak diubah.

---

## Posisi masalah dalam siklus hidup informasi kesehatan

Masalah berada pada persimpangan **agregasi → analisis → keputusan**: data harian dipaksakan ke wadah mingguan (kecepatan turun satu tingkat), angka tidak diterjemahkan menjadi peringatan dan tindakan, dan umpan balik ke pelapor/lapangan tidak tertutup. SIDINI menggeser titik keputusan lebih awal dalam siklus: agregasi harian otomatis per desa, analisis berbasis ambang + peta, peringatan otomatis, dan kanal warga yang diverifikasi sebelum dihitung.

---

## Kuantifikasi

### A. Lonjakan yang sedang berlangsung (7 hari terakhir s.d. 25 Sep 2026)

- **275 kasus** dalam 7 hari — naik **+58%** dari 174 kasus pada 7 hari sebelumnya.
- **4 desa berstatus Sinyal (dugaan KLB)** — tiga klaster DBD di satu wilayah PLUS satu desa yang terpicu aturan insidensi:
  - **Cimenyan**: 70 kasus/7 hari, rasio **6,6×** baseline, insidensi 552,7/100.000;
  - **Cikadut**: 70 kasus/7 hari, rasio **5,4×**, insidensi 552,7/100.000;
  - **Cibeunying**: 51 kasus/7 hari, rasio **3,9×**, insidensi 402,7/100.000;
  - **Rancaekek Kulon**: 7 kasus/7 hari, rasio 2,33× — di bawah syarat minimal 10 kasus, sehingga **tidak** menyalakan aturan rasio; status Sinyal-nya datang dari **insidensi 50,8/100.000/minggu yang melewati ambang 50**.
- **4 desa Waspada**: Rancaekek Wetan (6 kasus DBD, 2,57×), Mekarsari (3, 1,5×), Ciapus (4, 1,71×), Kamasan — Diare (3, 2,25×).
- Sisa 15 desa berstatus Aman.
- Komposisi penyakit: **DBD 81%**, Diare 11%, Chikungunya 4%, Hepatitis A 4%.

### B. Kualitas & keterlambatan data

- **94 laporan warga menunggu verifikasi** dan belum dihitung sebagai kasus → beban nyata berpotensi lebih tinggi dari 275.
- Keterlambatan lapor (selisih tanggal lapor − tanggal onset, **672 kasus**): rata-rata **0,35 hari**, median **0 hari**, 90% ≤ 1 hari, paling lambat 2 hari.
- Yang **belum terukur** (dan harus diukur di produksi): waktu verifikasi laporan warga, waktu tanggap petugas, kepatuhan pelaporan puskesmas.

### C. Deteksi dini dibanding rekap mingguan (mengapa lapis harian bernilai)

- Sinyal harian yang terpicu rasio muncul **1–6 hari lebih awal** dari rekap mingguan: Cimenyan & Cikadut **6 hari**, Cibeunying **1 hari**. Rancaekek Kulon tidak dihitung di sini: sinyalnya terpicu insidensi, dan tabel kecepatan deteksi sengaja hanya mengukur aturan rasio, jadi barisnya ditulis "belum diukur" — bukan diberi tanggal hasil tebakan.
- Bila tetap menunggu rekap, KLB DBD 6,6× baseline baru "terdengar" **satu minggu setelah kasus pertama melewati ambang** — cukup bagi dengue untuk menyebar di wilayah padat.

### D. Beban tahunan (lapis SKDR mingguan, minggu 1–39)

| Penyakit | Kasus | Kematian | Minggu KLB (2026 vs 2025) | Puncak kabupaten |
|---|---|---|---|---|
| DBD | 4.346 | 57 | **6 vs 3** | 302 kasus/minggu |
| Diare | 29.731 | 5 | **4 vs 0** | 875 kasus/minggu |
| Chikungunya | 533 | 1 | 0 vs 0 | 27 kasus/minggu |
| Hepatitis A | 270 | 1 | 0 vs 0 | 12 kasus/minggu |

- **57 kematian DBD dalam 39 minggu** terkonsentrasi pada minggu-minggu KLB — kematian yang seharusnya dapat dicegah oleh deteksi dini.
- Risiko bila dibiarkan: lonjakan 58% + klaster dugaan KLB di Cimenyan baru terdeteksi kabupaten **1–7 hari setelah minggu ditutup**, bukan pada **12–14 September** saat kasus pertama melewati ambang. Setiap hari keterlambatan = tambahan kasus sekunder di wilayah yang belum diintervensi.

---

## Penutup

SIDINI memakai batas wilayah publik Kabupaten Bandung (nama kecamatan/desa dan koordinat dari data GADM + Permendagri 72/2019) dengan seluruh kasus sintetis — tidak ada data pasien nyata. Angka ambang, mayoritas, dan indikator berstatus "perlu verifikasi acuan Dinkes", dan tidak diubah agar pembandingan antar versi tetap jujur.