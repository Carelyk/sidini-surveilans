# DHIC 2026 — Solution Proposal (Draft)

> Nama file saat submit: `DHIC2026_[CaseNumber]_[TeamName]_Proposal.pdf`
> Bagian yang ditandai `[ISI]` wajib kamu lengkapi (data tim & pilihan case). Sisanya sudah diisi berdasarkan prototipe web SIDINI yang live.

---

## Team & submission details

| Field | Your entry |
|---|---|
| Team name | **[ISI nama tim]** |
| Campus / institution | **[ISI kampus/universitas]** |
| Study program(s) | **[ISI prodi]** |
| Member 1 (name, role, email) | **[ISI]** |
| Member 2 (name, role, email) | **[ISI]** |
| Member 3 (name, role, email) | **[ISI]** |
| Faculty mentor (if any) | **[ISI / —]** |
| Case chosen (1–5) | **[ISI nomor case]** (solusi menyasar **surveilans & kesiapsiagaan wabah** SKDR) |
| Solution name / working title | **SIDINI — Sistem Deteksi Dini Wabah** (pengembangan SKDR Kabupaten Bandung) |
| Mockup link (view access enabled) | https://sidini-surveilans.narasi-nusantara.workers.dev (live; seluruh halaman dapat diakses) |
| Working prototype link (optional) | https://sidini-surveilans.narasi-nusantara.workers.dev |

---

## 1. Executive summary

Kabupaten Bandung (3.873.653 jiwa, 31 kecamatan, 280 desa) menjalankan surveilans KLB melalui SKDR yang ritmenya **agregat mingguan**. Akibatnya lonjakan kasus baru terlihat ketika rekap mingguan ditutup — hingga tujuh hari setelah kejadian — sementara 94 laporan warga menggantung belum diverifikasi dan dua kanal pelaporan (puskesmas vs warga) berada di tingkat kualitas berbeda. Pada snapshot sintetis 25 Sep 2026 sistem mencatat **275 kasus dalam 7 hari (+58%)**, dengan **4 desa berstatus Sinyal**: tiga klaster DBD di Cimenyan (70/70/51 kasus; rasio hingga 6,6× baseline) dan Rancaekek Kulon yang terpicu oleh aturan insidensi (7 kasus, 50,8 per 100.000/minggu).

**SIDINI** adalah sistem peringatan dini berbasis web yang menambahkan **lapis pengamatan harian per desa** di atas rekap mingguan SKDR yang sudah ada — tidak menggantikan SKDR, tidak mengubah angka yang masuk ke SKDR. SIDINI menghitung baseline 3 minggu, rasio, dan insidensi; menandai desa sebagai **Sinyal/Waspada/Aman** dengan syarat kasus minimum untuk menekan *alert fatigue*; menelusuri alur **lapor warga → verifikasi petugas**; lalu menerjemahkan angka menjadi **narasi AI dua tingkat bahasa** (warga & petugas) beserta rekomendasi aksi 72 jam.

Dampak yang diharapkan: deteksi sinyal **1–6 hari lebih awal** dari rekap mingguan (terukur pada prototipe), keterlambatan lapor rata-rata 0,35 hari menjadi acuan bukan target, antrean verifikasi 94 laporan menjadi terlacak dengan stempel waktu, dan kematian yang terkonsentrasi pada minggu KLB (57 kematian DBD dalam 39 minggu pada data simulasi) dapat dicegah karena keputusan diambil dari angka yang masih hangat.

---

## 2. Problem analysis [Rubric: Problem Understanding & Analysis]

*(isi lengkap di `01-problem-analysis.md`; ringkasan di bawah)*

**Inti masalah.** Surveilans yang ada bersifat reaktif: data tidak kurang, tetapi tidak berubah menjadi tindakan tepat waktu. SKDR adalah formulir agregat mingguan, sehingga 275 kasus yang mengalir dalam 7 hari (naik 58%) baru terbaca saat rekap mingguan ditutup. Dalam rentang itu wabah terus menyebar tanpa peringatan atau tindakan lapangan.

**Akar masalah (bukan gejala).** (1) Latensi struktural: tidak ada lapisan perhitungan harian per desa sebelum rekap mingguan; (2) dua kanal pelaporan dengan kualitas berbeda (puskesmas terverifikasi vs 94 laporan warga menggantung) tanpa stempel waktu verifikasi sehingga kinerja verifikasi tak terukur; (3) tidak ada lapisan "angka → keputusan" — deretan tabel dibaca manual dan ambang tanpa syarat kasus minimum memicu *alert fatigue* (desa kecil baseline 0 tampak naik 99×); (4) denominator risiko per desa tidak tersedia dalam bentuk siap pakai — jumlah penduduk desa tidak dipublikasikan per desa, sehingga status harian hanya bisa mengandalkan rasio kasus terhadap baseline, yang pada desa kecil tidak bermakna. Pada prototipe, angka penduduk desa diisi dengan alokasi proporsional dari penduduk kecamatan (perkiraan, dicatat sebagai "perkiraan; perlu verifikasi Dinkes") supaya aturan insidensi bisa diuji; angka resmi per desa tetap menjadi syarat sebelum produksi.

**Stakeholders.** Dinkes Kabupaten Bandung (pemilik keputusan KLB), puskesmas & petugas surveilans/epidemiologi 31 kecamatan (pengisi dan pengguna), warga pelapor (kanal tercepat namun belum terverifikasi, paling terdampak respons lambat), pemerintah desa/kecamatan (mobilisasi lapangan), serta Dinkes Provinsi & Kemenkes (penerima rekap SKDR).

**Posisi dalam siklus hidup informasi kesehatan.** Masalah berada pada persimpangan **agregasi → analisis → keputusan**: data harian dipaksakan ke wadah mingguan (kecepatan turun satu tingkat), angka tidak diterjemahkan menjadi peringatan dan tindakan, dan umpan balik ke pelapor/lapangan tidak tertutup. SIDINI menggeser titik keputusan lebih awal dalam siklus.

**Kuantifikasi.** Lihat `01-problem-analysis.md`: 275 kasus +58%; 4 desa sinyal (3 klaster DBD 6,6×/5,4×/3,9× baseline + Rancaekek Kulon terpicu insidensi 50,8/100.000); 4 desa waspada; DBD 81% komposisi; keterlambatan lapor rata-rata 0,35 hari (median 0, 90% ≤ 1 hari, berdasarkan 672 kasus); sinyal terpicu rasio muncul 1–6 hari lebih awal; 94 laporan menunggu verifikasi; beban tahunan DBD 4.346 kasus/57 kematian/6 minggu KLB (vs 3 di 2025) dan Diare 29.731 kasus/4 minggu KLB (vs 0).

---

## 3. Proposed solution [Rubric: Solution Design & Innovation]

**Apa dan cara kerjanya.** SIDINI adalah aplikasi web yang menambahkan **lapis harian per desa** di atas rekap mingguan SKDR. Alur empat tahap: (1) **Pelaporan** — puskesmas mengisi kasus lewat formulir 6 kolom yang mengikuti pola variabel SKDR/e-Puskesmas; warga melapor gejala **tanpa nama**. (2) **Verifikasi** — laporan warga masuk antrean triase (setujui/selidiki/tolak); laporan belum terverifikasi tidak dihitung sebagai kasus. (3) **Ambang otomatis** — sistem menghitung baseline 3 minggu, rasio terhadap baseline sendiri, dan insidensi per 100.000 per penyakit; lapis harian memakai status Sinyal (rasio ≥ 2× **dengan** minimal 10 kasus/7 hari, **atau** insidensi ≥ ambang penyakit) dan Waspada (rasio ≥ 1,5× dengan minimal 3 kasus, atau insidensi ≥ 60% ambang); label **KLB** hanya dipakai rekap mingguan sesuai kewenangan penetapan. (4) **Narasi AI** — ringkasan disusun di server, dikirim ke Groq LLM, dan dikembalikan sebagai analisis dua mode bahasa: pembaca **warga** (kalimat pendek, tanpa istilah teknis) dan pembaca **petugas** (istilah epidemiologi + rekomendasi aksi 72 jam per desa). Penerima peringatan mengikuti peran pada kasus: kepala puskesmas & petugas surveilans untuk tindakan, tim epidemiologi untuk penyelidikan, dan pimpinan Dinas Kesehatan untuk eskalasi; pada prototipe peringatan tampil sebagai **banner waktu-nyata di dashboard**, sedangkan kanal kirim (push/WA/SMS) dan jam kirim ditetapkan dinas sebelum produksi.

**Cakupan minimum case.** Terpenuhi seluruhnya: pelaporan dua kanal, verifikasi berjenjang, peringatan dini otomatis berbasis ambang, dashboard dan peta status, serta rekap mingguan per kecamatan per penyakit.

**Cakupan stretch.** Terjangkau sebagian besar: narasi AI dua mode, tanya AI kesehatan masyarakat, peta interaktif (zoom/geser/titik kasus), persistensi data demo di peramban (localStorage — **bukan** aplikasi offline penuh; tidak ada service worker, jadi situs tetap butuh koneksi untuk dimuat), ekspor CSV/Excel, animasi tren 28 hari, serta panel metrik kinerja (keterlambatan lapor, waktu deteksi, sinyal lebih awal dari rekap) yang dihitung dan ditampilkan secara jujur.

**Inovasi dan mengapa berguna.**
1. **Dua lapis penandaan yang sengaja dipisah** — Sinyal harian ≠ status KLB resmi. Kata "KLB" tidak punya dua arti dalam satu sistem, sehingga petugas tidak ragu makna notifikasi. Ini inovasi *kerja*, bukan tampilan.
2. **Pembatas alert fatigue berbasis syarat kasus minimum** — tanpa itu desa kecil dengan 1 kasus dan baseline 0 tampak "naik 99×". Syarat ini membuat peringatan bermakna dan mencegah petugas berhenti mempercayai sistem.
3. **Narasi AI yang dibangun server-side dan tidak mengarang angka** — prompt melarang angka di luar data dan menandai teks warga sebagai data tak tepercaya; ringkasan disusun server, peramban hanya mengirim kasus tambahan miliknya. AI tidak menentukan ambang, tidak menggantikan verifikasi, dan tidak menampilkan identitas individu.
4. **Metrik kinerja dihitung, bukan diklaim** — panel "Kecepatan deteksi & keterlambatan lapor" memakai asumsi yang dinyatakan terbuka; metrik yang belum bisa diukur ditulis "belum diukur" beserta cara mengukurnya, bukan disembunyikan.

---

## 4. Users & key features [Rubric: Solution Design; UX & Mockup Quality]

| Pengguna utama | Peran | Fitur inti di SIDINI | Mengurangi beban kerja, bukan menambah |
|---|---|---|---|
| **Petugas Dinkes (kabupaten)** | Penilai status dan penentu tindakan | Dashboard 7 hari (kartu statistik, banner Sinyal/Waspada, tren, komposisi penyakit & umur), Peta & ambang, tabel status per desa dengan alasan status, kartu rekap SKDR mingguan per penyakit, tabel kecepatan deteksi | Angka langsung diubah menjadi status + alasan; tidak perlu membaca deretan tabel manual. Semua tabel bisa dicari, disalin, diekspor CSV/Excel, dan dicetak. |
| **Petugas surveilans puskesmas** | Sumber data terverifikasi; verifikator laporan warga | Halaman "Input Kasus Puskesmas" (formulir 6 kolom mengikuti pola SKDR/e-Puskesmas), halaman "Verifikasi" (antrean triase: setujui/selidiki/tolak, cari, paginasi) | Formulir sedikit kolom dan variabelnya seragam dengan e-Puskesmas → tidak ada pengetikan ulang dua kali; antrean verifikasi terurut dan bisa dicari. |
| **Warga / kader** | Pelapor cepat dari lapangan | "Lapor Warga": pilih desa, kelompok umur (bayi & balita 0-4, anak 5-9, remaja 10-18, dewasa 19-59, lanjut usia 60+), gejala, tanggal onset, opsi tandai kluster; **tanpa nama dan alamat** | Lapor dari ponsel tanpa akun; sistem tidak meminta identitas sehingga cepat diisi. |
| **Masyarakat umum (pembaca)** | Penerima informasi | Mode narasi AI "warga" (bahasa sehari-hari) di halaman Analisis; halaman Konsep yang menjelaskan keterbatasan data | Informasi disajikan dalam kalimat pendek + terjemahan perbandingan ("3× lipat minggu biasa"), bukan tabel angka. |

**Bagaimana desain mengurangi beban.** Seluruh keputusan status dihitung sistem dan *alasannya ditulis* di tabel (misal: "Rasio 0,7× tidak dinilai: kasus hanya 2, di bawah minimal 3"). Petugas tidak perlu menghafal ambang. Satu konfigurasi ambang (SSOT) mencegah perbedaan angka antar halaman. Fitur narasi AI meringkas data menjadi 5 bagian format tetap untuk keputusan 72 jam — bukan pengganti verifikasi manusia.

> Referensi mockup: seluruh *screen* prototipe live (Appendiks A). Ads: screenshots terbaru tersedia di folder `proposal-screenshots/` tim.

---

## 5. Technology & architecture [Rubric: Technical Feasibility & Architecture]

**Platform.** Web responsif (desktop & ponsel), SSR dengan fallback statis; satu aplikasi untuk petugas dan warga dengan perbedaan peran.

**Stack.** TanStack Start (SSR + file routing) · React 19 · TypeScript strict · Tailwind CSS 4 · Recharts · Zod · TanStack Query · Groq LLM API (server function) · Lucide · Vitest (156 uji otomatis) · di-deploy ke Cloudflare Workers.

```
 Warga / ponsel ─┐
 Puskesmas ───────┤→  Web App (SSR, TanStack Start)
 Dinkes ─────────┘      │
                        ├─ Lapis hitung status (baseline 3 mgg, rasio, insidensi, ambang SSOT)
                        ├─ Lapis verifikasi & penyimpanan (localStorage demo → DB nyata nanti)
                        ├─ Server function AI → Groq LLM (narasi 2 mode; rate-limit per IP;
                        │   teks warga dibungkus sbg data tak tepercaya)
                        └─ Ekspor tabel (CSV/Excel) & peta SVG interaktif
 Integrasi nyata (rencana) ← e-Puskesmas / SKDR / SATUSEHAT (FHIR, HTTP)
```

**Model data (entitas utama).** `Kasus` (id, penyakit, tanggalOnset, tanggalLapor, kodeDesa/kecamatan, puskesmas, kelompokUmur, jenisKelamin, status[Baru|Investigasi|Terverifikasi|Selesai|Ditolak], sumber[Puskesmas|Warga], gejala[], catatan). `Desa/Wilayah` (kode, nama, kecamatan, puskesmas, koordinat — data resmi GADM + Permendagri 72/2019). `RekapSKDR` (tahun, minggu, kecamatan, penyakit, penderita, meninggal — struktur agregat persis lembar SKDR). `Ambang` (SSOT `src/data/ambang.ts`: kasusMin, insidensiMin, rasioWaspada, rasioKLB per penyakit + sumber & status verifikasinya). `PopulasiDesa` (referensi; terisi 23 dari 23 desa dengan alokasi proporsional dari BPS kecamatan, ditandai "perkiraan; perlu verifikasi Dinkes"). Status per desa/kecamatan **dihitung**, bukan disimpan.

**Integrasi dengan sistem yang ada.** Prototipe **belum** terhubung ke sistem nyata (jujur dinyatakan di halaman Konsep). Rancangan integrasi: (a) variabel formulir mengikuti pola SKDR & e-Puskesmas agar pertukaran data tidak menuntut pengetikan ulang; (b) penyimpanan lokal di perangkat puskesmas agar laporan tetap masuk saat jaringan terputus lalu dikirim ulang (offline-first); (c) pemetaan entitas ke **FHIR** (Kasus → `Observation`/`Condition` + `Encounter` kecil; wilayah → `Location`) untuk koneksi SATUSEHAT; (d) agregat mingguan dikirim dalam format SKDR, bukan format baru. Realistis untuk fasilitas: versi pertama berjalan di peramban + server kecil, tanpa aplikasi native.

---

## 6. Regulatory & data-standard alignment [Rubrik: Regulatory & Data-Standard Alignment]

SIDINI dirancang agar tidak memuat pelanggaran yang umum pada prototipe kesehatan:

- **PMK 24/2022 (RME)** — Rekaman elektronik, tanda tangan elektronik (TTE), dan *audit trail*: prototipe **belum** menerapkannya dan hal ini dinyatakan terbuka. Desain nyata menambahkan: login peran (TTE untuk verifikasi), *audit trail* tiap perubahan status kasus (siapa, kapan, dari apa ke apa), dan penyimpanan terenkripsi. Tanpa itu, aplikasi tidak dioperasikan untuk data pasien sungguhan.
- **UU PDP No. 27/2022** — Data kesehatan adalah data pribadi spesifik yang membutuhkan perlindungan lebih ketat. SIDINI menerapkan **minimasi**: nama pelapor tidak diminta, kanal warga hanya menyimpan kode desa + kelompok umur + gejala (tanpa alamat lengkap); dashboard/peta/AI hanya memakai **agregat per desa**. Landasan pemrosesan legal (consent/kinerja tugas pelayanan publik) dan perjanjian pengolahan saat produksi. Dua halaman petugas (input puskesmas dan verifikasi) dijaga dengan login prototipe yang kredensialnya diperiksa di peramban — dinyatakan sebagai keterbatasan dan wajib diganti pemeriksaan peran di server sebelum produksi; pengelolaan insiden/breach (prosedur notifikasi Komdigi + yang terdampak) perlu dimiliki fasilitas. Catatan tata kelola: lembaga independen pengawas PDP sendiri belum terbentuk, sehingga fungsi pengawasan untuk sekarang masih di Komdigi. Ini konteks ketegangan regulasi versus pelaksanaan, bukan alasan menunda pemenuhan UU PDP — justru menunjukkan perlunya kepatuhan sejak awal.
- **SATUSEHAT/FHIR** — Belum diintegrasikan; rencana pemetaan entitas ke FHIR R4 dan berbagi lewat kanal SATUSEHAT. Tidak ada transfer data sebelum kontrak format & persetujuan Dinkes.
- **BPJS/INA-CBG** — SIDINI **tidak menyentuh klaim**, sehingga tidak menciptakan jalur *fraud coding*. Jika data terhubung ke SIMRS/BPJS, kodifikasi penyakit memakai definisi kasus baku (kasus terverifikasi per SKDR), bukan kode yang dioptimalkan untuk tarif.

**Pernyataan eksplisit anti-non-komplian:** seluruh data prototipe sintetis (tidak ada data pasien nyata); tidak ada transfer data keluar sebelum autentikasi & audit trail tersedia; AI tidak pernah menerima identitas individu dan peramban hanya mengirim kasus tambahan miliknya.

---

## 7. Feasibility & implementation plan [Rubric: Technical Feasibility]

**Fase & upaya perkiraan (tim 3 orang).**

| Fase | Lingkup | Perkiraan upaya | Dependensi |
|---|---|---|---|
| **P0 — Prototipe (selesai)** | Dua lapis deteksi, verifikasi, dashboard/peta, AI naratif, metrik kinerja, 156 uji otomatis | sudah dikerjakan | — |
| **P1 — Produksi minimum (8 minggu)** | Autentikasi peran + TTE, penyimpanan server (Postgres), audit trail, atur jam & jabatan penerima notifikasi, konfirmasi angka penduduk desa & ambang resmi bersama Dinkes | ± 3 orang × 8 minggu | Keputusan Dinkes: ambang & penerima peringatan; **verifikasi angka penduduk desa per kecamatan menjadi angka resmi per desa** |
| **P2 — Integrasi (10 minggu)** | Koneksi e-Puskesmas/SKDR (format variabel sama), offline sync, pemetaan FHIR, pilot 2 kecamatan | ± 3 orang × 10 minggu | Akses SATUSEHAT/SIMRS, MoU data, perangkat puskesmas |
| **P3 — Perluasan (5 minggu)** | 31 puskesmas, kanal notifikasi (WhatsApp resmi/sms), evaluasi metrik | ± 2 orang | Hasil pilot & Dinkes |

**Risiko & mitigasi.** (1) *Data quality & kebisingan dua kanal* → alur triase wajib, syarat kasus minimum, laporan belum diverifikasi tidak dihitung. (2) *Alert fatigue* → pembatas min kasus + ambang relatif musiman untuk penyakit endemik (diare; sudah dirancang). (3) *Konektivitas puskesmas* → desain offline-first (antrean kirim ulang). (4) *AI mengarang angka* → ringkasan disusun di server, prompt melarang angka di luar data, output wajib dibaca petugas; metrik & kualitas verifikasi dilacak. (5) *Regulasi* → tidak mulai produksi sebelum autentikasi, audit trail, dan persetujuan ambang Dinkes.

**Keterbatasan yang diakui di prototipe:** pemeriksaan peran baru dijalankan di peramban (login contoh, tanpa server, basis data, maupun hashing sandi, dan bisa dilewati dari devtools), data hanya di localStorage peramban, antrean verifikasi & penerima notifikasi belum push/sms/WA, dua lapis simulasi (harian per desa vs SKDR mingguan) belum direkonsiliasi, dan metrik respons/waktu verifikasi belum terukur karena belum ada stempel waktu.

---

## 8. Impact & success metrics [Rubric: Impact & Measurability]

| Metrik | Nilai dasar (prototipe, snapshot 25 Sep 2026) | Target saat produksi | Cara mengukur di fasilitas |
|---|---|---|---|
| **Waktu deteksi (lead time sinyal)** | Sinyal harian yang terpicu rasio muncul **1–6 hari lebih awal** dari rekap mingguan (Cimenyan & Cikadut 6 hari, Cibeunying 1 hari; Rancaekek Kulon "belum diukur" karena sinyalnya terpicu insidensi) | Deteksi **≤ 24 jam** setelah kasus melewati ambang (mengacu batas pelaporan Permenkes 1501/2010 Pasal 16) | Stempel waktu onset → stempel waktu sinyal (sudah dihitung panel "Kecepatan deteksi") |
| **Keterlambatan lapor** | Rata-rata 0,35 hari; median 0; 90% ≤ 1 hari (672 kasus) | Tetap ≤ 1 hari; menjadi acuan bukan target | Kolom tanggalOnset vs tanggalLapor (sudah dihitung) |
| **Antrean verifikasi** | 94 laporan menunggu verifikasi; waktu verifikasi **belum terukur** | Waktu verifikasi terlacak (jam:menit) & antrean < 1 hari kerja | Tambah kolom stempel waktu verifikasi di halaman Verifikasi (cara ukur sudah ditulis di Konsep) |
| **Kepatuhan pelaporan puskesmas** | Belum terukur (tak ada jadwal pembanding di data) | ≥ 95% puskesmas lapor tepat waktu per jadwal | Kalender jadwal lapor vs hari lapor yang tercatat |
| **Presisi peringatan (anti alert fatigue)** | 4 sinyal dari 23 desa, masing-masing dengan alasan tertulis: 3 terpicu rasio, 1 terpicu insidensi | Rasio kesalahan positif turun; setiap sinyal menghasilkan penyelidikan lapangan | Bandingkan sinyal vs hasil PE (catatan verifikasi) |
| **Kelengkapan data penunjang** | 23 dari 23 desa sudah punya jumlah penduduk + sumber + tahun — tetapi **perkiraan** (alokasi proporsional dari BPS kecamatan, "perkiraan; perlu verifikasi Dinkes"), bukan angka resmi per desa | 100% desa punya penduduk **resmi** dari Dinkes + sumber & tahun tercantum | Verifikasi silang tabel referensi populasi-desa ke data Dinkes, lalu ganti status sumber dari "perkiraan" menjadi resmi |
| **Time-to-response** | Belum terukur (tanpa stempel waktu terima→berangkat→selesai di prototipe) | Respons ≤ 24 jam sejak sinyal (batas penanggulangan dini Permenkes 1501/2010) | Tambahkan stempel waktu 3 peristiwa pada tiap sinyal desa (cara ukur sudah ditulis di Konsep) |
| **Proporsi KLB terdeteksi sebelum lonjakan** | Ilustrasi dataset: sinyal DBD Cimenyan naik 1–6 hari sebelum rekap mingguan | ≥ 80% KLB terdeteksi minimal 1 hari sebelum puncak | Bandingkan tanggal sinyal harian vs tanggal puncak rekap mingguan per kecamatan |

**Efek yang diharapkan pada angka kasus.** Pada data simulasi, kematian DBD (57 dalam 39 minggu) terkonsentrasi pada 6 minggu KLB; bila deteksi dini memotong jeda 1–6 hari, tindakan (PE, fogging/larvasidasi, edukasi) berjalan sebelum puncak — target turunnya keparahan dapat diukur dari jumlah kematian & lama KLB pada musim berikutnya. Pengukuran dilakukan lewat panel metrik yang sudah dibangun di dashboard (label "simulasi" saat prototipe).

---

## 9. Use of the synthetic dataset

SIDINI menggunakan **dua simulasi deterministik (PRNG seed tetap)** sehingga demo dapat diulang; **tidak ada data pasien nyata** di repository. Struktur data mengikuti saran *synthetic data* pada case: ID kasus, penyakit, tanggal onset, tanggal lapor, puskesmas, desa/kode desa, koordinat, kelompok umur (pengelompokan Kemenkes: 0-4, 5-9, 10-18, 19-59, 60+), dan status — tersebar di beberapa desa dan minggu, dengan **satu desa (Cimenyan) sengaja melampaui ambang** untuk mendemonstrasikan peta, tren, dan peringatan otomatis.

- **Kasus harian individual (42 hari, s.d. 25 Sep 2026)** — 23 desa asli di 8 kecamatan (kecamatan & desa dari data resmi GADM + Permendagri 72/2019; koordinat digenerate seragam di dalam poligon, bukan koordinat presisi). Struktur variabel meniru dataset surveilans Indonesia yang umum dipublikasikan. Sebanyak 672 kasus diukur untuk metrik keterlambatan; 275 kasus dalam 7 hari terakhir.
- **Rekap SKDR mingguan (minggu 1–39, 31 kecamatan, 4 penyakit)** — DBD 4.346 kasus (57 kematian, 6 minggu KLB vs 3 di 2025), Diare 29.731 (4 minggu KLB vs 0), Chikungunya 533, Hepatitis A 270. Level kasus dijangkar ke perkiraan acuan Dinkes Jawa Barat (DBD 3.466, diare 90.337 — ditandai "perkiraan acuan, belum diverifikasi ulang"), distribusi proporsional penduduk dengan penguat "rawan" DBD di 4 kecamatan, dan sengaja ada **outbreak skenario**: DBD pada minggu 5–9 dan Diare pada minggu 34–38 agar logika KLB terlihat bekerja.

- **Tabel penduduk desa (23 dari 23 desa)** — jumlah penduduk desa diisi dengan **alokasi proporsional** dari penduduk kecamatan resmi BPS *Kecamatan … Dalam Angka 2025* (penduduk kecamatan ÷ jumlah desa di kecamatan, dibulatkan), `tahun: 2025`. Status sumber ditulis jujur di tabel referensi: *"Alokasi proporsional dari BPS, Kecamatan … Dalam Angka 2025 (perkiraan; perlu verifikasi Dinkes)"*. Angka ini dipakai untuk menghitung insidensi per 100.000/minggu, dan karena itu aturan insidensi ikut aktif — itulah yang membuat Rancaekek Kulon naik ke Sinyal. Ini estimasi, bukan angka resmi per desa.

**Anomali yang dideteksi sistem:** klaster dugaan KLB DBD di Kecamatan Cimenyan (Cimenyan 70 kasus/6,6×, Cikadut 70/5,4×, Cibeunying 51/3,9×), Rancaekek Kulon yang terpicu **aturan insidensi** (7 kasus, insidensi 50,8/100.000/minggu ≥ ambang 50, sementara kasusnya belum cukup untuk aturan rasio), serta pengujian bahwa *alert fatigue* ditekan: kasus tunggal di desa baseline 0 tidak menaikkan status (rasio 99 diabaikan karena di bawah syarat minimal). Dataset juga memungkinkan pengujian kejujuran metrik: metrik yang tak dapat dihitung tidak ditampilkan sebagai angka, melainkan ditulis cara mengukurnya — termasuk satu kasus yang justru membuktikan perbedaan cakupan itu: Rancaekek Kulon berstatus Sinyal tetapi tanggal sinyalnya tetap "belum diukur", karena tabel kecepatan deteksi hanya mengukur aturan rasio.

---

## 10. AI-tool disclosure

- **AI untuk fitur produk:** halaman Analisis memakai LLM **Groq** untuk menerjemahkan ringkasan data menjadi narasi (mode warga/petugas) dan menjawab pertanyaan kesehatan masyarakat; input di-bungkus sebagai data tak tepercaya, dibatasi laju per IP, dan prompt melarang mengarang angka serta menyebut identitas individu.
- **AI untuk pengembangan:** perancangan dan penulisan kode dibantu *AI coding assistant* (mis. Lovable / code agent) dan *AI penulisan* untuk penyusunan dokumen ini. Seluruh output — logika ambang, skenario data, angka, dan teks — diperiksa manual oleh tim: uji otomatis (156 kasus), audit penulisan Indonesia, dan pemverifikasian metrik terhadap data di jalankan berulang.
- Tim tetap bertanggung jawab penuh atas seluruh isi proposal dan mampu menjelaskan tiap keputusan teknis.

---

## Appendix A — Mockup / Prototype
- Prototipe live: https://sidini-surveilans.narasi-nusantara.workers.dev (Dashboard, Peta & Alert, Lapor Warga, Input Puskesmas, Verifikasi, Analisis AI, Data Kasus, Konsep).
- Screenshots: folder `proposal-screenshots/` (tangkapan tiap halaman, termasuk tampilan 390px untuk kanal warga).

## Appendix B — Access instructions
Buka tautan; tanpa kunci API, seluruh halaman kecuali Analisis AI tetap berfungsi. Untuk melihat hasil AI, isi `.env` dengan kunci Groq lalu `npm install && npm run dev`.

## Appendix C — References
- Permenkes No. 1501/Menkes/Per/X/2010 (kriteria & penetapan KLB; batas 24 jam pelaporan & penanggulangan).
- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.
- PMK No. 24 Tahun 2022 (RME: rekam medis elektronik, TTE, audit trail).
- SATUSEHAT / FHIR R4 (rencana interoperabilitas).
- Dataset Dinas Kesehatan Provinsi Jawa Barat (diare per kabupaten/kota; data.go.id & opendata.jabarprov.go.id) — sebagai jangkar level simulasi, berstatus perkiraan acuan.
- GADM 4.1 + Permendagri 72/2019 (batas wilayah, nama kecamatan/desa).
- BPS *Kecamatan … Dalam Angka 2025* (penduduk per kecamatan) — dasar **alokasi proporsional** jumlah penduduk desa di prototipe; hasilnya berstatus **perkiraan** dan menunggu verifikasi Dinkes, bukan angka resmi per desa.

## Appendix D — Dukungan lain
Repo: `C:\Users\User\Downloads\.LOMBA\narasi-nusantara-ai` (branch `fix/audit-sidini`, HEAD `2bd46ef`, sudah ter-push ke `carel/main`). Seluruh 156 uji otomatis hijau; lint 0 error; build produksi sukses.