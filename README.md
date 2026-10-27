# SIDINI — Sistem Peringatan Dini Wabah

**Live:** https://sidini-surveilans.narasi-nusantara.workers.dev/

## Konsep

### Dari pelaporan reaktif menjadi peringatan dini

Prototipe sistem peringatan dini wabah untuk Kabupaten Bandung, Jawa Barat. Batas wilayah, kode kecamatan, dan jumlah penduduk tingkat kabupaten memakai data resmi. Jumlah penduduk tingkat desa di sini adalah alokasi proporsional dari penduduk kecamatan (perkiraan, perlu verifikasi Dinkes), dan seluruh angka kasus penyakit bersifat sintetis untuk keperluan studi kasus.

## Analisis masalah

- **SKDR terlalu lambat untuk bertindak cepat.** SKDR adalah formulir agregat mingguan. Kasus yang menumpuk pada hari pertama dan ketiga baru terlihat di rekap minggu berikutnya, padahal tindakan lapangan harus dimulai hari itu juga.
- **Dua kanal pelaporan, dua kualitas data.** Laporan puskesmas sudah terverifikasi, sedangkan laporan warga banyak berupa perkiraan baru, duplikat, dan laporan yang tidak pernah diverifikasi. Kalau keduanya langsung dijumlahkan, angka alarm ikut membawa kebisingan.
- **Angka tidak otomatis menjadi keputusan.** Petugas dan warga sama-sama kesulitan membaca angka surveilans. Deretan kasus per penyakit per desa masih harus dibaca manual, dan tidak ada yang memberi tahu tindakan berikutnya.

## Alur sistem

1. **Pelaporan** — Puskesmas mengirim kasus terkonfirmasi lewat formulir 6 kolom. Warga mengirim laporan gejala tanpa nama lewat kanal warga.
2. **Verifikasi** — Laporan warga masuk antrean triase dan petugas menyetujui, menyelidiki, atau menolak. Laporan yang belum terverifikasi tidak dihitung sebagai kasus.
3. **Ambang otomatis** — Sistem menghitung baseline 3 minggu, rasio terhadap baseline sendiri, dan insidensi per 100.000 penduduk, lalu menilai tiap penyakit secara terpisah. Lapis harian memakai status Sinyal atau Waspada, label KLB hanya dipakai untuk hasil rekap SKDR mingguan.
4. **Narasi AI** — Ringkasan data disusun di server, lalu dikirim ke Groq LLM dan diubah menjadi penjelasan. Dua mode baca: warga (bahasa sehari-hari) dan petugas (istilah epidemiologi).

## Logika peringatan dan penerimanya

SIDINI memakai dua lapis penandaan yang sengaja dipisahkan, supaya kata "KLB" tidak punya dua arti di dalam sistem yang sama.

### Lapis harian, per desa

- **Sinyal:** rasio kasus terhadap baseline 3 minggu desa itu sendiri mencapai 2x dengan minimal 10 kasus penyakit itu dalam 7 hari, atau insidensi penyakit itu melewati ambang mingguan. Sinyal berarti perlu diperiksa petugas, belum berarti KLB.
- **Waspada:** rasio mencapai 1,5x dengan minimal 3 kasus penyakit itu dalam 7 hari, atau insidensi mencapai 60% ambang. Rasio 1,5x sama dengan yang dipakai di lapis SKDR mingguan.
- **Aman:** belum ada ambang yang terlampaui.

Aturan insidensi tidak memakai syarat kasus minimum, jadi desa kecil bisa naik ke Sinyal dengan kasus sedikit — itulah sebabnya angka penduduk desa ditulis terbuka di tabel referensi.

Rasio di bawah jumlah kasus minimum itu tidak menaikkan status, dan alasannya ditulis di tabel status desa. Syarat ini ada untuk mengurangi alert fatigue: tanpa itu, desa kecil dengan 1 kasus dan baseline 0 terlihat selalu naik dengan rasio 99, sehingga petugas mengejar angka yang tidak berarti.

Insidensi per 100.000 penduduk dihitung menggunakan jumlah penduduk desa dari tabel referensi. Untuk keperluan prototipe ini, nilai penduduk per desa diisi dengan alokasi proporsional dari penduduk kecamatan resmi BPS (estimasi), sumbernya dicatat pada tabel referensi ("perkiraan; perlu verifikasi Dinkes"), bukan angka resmi per desa. Sistem tetap menunjukkan insidensi secara terbuka beserta status sumber datanya.

### Rekap SKDR mingguan, per kecamatan

Di sinilah label KLB dipakai, karena rekap SKDR mingguan yang berwenang menetapkan status tersebut.

Angka "Mgg KLB" menghitung minggu berstatus KLB, sedangkan "Mgg Waspada" menghitung minggu berstatus Waspada. Keduanya angka terpisah dan tidak dijumlahkan.

Status tiap kecamatan diuji dengan tiga kriteria: rasio terhadap baseline sendiri, insidensi per 100.000, dan jumlah kematian. Status Waspada memerlukan minimal 3 kasus penyakit itu dalam periode yang dinilai, dan berlaku sama di lapis harian (7 hari per desa) maupun lapis SKDR (1 minggu per kecamatan). Satu angka untuk semua penyakit. Tanpa syarat ini, 1 kasus melawan baseline yang kecil menghasilkan rasio besar yang tidak bermakna, dan peringatan menyala berulang tanpa informasi baru. Kriteria insidensi dan kematian tidak memakai syarat kasus minimum, dan angka ambangnya sendiri tidak diubah.

Penyakit dengan kasus sedikit per kecamatan memang jarang memicu Waspada. Pada data simulasi sekarang Hepatitis A tidak pernah memicu Waspada dalam minggu 1-39 untuk 2025 maupun 2026, dan Chikungunya hanya satu minggu per tahun. Itu konsekuensi volume kasus pada data simulasi, bukan ambang yang terlalu tinggi, dan parameter simulasi tidak diubah untuk mengubah hasilnya.

Deret mingguan pada prototipe adalah simulasi, dan sekarang dipotong di minggu 39: minggu 40-52 tidak pernah ditampilkan sebagai data karena tidak ada laporan kasus yang masuk pada minggu itu. Semua total dan perbandingan memakai rentang yang sama, sehingga perbandingan antar tahun tidak dipengaruhi panjang rentang.

## Ambang per penyakit

Seluruh ambang dibaca dari satu konfigurasi (`src/data/ambang.ts`). Nilai angkanya tidak diubah, yang ditambahkan hanya catatan sumber dan status verifikasinya.

| Penyakit | Min. kasus KLB | Insidensi minimum | Rasio Waspada | Rasio KLB | Sumber acuan |
| --- | --- | --- | --- | --- | --- |
| DBD | 5 kasus/minggu | 50 per 100.000/minggu | 1.5 kali | 2 kali | Pedoman Penanganan Kejadian Luar Biasa Kemenkes RI.<br>perlu verifikasi acuan Dinkes |
| Diare | 40 kasus/minggu | 100 per 100.000/minggu | 1.5 kali | 2 kali | Belum tercatat dalam pedoman nasional tunggal (ambang operasional).<br>perlu verifikasi acuan Dinkes |
| Chikungunya | 3 kasus/minggu | 15 per 100.000/minggu | 1.5 kali | 2 kali | Belum tercatat dalam pedoman nasional tunggal (ambang operasional).<br>perlu verifikasi acuan Dinkes |
| Hepatitis A | 3 kasus/minggu | 15 per 100.000/minggu | 1.5 kali | 2 kali | Belum tercatat dalam pedoman nasional tunggal (ambang operasional).<br>perlu verifikasi acuan Dinkes |

**Catatan penting:** seluruh baris di atas berstatus perlu verifikasi acuan Dinkes. Angka ambang dipakai apa adanya supaya perbandingan dengan versi sebelumnya tetap sama, tetapi belum disahkan untuk dipakai pada keputusan nyata. Kolom "Min. kasus KLB" hanya berlaku untuk status KLB. Status Waspada tidak memakai kolom itu, melainkan satu syarat bersama untuk semua penyakit: minimal 3 kasus dalam periode yang dinilai, sama di lapis harian dan lapis SKDR.

Angka ambang di tabel ini adalah nilai simulasi. Saat implementasi, angka itu akan ditetapkan bersama Dinkes Kabupaten Bandung, lalu ditulis satu kali di konfigurasi tunggal (`src/data/ambang.ts`). Jumlah penduduk desa di tabel referensi perlakuan sama: kosong sekarang, diisi dari sumber resmi bersama Dinkes sebelum aturan insidensi boleh dipakai.

## Rencana, belum berjalan: ambang relatif untuk penyakit endemik

Untuk penyakit endemik seperti diare, ambang absolut per 100.000 penduduk mudah terlewati sepanjang tahun. Insidensi diare di wilayah padat berada di bawah ambang selama berbulan-bulan, lalu naik dan turun mengikuti musim, dan pada tahun yang lebih lembap ambang itu terlewati hampir setiap minggu. Kalau sistem tetap memakainya apa adanya, puluhan minggu berturut-turut akan berstatus Waspada tanpa ada yang berubah, dan petugas berhenti mempercayai peringatan. Alert fatigue bukan masalah tampilan, ini masalah angka.

Usulan yang belum diterapkan: ambang penyakit endemik dihitung relatif terhadap baseline musiman per kecamatan, yaitu dibandingkan dengan minggu yang sama pada tahun-tahun sebelumnya, bukan dengan angka tetap per 100.000. Dengan begitu "naik" berarti naik dari kebiasaan musiman, dan itulah informasi yang dicari petugas. Ambang absolut tetap dipakai untuk penyakit yang datangnya tidak biasa, seperti DBD.

Ini juga alasan level simulasi diare diturunkan pada versi ini. Dengan ambang absolut dan level simulasi sebesar perkiraan acuan Dinkes, ambang terlewati hampir setiap minggu, sehingga tidak ada lagi informasi di dalam status KLB.

Semua angka dan ambang di atas bersifat simulasi dan belum disahkan Dinkes. Sebelum perubahan apa pun pada ambang, baik absolut maupun relatif, aturan hitungnya perlu ditetapkan bersama Dinkes Kabupaten Bandung, lalu ditulis satu kali di konfigurasi tunggal. Yang disepakati itulah yang dipakai sistem.

## Penerima peringatan

Pada prototipe ini peringatan hanya muncul sebagai banner di dashboard ketika ada yang membuka halaman tersebut. Belum ada push, SMS, WhatsApp, atau email. Laporan warga yang belum terverifikasi tidak pernah sampai ke petugas di luar dashboard.

Pola kanal penerima masih berupa rancangan. Kanal apa yang dipakai, jam berapa sinyal dikirim, dan siapa yang berhak menerimanya perlu keputusan Dinkes sebelum dibangun.

## Peran AI

### AI melakukan

- Mengubah angka tabel menjadi cerita yang bisa dibaca orang awam.
- Menyesuaikan tingkat bahasa sesuai pembaca (warga atau petugas).
- Merangkum rekomendasi tindakan 72 jam per desa.

### AI tidak melakukan

- Menentukan ambang KLB. Ambang dihitung sistem, bukan AI.
- Menggantikan verifikasi petugas.
- Menampilkan identitas individu.

## Privasi dan batas

- **UU PDP No. 27/2022.** Nama pelapor tidak diminta. Kanal warga hanya menyimpan kode desa, bukan alamat lengkap.
- **Agregat untuk publik.** Dashboard, peta, dan analisis AI hanya memakai angka agregat per desa.
- **Login petugas bukan autentikasi.** Dua halaman petugas (input puskesmas dan verifikasi) dijaga kartu masuk, tetapi kredensial contoh tertulis di dalam berkas dan diperiksa di peramban. Siapa pun yang membuka devtools bisa membacanya, dan sesi bisa dihapus dari panel penyimpanan. Yang belum ada: pemeriksaan di server, basis data pengguna, hashing sandi, dan pencadangan. Membuka laporan warga dan membaca seluruh data tetap bisa dilakukan siapa pun tanpa masuk.
- **Ringkasan dibangun di server.** Ringkasan angka disusun pada server dari data kasus, lalu dikirim ke model. Peramban hanya mengirim kasus tambahan miliknya, bukan ringkasan bebas.
- **Teks warga diperlakukan sebagai data.** Isi laporan warga dibungkus dan ditandai sebagai data tak tepercaya di dalam prompt, bukan sebagai perintah, dan jumlah permintaan per alamat dibatasi.
- **Jangan mengarang angka.** Prompt AI melarang angka di luar data, tetapi hasil model tetap perlu dibaca petugas sebelum dipakai.
- **Verifikasi manusia.** Narasi AI adalah bahan awal, keputusan tetap diambil petugas.

## Data

Seluruh data di prototipe ini sintetis dan dibuat dengan PRNG deterministik (seed tetap) agar hasil demo konsisten. Struktur variabel meniru dataset surveilans Indonesia yang umum dipublikasikan, tetapi tidak ada baris yang berasal dari dataset Kaggle asli. Hanya tanggal acuan yang tetap sehingga tren 42 hari dapat direproduksi.

Jumlah penduduk tingkat desa sengaja dibiarkan kosong pada tabel referensi. Prototipe tidak memindahkan angka penduduk kecamatan ke setiap desa, karena langkah itu membuat insidensi per desa terlihat terukur padahal salahnya tidak diketahui. Kolom sumber dan tahun pada tabel tersebut harus diisi manual dari data resmi sebelum insidensi bisa dipakai.

**Ambang dan jumlah penduduk desa adalah nilai simulasi.** Ambang di tabel di atas (rasio, kasus minimum, insidensi) dan jumlah penduduk desa pada tabel referensi belum ditetapkan oleh Dinkes, keduanya berstatus "perlu verifikasi acuan Dinkes" dan sengaja tidak diisi angka. Saat implementasi, angka ambang dan angka penduduk desa harus ditetapkan bersama Dinkes Kabupaten Bandung lebih dulu, lalu diisikan pada konfigurasi tunggal (`src/data/ambang.ts`) dan tabel referensi, bukan ditulis ulang di halaman mana pun.

Level kasus simulasi per penyakit juga buatan, bukan hasil pembacaan laporan. Untuk diare, levelnya justru dibuat lebih rendah dari perkiraan acuan Dinkes Jawa Barat (90.337 kasus/tahun) supaya ambang KLB tidak terlewati setiap minggu, bila kasus dibuat sebesar jangkar penuh, 39 dari 39 minggu di 2026 akan berstatus KLB dan ambang kehilangan makna sebagai penanda. Angka itu adalah level simulasi, bukan perkiraan epidemiologi.

Seluruh angka berasal dari satu snapshot simulasi per 25 Sep 2026. Prototipe ini tidak punya jadwal unggah, jadi setelah tanggal itu tidak ada data baru dan tidak akan ada peringatan bahwa data menjadi basi. Kalau nanti dihubungkan ke sumber data nyata, penanda kedaluwarsa perlu dikembalikan.

Perkiraan acuan 90.337 kasus/tahun untuk diare diambil dari dataset Dinas Kesehatan Jawa Barat per kabupaten/kota (terdaftar di data.go.id dan opendata.jabarprov.go.id, cakupan 2016 sampai 2023). Yang bisa dilacak adalah nama dataset dan penerbitnya, nilai persisnya belum pernah dicocokkan ulang dengan berkas sumber, sehingga di sini disebut perkiraan acuan, bukan angka resmi. Tabel BPS setara untuk 2016 juga mencantumkan catatan bahwa angka DBD dan diare belum fix 100%.

## Metrik keberhasilan

Ukuran keberhasilan yang paling ingin dijawab: apakah sistem membuat petugas bergerak lebih cepat, bukan menambah berkas. Tiga angka berikut dihitung dari data prototipe dan diberi label simulasi di panel Dampak pada dashboard.

- **Keterlambatan pelaporan:** selisih antara tanggal laporan dan tanggal onset pada tiap kasus. Versi prototipe memakai tanggal biasa per hari, jadi rata-ratanya terlihat sangat kecil dan tidak boleh dibandingkan dengan data lapangan.
- **Waktu deteksi:** selisih antara tanggal onset dan tanggal sinyal harian muncul untuk tiap desa.
- **Sinyal lebih awal dari rekap mingguan:** berapa hari sinyal harian muncul sebelum hari penutup minggu ISO yang memuatnya. Asumsinya dinyatakan langsung di panel Dampak, karena hasilnya bergantung pada aturan hitung hari tersebut.

Empat metrik lain sering diklaim sistem surveilans, tetapi belum bisa dihitung dari data prototipe. Yang belum diukur tidak ditampilkan sebagai angka, cara mengukurnya dicantumkan supaya tidak hilang jejaknya.

**Waktu verifikasi laporan warga**

Belum diukur di prototipe. Data kasus hanya menyimpan tanggal onset dan tanggal lapor, tidak ada stempel waktu saat petugas memverifikasi.

**Cara mengukur:** Catat satu kolom waktu verifikasi (jam dan menit) saat status laporan berubah menjadi Terverifikasi di halaman Verifikasi, lalu tampilkan selisihnya terhadap tanggal lapor.

**Waktu tanggap lapis cepat**

Belum diukur di prototipe. Prototipe tidak mencatat peristiwa respons apa pun: tidak ada kolom yang menyatakan kapan petugas menerima tahu, kapan berangkat, dan kapan penanganan selesai.

**Cara mengukur:** Tambahkan stempel waktu terima, berangkat, dan selesai pada tiap sinyal desa, lalu laporkan selisih antar stempel tersebut.

**Kepatuhan pelaporan puskesmas**

Belum diukur di prototipe. Tidak ada jadwal pelaporan per puskesmas di data, sehingga tidak ada angka pembanding.

**Cara mengukur:** Tetapkan jadwal wajib lapor (misalnya setiap hari kerja), hitung jumlah hari tepat waktu per puskesmas, lalu bandingkan dengan jumlah hari kerja.

**Deteksi dini dibanding surveilans rutin**

Belum diukur di prototipe. Tidak ada data surveilans rutin (misalnya rekap bulanan Dinkes) untuk dibandingkan.

**Cara mengukur:** Masukkan rekap bulanan kasus per desa sebagai dataset terpisah, lalu bandingkan tanggal sinyal pertama lapis harian dengan tanggal bulanan ketika desa itu tercatat.

## Hubungan dengan SKDR nasional

SKDR adalah Sistem Kewaspadaan Dini dan Respon milik Kementerian Kesehatan Republik Indonesia. Di lapangan SKDR berupa formulir agregat mingguan per kecamatan per penyakit, bukan catatan kasus per pasien.

SIDINI tidak menggantikan SKDR dan tidak mengubah angka yang masuk ke SKDR. SIDINI menambah lapis pengamatan harian per desa di atas rekap mingguan itu, supaya kenaikan terlihat sebelum formulir mingguan dikirim.

Karena itu tiga hal berikut penting. Pertama, status KLB tetap mengikuti aturan nasional dan ditetapkan pada rekap mingguan, lapis harian hanya memberi peringatan awal. Kedua, ambang operasional di prototipe ini perlu diverifikasi terhadap pedoman Dinkes sebelum dipakai, dan nilainya sengaja tidak diubah agar perbandingan antar versi tetap terbaca. Ketiga, bila nanti kedua sistem ini ditukar datanya, formatnya mengikuti SKDR dan e-Puskesmas yang sudah ada, bukan format baru.

Lapis harian dan lapis SKDR mingguan pada prototipe ini dibangkitkan sebagai dua simulasi terpisah dan belum direkonsiliasi, pada implementasi nyata keduanya bersumber dari data laporan yang sama.

**Dasar acuan dan batas.** Kriteria KLB dalam Permenkes No. 1501/Menkes/Per/X/2010 Pasal 6 mencakup kenaikan kejadian kesakitan dua kali atau lebih dibanding periode sebelumnya. Ambang KLB 2x di prototipe ini mengacu pada kriteria itu, dengan satu perbedaan: prototipe membandingkan dengan rata-rata 8 minggu sebelumnya, sedangkan regulasi membandingkan dengan periode sebelumnya. Penetapan KLB dilakukan oleh Kepala Dinas Kesehatan kabupaten/kota, Kepala Dinas Kesehatan provinsi, atau Menteri Kesehatan (Pasal 7), bukan oleh sistem ini. SIDINI hanya memberi sinyal untuk penyelidikan epidemiologi. Tingkat Waspada (1,5x), syarat kasus minimum, ambang insidensi per 100.000, dan aturan kematian adalah parameter rancangan prototipe yang belum diverifikasi dan perlu ditetapkan bersama Dinkes. Regulasi yang sama menetapkan batas 24 jam untuk pelaporan kasus (Pasal 16) dan untuk penanggulangan dini sejak kriteria KLB terpenuhi (Pasal 14). Batas ini menjadi acuan target metrik keterlambatan lapor dan waktu respons, pada prototipe, waktu respons belum diukur.

## Rencana integrasi puskesmas

**Status: rancangan, belum berjalan.** Yang ada sekarang hanyalah formulir enam kolom di halaman Input Kasus Puskesmas yang menambah kasus ke sesi demonstrasi di memori peramban. Data itu hilang saat halaman ditutup, dan tidak pernah masuk ke sistem mana pun.

Arah yang direncanakan:

- Variabel formulir dibuat mengikuti pola variabel SKDR dan e-Puskesmas, supaya pertukaran data tidak menuntut pengetikan ulang di kedua sisi.
- Penyimpanan lokal di perangkat puskesmas, sehingga laporan tetap dapat masuk saat jaringan terputus dan dikirim ulang setelah koneksi kembali.
- Peran puskesmas sebagai sumber terverifikasi, sedangkan laporan warga masih perlu diverifikasi petugas.

Yang belum ada dan harus dibangun lebih dulu: autentikasi petugas, penyimpanan antarwaktu, jalur persetujuan, serta kontrak format antar sistem. Jumlah penduduk desa juga harus tersedia, karena tanpa itu insidensi per desa tidak bisa dihitung.

## Menjalankan

1. Salin berkas contoh env lalu isi kunci API Groq.
2. Pasang dependensi dan jalankan server pengembangan.
3. Buka halaman Tanya AI dan tekan tombol Tanyakan.

```sh
cp .env.example .env
npm install
npm run dev
```

Tanpa kunci API, halaman lain tetap berfungsi. Hanya fitur analisis AI yang menampilkan pesan kunci belum tersedia.

## Teknologi

- TanStack Start (SSR + file routing)
- React 19
- TypeScript strict
- Tailwind CSS 4 (token oklch)
- Recharts
- Zod
- Groq LLM API
- Lucide icons
