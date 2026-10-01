import { useMemo } from "react";
import { Clock, Gauge, Info, TriangleAlert } from "lucide-react";

import { AlatTabel } from "@/components/AlatTabel";
import { TANGGAL_ACUAN, type Kasus } from "@/data/dataset";
import { formatTanggal } from "@/data/kronologi";
import { kasusValid, statusPerDesa } from "@/lib/analitik";
import { METRIK_BELUM_TERUKUR, keterlambatanLapor, waktuDeteksi } from "@/lib/dampak";

/**
 * Panel dampak: seberapa cepat lapis harian melihat masalah, dan seberapa jauh
 * lebih cepat dibanding rekap mingguan.
 *
 * Tiga aturan yang dipegang panel ini:
 *
 *  1) Tidak ada angka yang dikarang. Metrik yang tidak bisa dihitung dari data
 *     yang ada ditulis "belum diukur", lalu dijelaskan apa yang perlu dicatat.
 *  2) Semua angka berasal dari data simulasi, jadi panel ini diberi label
 *     "simulasi" di judulnya, bukan di catatan kecil.
 *  3) Asumsi perhitungan ditulis di panel: pembaca harus bisa menghitung ulang
 *     sendiri kalau meragukan angkanya.
 */
export function PanelDampak({ kasus }: { kasus: Kasus[] }) {
  const valid = useMemo(() => kasusValid(kasus), [kasus]);
  const status = useMemo(() => statusPerDesa(valid), [valid]);
  const keterlambatan = useMemo(() => keterlambatanLapor(valid), [valid]);
  const deteksi = useMemo(() => waktuDeteksi(valid, status), [valid, status]);

  const adaDeteksi = deteksi.length > 0;

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">Kecepatan deteksi &amp; keterlambatan lapor</h3>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning">
          <TriangleAlert className="size-3" aria-hidden /> Data simulasi
        </p>
      </div>

      {/* --- Keterlambatan pelaporan --- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AngkaMini
          icon={Clock}
          label="Rata-rata keterlambatan lapor"
          nilai={keterlambatan.jumlah > 0 ? `${keterlambatan.rata} hari` : "belum diukur"}
          ket={
            keterlambatan.jumlah > 0
              ? `${keterlambatan.jumlah} kasus diukur, dari ${formatTanggal(TANGGAL_ACUAN)} sampai 41 hari sebelumnya`
              : "Belum ada kasus yang bisa diukur"
          }
        />
        <AngkaMini
          icon={Clock}
          label="Median keterlambatan"
          nilai={keterlambatan.jumlah > 0 ? `${keterlambatan.median} hari` : "belum diukur"}
          ket="Separuh kasus dilapor pada atau sebelum selisih ini"
        />
        <AngkaMini
          icon={Clock}
          label="90% kasus dilapor dalam"
          nilai={keterlambatan.jumlah > 0 ? `${keterlambatan.p90} hari` : "belum diukur"}
          ket={`Paling lambat ${keterlambatan.jumlah > 0 ? `${keterlambatan.maks} hari` : "-"}`}
        />
        <AngkaMini
          icon={Gauge}
          label="Desa dengan sinyal yang bisa ditanggalkan"
          nilai={
            deteksi.filter((x) => x.tanggalSinyal !== null && !x.tepiJendela).length === 0
              ? "belum diukur"
              : `${deteksi.filter((x) => x.tanggalSinyal !== null && !x.tepiJendela).length} / ${deteksi.length}`
          }
          ket="Sisa desa sinyalnya terpicu aturan insidensi, atau sudah aktif sebelum jendela observasi dimulai"
        />
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        <span className="text-justify">
          Keterlambatan lapor di sini adalah <strong>proxy</strong>: yang diukur hanya jarak antara
          tanggal onset gejala dan tanggal laporan, bukan waktu tanggap petugas. Yang kedua butuh
          stempel waktu peristiwa yang belum ada di prototipe.
        </span>
      </p>

      {/* --- Kapan sinyal harian muncul --- */}
      <div className="grid gap-4">
        <AlatTabel
          baris={deteksi}
          nama="kecepatan-deteksi-desa"
          rowKey={(x) => x.kode}
          judul={<span className="text-sm font-semibold">Kapan sinyal harian muncul per desa</span>}
          keterangan={
            <div className="space-y-1 text-justify text-xs text-muted-foreground">
              <p>
                Tanggal sinyal adalah hari pertama jumlah kasus 7 hari desa itu melewati ambang
                rasio terhadap baseline, memakai ambang penyakit yang sama dengan tabel status per
                desa di atas. Desa yang badge Sinyalnya muncul dari aturan insidensi tidak bisa
                ditanggalkan dengan cara ini, jadi barisnya ditulis &ldquo;belum diukur&rdquo; --
                bukan diberi tanggal hasil tebakan.
              </p>
              <p>
                <strong className="font-semibold text-foreground">
                  Asumsi &ldquo;lebih awal&rdquo;:
                </strong>{" "}
                rekap SKDR mingguan baru lengkap pada hari Minggu yang menutup minggu ISO.
                Selisihnya dihitung dari tanggal sinyal sampai hari Minggu itu, jadi nilainya selalu
                antara 0 dan 6 hari. Kalau rekap justru diterbitkan pada hari kerja berikutnya,
                angka sebenarnya menjadi lebih besar.
              </p>
            </div>
          }
          kolom={[
            {
              kunci: "desa",
              judul: "Desa",
              cari: (x) => `${x.desa} ${x.kecamatan} ${x.penyakit}`,
              nilai: (x) => x.desa,
              render: (x) => (
                <>
                  <span className="font-medium">{x.desa}</span>
                  <span className="block text-xs text-muted-foreground">
                    {x.kecamatan} &middot; pemicu {x.penyakit}
                  </span>
                </>
              ),
            },
            {
              kunci: "sinyal",
              judul: "Tanggal sinyal",
              cari: (x) => x.tanggalSinyal ?? "belum diukur",
              nilai: (x) => (x.tanggalSinyal ? formatTanggal(x.tanggalSinyal) : "belum diukur"),
            },
            {
              kunci: "kasus",
              judul: "Kasus saat sinyal",
              angka: true,
              nilai: (x) => String(x.kasusSaatSinyal),
            },
            {
              kunci: "lebihAwal",
              judul: "Lebih awal dari rekap mingguan",
              cari: (x) => (x.hariLebihAwal === null ? "belum diukur" : String(x.hariLebihAwal)),
              nilai: (x) => (x.hariLebihAwal === null ? "belum diukur" : `${x.hariLebihAwal} hari`),
              render: (x) =>
                x.hariLebihAwal === null ? (
                  <span className="text-xs text-muted-foreground">belum diukur</span>
                ) : (
                  <span className="font-medium">{x.hariLebihAwal} hari</span>
                ),
            },
          ]}
        />
      </div>

      {!adaDeteksi && (
        <p className="rounded-lg border border-border bg-secondary/40 p-3 text-justify text-xs text-muted-foreground">
          Tidak ada desa yang berstatus sinyal pada 7 hari terakhir, jadi waktu kemunculan sinyal
          tidak bisa ditampilkan. Angka tidak diisi dengan perkiraan.
        </p>
      )}

      {adaCatatanTidakTerukur(deteksi) && (
        <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <p className="font-semibold">Sebagian baris belum bisa diukur, dan alasannya:</p>
          <ul className="list-disc space-y-0.5 pl-4 text-justify">
            {deteksi
              .filter((x) => x.catatan !== null)
              .map((x) => (
                <li key={x.kode}>
                  <span className="font-medium">{x.desa}</span> &mdash; {x.catatan}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* --- Yang belum bisa diukur --- */}
      <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-sm font-semibold">Metrik yang belum diukur di prototipe</p>
        <p className="text-justify text-xs text-muted-foreground">
          Metrik di atas sengaja dibatasi pada yang bisa dihitung dari data yang ada. Daftar berikut
          dicantumkan supaya kekosongannya terlihat, bukan supaya fiturnya dianggap sudah ada.
        </p>
        <ul className="space-y-2 text-justify">
          {METRIK_BELUM_TERUKUR.map((m) => (
            <li key={m.nama} className="text-xs">
              <span className="font-medium text-foreground">{m.nama}</span>
              <span className="block text-muted-foreground">{m.alasan}</span>
              <span className="block text-muted-foreground">
                <strong className="font-medium text-foreground">Cara mengukur:</strong>{" "}
                {m.caraMengukur}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Ada baris yang angkanya tidak bisa dihitung sehingga perlu penjelasan. */
function adaCatatanTidakTerukur(baris: { catatan: string | null }[]): boolean {
  return baris.some((b) => b.catatan !== null);
}

function AngkaMini({
  icon: Icon,
  label,
  nilai,
  ket,
}: {
  icon: typeof Clock;
  label: string;
  nilai: string;
  ket: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 text-xl font-bold">{nilai}</p>
      <p className="mt-0.5 text-justify text-[11px] text-muted-foreground">{ket}</p>
    </div>
  );
}
