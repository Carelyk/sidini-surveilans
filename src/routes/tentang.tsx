import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Cpu,
  Database,
  FileCode2,
  FileText,
  FlaskConical,
  Lock,
  Network,
  Plug,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  AMBANG_SKDR,
  ATURAN_HARIAN,
  ATURAN_WASPADA,
  KASUS_MIN_WASPADA,
  KASUS_MIN_WASPADA_SKDR,
} from "@/data/ambang";
import { JUMLAH_MINGGU } from "@/data/skdr";
import { MINGGU_SKDR_TERAKHIR } from "@/lib/skdr";
import { PENYAKIT } from "@/data/skdr";
import { METRIK_BELUM_TERUKUR } from "@/lib/dampak";

export const Route = createFileRoute("/tentang")({
  head: () => ({
    meta: [
      { title: "Konsep Sistem | SIDINI" },
      {
        name: "description",
        content:
          "Penjelasan konsep SIDINI: masalah, alur data, peran AI naratif, batas etika, dan cara menjalankan.",
      },
      { property: "og:title", content: "Konsep Sistem | SIDINI" },
      {
        property: "og:description",
        content: "Dari pelaporan reaktif menjadi peringatan dini: wabah.",
      },
    ],
  }),
  component: Tentang,
});

function Tentang() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Konsep</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          Dari pelaporan reaktif menjadi peringatan dini
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Prototipe sistem peringatan dini wabah untuk Kabupaten Bandung, Jawa Barat. Batas wilayah,
          kode kecamatan, dan jumlah penduduk tingkat kabupaten memakai data resmi; jumlah penduduk
          tingkat desa belum tersedia di prototipe ini, dan seluruh angka kasus penyakit bersifat
          sintetis untuk keperluan studi kasus.
        </p>
      </header>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-warning-text" /> Analisis masalah
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">SKDR terlalu lambat untuk bertindak cepat.</strong>{" "}
            SKDR adalah formulir agregat mingguan. Kasus yang menumpuk pada hari pertama dan ketiga
            baru terlihat di rekap minggu berikutnya, padahal tindakan lapangan harus dimulai hari
            itu juga.
          </li>
          <li>
            <strong className="text-foreground">Dua kanal pelaporan, dua kualitas data.</strong>{" "}
            Laporan puskesmas sudah terverifikasi, sedangkan laporan warga banyak berupa perkiraan
            baru, duplikat, dan laporan yang tidak pernah diverifikasi. Kalau keduanya langsung
            dijumlahkan, angka alarm ikut membawa kebisingan.
          </li>
          <li>
            <strong className="text-foreground">Angka tidak otomatis menjadi keputusan.</strong>{" "}
            Petugas dan warga sama-sama kesulitan membaca angka surveilans. Deretan kasus per
            penyakit per desa masih harus dibaca manual, dan tidak ada yang memberi tahu tindakan
            berikutnya.
          </li>
        </ul>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Network className="size-4 text-primary" /> Alur sistem
        </h2>
        <div className="mt-4 space-y-3">
          {[
            {
              n: "1",
              j: "Pelaporan",
              t: "Puskesmas mengirim kasus terkonfirmasi lewat formulir 6 kolom. Warga mengirim laporan gejala tanpa nama lewat kanal warga.",
            },
            {
              n: "2",
              j: "Verifikasi",
              t: "Laporan warga masuk antrean triase dan petugas menyetujui, menyelidiki, atau menolak. Laporan yang belum terverifikasi tidak dihitung sebagai kasus.",
            },
            {
              n: "3",
              j: "Ambang otomatis",
              t: "Sistem menghitung baseline 3 minggu, rasio terhadap baseline sendiri, dan insidensi per 100.000 penduduk, lalu menilai tiap penyakit secara terpisah. Lapis harian memakai status Sinyal atau Waspada; label KLB hanya dipakai untuk hasil rekap SKDR mingguan.",
            },
            {
              n: "4",
              j: "Narasi AI",
              t: "Ringkasan data disusun di server, lalu dikirim ke Groq LLM dan diubah menjadi penjelasan. Dua mode baca: warga (bahasa sehari-hari) dan petugas (istilah epidemiologi).",
            },
          ].map((s) => (
            <div key={s.n} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold">{s.j}</p>
                <p className="text-sm text-muted-foreground">{s.t}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BellRing className="size-4 text-primary" /> Logika peringatan dan penerimanya
        </h2>
        <div className="mt-4 space-y-4 text-sm text-muted-foreground">
          <p>
            SIDINI memakai dua lapis penandaan yang sengaja dipisahkan, supaya kata "KLB" tidak
            punya dua arti di dalam sistem yang sama.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="font-semibold text-foreground">Lapis harian, per desa</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">Sinyal</strong>: rasio kasus terhadap baseline
                  3 minggu desa itu sendiri mencapai 2x, dengan minimal{" "}
                  {ATURAN_HARIAN.kasusMinSinyal}
                  kasus penyakit itu dalam 7 hari. Sinyal berarti perlu diperiksa petugas, belum
                  berarti KLB.
                </li>
                <li>
                  <strong className="text-foreground">Waspada</strong>: rasio mencapai 1,5x, dengan
                  minimal {KASUS_MIN_WASPADA} kasus penyakit itu dalam 7 hari. Angka ini sama dengan
                  yang dipakai di lapis SKDR mingguan.
                </li>
                <li>
                  <strong className="text-foreground">Aman</strong>: belum ada ambang yang
                  terlampaui.
                </li>
                <li>
                  Rasio di bawah jumlah kasus minimum itu tidak menaikkan status, dan alasannya
                  ditulis di tabel status desa. Syarat ini ada untuk mengurangi alert fatigue: tanpa
                  itu, desa kecil dengan 1 kasus dan baseline 0 terlihat selalu naik dengan rasio
                  99, sehingga petugas mengejar angka yang tidak berarti.
                </li>
                <li>
                  Insidensi per 100.000 penduduk baru dihitung bila jumlah penduduk desa diisi pada
                  tabel referensi. Selama kolom itu kosong, sistem menulis "penduduk belum tersedia"
                  dan tidak memakai ambang insidensi.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="font-semibold text-foreground">Rekap SKDR mingguan, per kecamatan</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  Di sinilah label <strong className="text-foreground">KLB</strong> dipakai, karena
                  rekap SKDR mingguan yang berwenang menetapkan status tersebut.
                </li>
                <li>
                  Angka "Mgg KLB" menghitung minggu berstatus KLB, sedangkan "Mgg Waspada"
                  menghitung minggu berstatus Waspada. Keduanya angka terpisah dan tidak
                  dijumlahkan.
                </li>
                <li>
                  Status tiap kecamatan diuji dengan tiga kriteria: rasio terhadap baseline sendiri,
                  insidensi per 100.000, dan jumlah kematian.{" "}
                  {ATURAN_WASPADA.alasan} Kriteria insidensi dan kematian tidak memakai syarat kasus
                  minimum, dan angka ambangnya sendiri tidak diubah.
                </li>
                <li>
                  Penyakit dengan kasus sedikit per kecamatan memang jarang memicu Waspada. Pada
                  data simulasi sekarang Hepatitis A tidak pernah memicu Waspada dalam minggu 1-39
                  untuk 2025 maupun 2026, dan Chikungunya hanya satu minggu per tahun. Itu
                  konsekuensi volume kasus pada data simulasi, bukan ambang yang terlalu tinggi, dan
                  parameter simulasi tidak diubah untuk mengubah hasilnya.
                </li>
                <li>
                  Deret mingguan pada prototipe adalah simulasi, dan sekarang dipotong di minggu{" "}
                  {MINGGU_SKDR_TERAKHIR}: minggu {MINGGU_SKDR_TERAKHIR + 1}-{JUMLAH_MINGGU} tidak
                  pernah ditampilkan sebagai data karena tidak ada laporan kasus yang masuk pada
                  minggu itu. Semua total dan perbandingan memakai rentang yang sama, sehingga
                  perbandingan antar tahun tidak dipengaruhi panjang rentang.
                </li>
              </ul>
            </div>
          </div>

          <div>
            <p className="font-semibold text-foreground">Ambang per penyakit</p>
            <p className="mt-1">
              Seluruh ambang dibaca dari satu konfigurasi (src/data/ambang.ts). Nilai angkanya tidak
              diubah; yang ditambahkan hanya catatan sumber dan status verifikasinya.
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Penyakit</th>
                    <th className="px-3 py-2 font-semibold">Min. kasus KLB</th>
                    <th className="px-3 py-2 font-semibold">Insidensi minimum</th>
                    <th className="px-3 py-2 font-semibold">Rasio Waspada</th>
                    <th className="px-3 py-2 font-semibold">Rasio KLB</th>
                    <th className="px-3 py-2 font-semibold">Sumber acuan</th>
                  </tr>
                </thead>
                <tbody>
                  {PENYAKIT.map((p) => {
                    const a = AMBANG_SKDR[p];
                    return (
                      <tr key={p} className="border-t border-border align-top">
                        <td className="px-3 py-2 font-medium text-foreground">{p}</td>
                        <td className="px-3 py-2">{a.kasusMin} kasus/minggu</td>
                        <td className="px-3 py-2">{a.insidensiMin} per 100.000/minggu</td>
                        <td className="px-3 py-2">{a.rasioWaspada} kali</td>
                        <td className="px-3 py-2">{a.rasioKLB} kali</td>
                        <td className="px-3 py-2 text-xs">
                          {a.sumber}
                          <span className="mt-1 block text-warning-text">{a.statusSumber}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs">
              Catatan penting: seluruh baris di atas berstatus perlu verifikasi acuan Dinkes. Angka
              ambang dipakai apa adanya supaya perbandingan dengan versi sebelumnya tetap sama,
              tetapi belum disahkan untuk dipakai pada keputusan nyata. Kolom "Min. kasus KLB" hanya
              berlaku untuk status KLB. Status Waspada tidak memakai kolom itu, melainkan satu
              syarat bersama untuk semua penyakit: minimal {KASUS_MIN_WASPADA_SKDR} kasus dalam
              periode yang dinilai, sama di lapis harian dan lapis SKDR.
            </p>
            <p className="mt-2 text-xs">
              Angka ambang di tabel ini adalah{" "}
              <strong className="text-foreground">nilai simulasi</strong>. Saat implementasi, angka
              itu akan ditetapkan bersama Dinkes Kabupaten Bandung, lalu ditulis satu kali di
              konfigurasi tunggal (
              <code className="rounded bg-secondary px-1">src/data/ambang.ts</code>). Jumlah
              penduduk desa di tabel referensi perlakuan sama: kosong sekarang, diisi dari sumber
              resmi bersama Dinkes sebelum aturan insidensi boleh dipakai.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">
              Rencana, belum berjalan: ambang relatif untuk penyakit endemik
            </p>
            <p className="mt-1">
              Untuk penyakit endemik seperti diare, ambang absolut per 100.000 penduduk mudah
              terlewati sepanjang tahun. Insidensi diare di wilayah padat berada di bawah ambang
              selama berbulan-bulan, lalu naik dan turun mengikuti musim, dan pada tahun yang lebih
              lembap ambang itu terlewati hampir setiap minggu. Kalau sistem tetap memakainya apa
              adanya, puluhan minggu berturut-turut akan berstatus Waspada tanpa ada yang berubah,
              dan petugas berhenti mempercayai peringatan. Alert fatigue bukan masalah tampilan, ini
              masalah angka.
            </p>
            <p className="mt-1">
              Usulan yang belum diterapkan: ambang penyakit endemik dihitung relatif terhadap
              baseline musiman per kecamatan, yaitu dibandingkan dengan minggu yang sama pada
              tahun-tahun sebelumnya, bukan dengan angka tetap per 100.000. Dengan begitu "naik"
              berarti naik dari kebiasaan musiman, dan itulah informasi yang dicari petugas. Ambang
              absolut tetap dipakai untuk penyakit yang datangnya tidak biasa, seperti DBD.
            </p>
            <p className="mt-1">
              Ini juga alasan level simulasi diare diturunkan pada versi ini. Dengan ambang absolut
              dan level simulasi sebesar perkiraan acuan Dinkes, ambang terlewati hampir setiap
              minggu, sehingga tidak ada lagi informasi di dalam status KLB.
            </p>
            <p className="mt-1">
              Semua angka dan ambang di atas bersifat simulasi dan belum disahkan Dinkes. Sebelum
              perubahan apa pun pada ambang, baik absolut maupun relatif, aturan hitungnya perlu
              ditetapkan bersama Dinkes Kabupaten Bandung, lalu ditulis satu kali di konfigurasi
              tunggal. Yang disepakati itulah yang dipakai sistem.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">Penerima peringatan</p>
            <p className="mt-1">
              Pada prototipe ini peringatan hanya muncul sebagai banner di dashboard ketika ada yang
              membuka halaman tersebut. Belum ada push, SMS, WhatsApp, atau email. Laporan warga
              yang belum terverifikasi tidak pernah sampai ke petugas di luar dashboard.
            </p>
            <p className="mt-1">
              Pola kanal penerima masih berupa rancangan. Kanal apa yang dipakai, jam berapa sinyal
              dikirim, dan siapa yang berhak menerimanya perlu keputusan Dinkes sebelum dibangun.
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Cpu className="size-4 text-primary" /> Peran AI
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-success/40 bg-success/10 p-4">
            <p className="text-sm font-semibold text-success-text">AI melakukan</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Mengubah angka tabel menjadi cerita yang bisa dibaca orang awam.</li>
              <li>Menyesuaikan tingkat bahasa sesuai pembaca (warga atau petugas).</li>
              <li>Merangkum rekomendasi tindakan 72 jam per desa.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">AI tidak melakukan</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Menentukan ambang KLB. Ambang dihitung sistem, bukan AI.</li>
              <li>Menggantikan verifikasi petugas.</li>
              <li>Menampilkan identitas individu.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Lock className="size-4 text-primary" /> Privasi dan batas
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">UU PDP No. 27/2022.</strong> Nama pelapor tidak
            diminta. Kanal warga hanya menyimpan kode desa, bukan alamat lengkap.
          </li>
          <li>
            <strong className="text-foreground">Agregat untuk publik.</strong> Dashboard, peta, dan
            analisis AI hanya memakai angka agregat per desa.
          </li>
          <li>
            <strong className="text-foreground">Belum ada autentikasi.</strong> Prototipe ini tidak
            memiliki login, sehingga siapa pun yang membuka alamatnya dapat mengirim laporan,
            memverifikasi, dan membaca seluruh data. Pada sistem nyata, halaman petugas wajib berada
            di balik autentikasi dan data individual tidak boleh keluar dari peran petugas.
          </li>
          <li>
            <strong className="text-foreground">Ringkasan dibangun di server.</strong> Ringkasan
            angka disusun pada server dari data kasus, lalu dikirim ke model. Peramban hanya
            mengirim kasus tambahan miliknya, bukan ringkasan bebas.
          </li>
          <li>
            <strong className="text-foreground">Teks warga diperlakukan sebagai data.</strong>
            Isi laporan warga dibungkus dan ditandai sebagai data tak tepercaya di dalam prompt,
            bukan sebagai perintah, dan jumlah permintaan per alamat dibatasi.
          </li>
          <li>
            <strong className="text-foreground">Jangan mengarang angka.</strong> Prompt AI melarang
            angka di luar data, tetapi hasil model tetap perlu dibaca petugas sebelum dipakai.
          </li>
          <li>
            <strong className="text-foreground">Verifikasi manusia.</strong> Narasi AI adalah bahan
            awal; keputusan tetap diambil petugas.
          </li>
        </ul>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Database className="size-4 text-primary" /> Data
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Seluruh data di prototipe ini sintetis dan dibuat dengan PRNG deterministik (seed tetap)
          agar hasil demo konsisten. Struktur variabel meniru dataset surveilans Indonesia yang umum
          dipublikasikan, tetapi tidak ada baris yang berasal dari dataset Kaggle asli. Hanya
          tanggal acuan yang tetap sehingga tren 42 hari dapat direproduksi.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Jumlah penduduk tingkat desa sengaja dibiarkan kosong pada tabel referensi. Prototipe
          tidak memindahkan angka penduduk kecamatan ke setiap desa, karena langkah itu membuat
          insidensi per desa terlihat terukur padahal salahnya tidak diketahui. Kolom sumber dan
          tahun pada tabel tersebut harus diisi manual dari data resmi sebelum insidensi bisa
          dipakai.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <strong className="text-foreground">
            Ambang dan jumlah penduduk desa adalah nilai simulasi.
          </strong>{" "}
          Ambang di tabel di atas (rasio, kasus minimum, insidensi) dan jumlah penduduk desa pada
          tabel referensi belum ditetapkan oleh Dinkes; keduanya berstatus &ldquo;perlu verifikasi
          acuan Dinkes&rdquo; dan sengaja tidak diisi angka. Saat implementasi, angka ambang dan
          angka penduduk desa harus ditetapkan bersama Dinkes Kabupaten Bandung lebih dulu, lalu
          diisikan pada konfigurasi tunggal (
          <code className="rounded bg-secondary px-1">src/data/ambang.ts</code>) dan tabel
          referensi, bukan ditulis ulang di halaman mana pun.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Level kasus simulasi per penyakit juga buatan, bukan hasil pembacaan laporan. Untuk diare,
          levelnya justru dibuat lebih rendah dari perkiraan acuan Dinkes Jawa Barat (90.337
          kasus/tahun) supaya ambang KLB tidak terlewati setiap minggu; bila kasus dibuat sebesar
          jangkar penuh, 39 dari 39 minggu di 2026 akan berstatus KLB dan ambang kehilangan makna
          sebagai penanda. Angka itu adalah level simulasi, bukan perkiraan epidemiologi.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Seluruh angka berasal dari satu snapshot simulasi per 25 Sep 2026. Prototipe ini tidak
          punya jadwal unggah, jadi setelah tanggal itu tidak ada data baru dan tidak akan ada
          peringatan bahwa data menjadi basi. Kalau nanti dihubungkan ke sumber data nyata, penanda
          kedaluwarsa perlu dikembalikan.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Perkiraan acuan 90.337 kasus/tahun untuk diare diambil dari dataset Dinas Kesehatan Jawa
          Barat per kabupaten/kota (terdaftar di data.go.id dan opendata.jabarprov.go.id, cakupan
          2016 sampai 2023). Yang bisa dilacak adalah nama dataset dan penerbitnya; nilai persisnya
          belum pernah dicocokkan ulang dengan berkas sumber, sehingga di sini disebut perkiraan
          acuan, bukan angka resmi. Tabel BPS setara untuk 2016 juga mencantumkan catatan bahwa
          angka DBD dan diare belum fix 100%.
        </p>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="size-4 text-primary" /> Metrik keberhasilan
        </h2>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>
            Ukuran keberhasilan yang paling ingin dijawab: apakah sistem membuat petugas bergerak
            lebih cepat, bukan menambah berkas. Tiga angka berikut dihitung dari data prototipe dan
            diberi label simulasi di panel Dampak pada dashboard.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-foreground">Keterlambatan pelaporan</strong>: selisih antara
              tanggal laporan dan tanggal onset pada tiap kasus. Versi prototipe memakai tanggal
              biasa per hari, jadi rata-ratanya terlihat sangat kecil dan tidak boleh dibandingkan
              dengan data lapangan.
            </li>
            <li>
              <strong className="text-foreground">Waktu deteksi</strong>: selisih antara tanggal
              onset dan tanggal sinyal harian muncul untuk tiap desa.
            </li>
            <li>
              <strong className="text-foreground">Sinyal lebih awal dari rekap mingguan</strong>:
              berapa hari sinyal harian muncul sebelum hari penutup minggu ISO yang memuatnya.
              Asumsinya dinyatakan langsung di panel Dampak, karena hasilnya bergantung pada aturan
              hitung hari tersebut.
            </li>
          </ul>
          <p>
            Empat metrik lain sering diklaim sistem surveilans, tetapi belum bisa dihitung dari data
            prototipe. Yang belum diukur tidak ditampilkan sebagai angka; cara mengukurnya
            dicantumkan supaya tidak hilang jejaknya.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {METRIK_BELUM_TERUKUR.map((m) => (
              <li key={m.nama}>
                <strong className="text-foreground">{m.nama}</strong>
                <span className="mt-0.5 block">Belum diukur di prototipe. {m.alasan}</span>
                <span className="mt-0.5 block text-xs">Cara mengukur: {m.caraMengukur}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileText className="size-4 text-primary" /> Hubungan dengan SKDR nasional
        </h2>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>
            SKDR adalah Sistem Kewaspadaan Dini dan Respon milik Kementerian Kesehatan Republik
            Indonesia. Di lapangan SKDR berupa formulir agregat mingguan per kecamatan per penyakit,
            bukan catatan kasus per pasien.
          </p>
          <p>
            SIDINI tidak menggantikan SKDR dan tidak mengubah angka yang masuk ke SKDR. SIDINI
            menambah lapis pengamatan harian per desa di atas rekap mingguan itu, supaya kenaikan
            terlihat sebelum formulir mingguan dikirim.
          </p>
          <p>
            Karena itu tiga hal berikut penting. Pertama, status KLB tetap mengikuti aturan nasional
            dan ditetapkan pada rekap mingguan; lapis harian hanya memberi peringatan awal. Kedua,
            ambang operasional di prototipe ini perlu diverifikasi terhadap pedoman Dinkes sebelum
            dipakai, dan nilainya sengaja tidak diubah agar perbandingan antar versi tetap terbaca.
            Ketiga, bila nanti kedua sistem ini ditukar datanya, formatnya mengikuti SKDR dan
            e-Puskesmas yang sudah ada, bukan format baru.
          </p>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Plug className="size-4 text-primary" /> Rencana integrasi puskesmas
        </h2>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Status: rancangan, belum berjalan.</strong> Yang ada
            sekarang hanyalah formulir enam kolom di halaman
            <Link to="/puskesmas" className="font-medium text-primary underline">
              Input Kasus Puskesmas
            </Link>{" "}
            yang menambah kasus ke sesi demonstrasi di memori peramban. Data itu hilang saat halaman
            ditutup, dan tidak pernah masuk ke sistem mana pun.
          </p>
          <p>Arah yang direncanakan:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Variabel formulir dibuat mengikuti pola variabel SKDR dan e-Puskesmas, supaya
              pertukaran data tidak menuntut pengetikan ulang di kedua sisi.
            </li>
            <li>
              Penyimpanan lokal di perangkat puskesmas, sehingga laporan tetap dapat masuk saat
              jaringan terputus dan dikirim ulang setelah koneksi kembali.
            </li>
            <li>
              Peran puskesmas sebagai sumber terverifikasi, sedangkan laporan warga masih perlu
              diverifikasi petugas.
            </li>
          </ul>
          <p>
            Yang belum ada dan harus dibangun lebih dulu: autentikasi petugas, penyimpanan
            antarwaktu, jalur persetujuan, serta kontrak format antar sistem. Jumlah penduduk desa
            juga harus tersedia, karena tanpa itu insidensi per desa tidak bisa dihitung.
          </p>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FlaskConical className="size-4 text-primary" /> Menjalankan
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Salin berkas contoh env lalu isi kunci API Groq.</li>
          <li>Pasang dependensi dan jalankan server pengembangan.</li>
          <li>Buka halaman Tanya AI dan tekan tombol Tanyakan.</li>
        </ol>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background/50 p-3 font-mono text-[11px] text-muted-foreground">
          {`cp .env.example .env\nnpm install\nnpm run dev`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Tanpa kunci API, halaman lain tetap berfungsi. Hanya fitur analisis AI yang menampilkan
          pesan kunci belum tersedia.
        </p>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileCode2 className="size-4 text-primary" /> Teknologi
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            "TanStack Start (SSR + file routing)",
            "React 19",
            "TypeScript strict",
            "Tailwind CSS 4 (token oklch)",
            "Recharts",
            "Zod",
            "Groq LLM API",
            "Lucide icons",
          ].map((t) => (
            <li
              key={t}
              className="rounded-full border border-border bg-secondary px-3 py-1.5 text-muted-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-success-text" />
          Seluruh data kasus bersifat sintetis. Prototipe studi kasus.
        </div>
        <Link
          to="/analisis"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Users className="size-4" /> Coba analisis AI <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
