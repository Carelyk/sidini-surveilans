import { CalendarRange, MapPin, Siren, Stethoscope } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { KABUPATEN, KECAMATAN, PROVINSI, TOTAL_PENDUDUK } from "@/data/wilayah";
import { JUMLAH_MINGGU, PENYAKIT, TAHUN_SKDR } from "@/data/skdr";
import { MINGGU_DATA_TERAKHIR, TAHUN_DATA_TERAKHIR, waktuPembaruan } from "@/data/kronologi";
import {
  AMBANG,
  LABEL_RENTANG_SKDR,
  MINGGU_SKDR_TERAKHIR,
  type JenisKasus,
  type Penyakit,
  type FilterSKDR,
} from "@/lib/skdr";
import { cn } from "@/lib/utils";

/**
 * Rantai filter SKDR, diurutkan sama seperti alur Petugas surveilans Dinkes:
 * wilayah -> penyakit -> jenis kasus -> minggu -> tahun.
 *
 * Urutannya bukan sembarangan. Penyakit harus dipilih SEBELUM minggu dan
 * tahun, karena ambang KLB, baseline, dan musiman berbeda per penyakit.
 * Kalau pengguna melihat angka total dulu, "% tinggi" itu tidak bisa
 * ditafsirkan tanpa tahu penyakit apa yang sedang dihitung -- itu sebabnya
 * tidak ada lagi angka "total seluruh penyakit" di halaman mana pun.
 */

export interface FilterState {
  tahun: number;
  mingguDari: number;
  mingguSampai: number;
  penyakit: Penyakit;
  jenis: JenisKasus;
  kodeKecamatan: string | null;
}

export function keFilterSKDR(f: FilterState): FilterSKDR {
  return {
    tahun: f.tahun,
    mingguDari: f.mingguDari,
    mingguSampai: Math.max(f.mingguDari, f.mingguSampai),
    penyakit: f.penyakit,
    kodeKecamatan: f.kodeKecamatan,
  };
}

const nf = new Intl.NumberFormat("id-ID");

/** Nama minggu ISO-8601 agar angka "Minggu 7" tidak ambigu antar tahun. */
export function namaMinggu(tahun: number, minggu: number): string {
  // Tanggal ISO-8601: minggu 1 adalah minggu yang memuat 4 Januari.
  const awal = new Date(Date.UTC(tahun, 0, 4));
  const hariKe = (awal.getUTCDay() + 6) % 7; // 0 = Senin
  const tanggal = new Date(awal);
  tanggal.setUTCDate(tanggal.getUTCDate() - hariKe + (minggu - 1) * 7);
  return tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Preset rentang minggu.
 *
 * Tiga preset pertama DITURUNKAN dari tanggal data terakhir
 * (src/data/kronologi.ts, bukan angka 46-52 yang ditulis mati). Sebelumnya
 * "Seminggu terakhir" berarti minggu 46-52 padahal data terakhirnya hanya
 * sampai minggu 39, jadi preset itu justru menampilkan minggu tanpa data.
 *
 * Batas minggu DISEDERHANAKAN dengan MINGGU_SKDR_TERAKHIR (minggu data
 * terakhir), jadi minggu 40-52 tidak bisa dipilih di mana pun. Preset
 * "Seumur tahun" karena itu berarti 1-39, bukan 1-52: perbandingan 2025 vs
 * 2026 memakai rentang minggu yang sama supaya tidak saling menipu.
 */
function mingguTerakhir(n: number): number {
  return Math.min(MINGGU_SKDR_TERAKHIR, Math.max(1, n));
}

const PRESET = [
  {
    label: "Seminggu terakhir",
    dari: mingguTerakhir(MINGGU_DATA_TERAKHIR),
    sampai: mingguTerakhir(MINGGU_DATA_TERAKHIR),
    tahun: TAHUN_DATA_TERAKHIR,
  },
  {
    label: "4 minggu terakhir",
    dari: mingguTerakhir(MINGGU_DATA_TERAKHIR - 3),
    sampai: mingguTerakhir(MINGGU_DATA_TERAKHIR),
    tahun: TAHUN_DATA_TERAKHIR,
  },
  { label: "Puncak musim hujan", dari: 5, sampai: 9, tahun: TAHUN_SKDR[0] },
  {
    label: `Seumur tahun (${LABEL_RENTANG_SKDR})`,
    dari: 1,
    sampai: MINGGU_SKDR_TERAKHIR,
    tahun: undefined,
  },
] as const;

/** Daftar nomor minggu yang sah, dipakai oleh kedua kotak pilihan. */
const MINGGU_SKDR = Array.from({ length: MINGGU_SKDR_TERAKHIR }, (_, i) => i + 1);

export function FilterSKDRBar({
  nilai,
  onUbah,
  className,
}: {
  nilai: FilterState;
  onUbah: (f: FilterState) => void;
  className?: string;
}) {
  const set = (p: Partial<FilterState>) => onUbah({ ...nilai, ...p });
  // Dua nilai terpisah, bukan tuple, supaya noUncheckedIndexedAccess tidak
  // membuat setiap pemakaian minggu[0] jadi number | undefined.
  const dari = Math.min(nilai.mingguDari, nilai.mingguSampai);
  const sampai = Math.max(nilai.mingguDari, nilai.mingguSampai);
  const minggu: [number, number] = [dari, sampai];

  return (
    <section className={cn("panel space-y-5 p-5 sm:p-6", className)} aria-label="Filter surveilans">
      <div className="flex items-center gap-2">
        <Stethoscope className="size-5 text-primary" aria-hidden />
        <h2 className="text-base font-semibold">Filter surveilans</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {PROVINSI} &middot; {KABUPATEN} &middot; {nf.format(TOTAL_PENDUDUK)} jiwa
        </span>
      </div>

      {/* 1. Penyakit didahulukan karena menentukan ambang seluruhnya */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          1. Penyakit yang dianalisis
        </Label>
        <Select value={nilai.penyakit} onValueChange={(v) => v && set({ penyakit: v as Penyakit })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PENYAKIT.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Jenis kasus */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            2. Jenis kasus
          </Label>
          <Select value={nilai.jenis} onValueChange={(v) => v && set({ jenis: v as JenisKasus })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="penderita">Penderita</SelectItem>
              <SelectItem value="meninggal">Meninggal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">3. Tahun</Label>
          <Select value={String(nilai.tahun)} onValueChange={(v) => set({ tahun: Number(v) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAHUN_SKDR.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Periode SKDR */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            4. Periode SKDR
          </Label>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <CalendarRange className="size-4 text-primary" aria-hidden />
            Minggu {dari}&ndash;{sampai} ({sampai - dari + 1} minggu)
          </p>
        </div>

        {/*
          Dua kotak pilihan minggu adalah cara utama memilih periode. Slider
          di bawah hanya pelengkap untuk gesaran kasar: menyeret sepanjang
          1-52 itu tidak presisi, jadi angka minggu tidak boleh dikejar
          dengan menyeret. Kotak ini yang dipakai kalau pengguna sudah tahu
          minggu berapa yang dicari, atau saat memakai papan ketik atau layar
          sentuh.
        */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <PemilihMinggu
            label="Mulai"
            minggu={dari}
            tahun={nilai.tahun}
            onPilih={(m) =>
              set({ mingguDari: Math.min(m, sampai), mingguSampai: Math.max(m, sampai) })
            }
          />
          <PemilihMinggu
            label="Selesai"
            minggu={sampai}
            tahun={nilai.tahun}
            onPilih={(m) => set({ mingguDari: Math.min(dari, m), mingguSampai: Math.max(dari, m) })}
          />
        </div>

        <div className="pt-1">
          <Slider
            value={minggu}
            min={1}
            max={MINGGU_SKDR_TERAKHIR}
            step={1}
            minStepsBetweenThumbs={0}
            onValueChange={(v) => {
              const [a, b] = v as [number, number];
              set({ mingguDari: Math.min(a, b), mingguSampai: Math.max(a, b) });
            }}
            aria-label="Rentang minggu SKDR"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Minggu 1</span>
            <span>Minggu {MINGGU_SKDR_TERAKHIR}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Preset periode
          </Label>
          <PemilihPreset nilai={nilai} onPilih={set} />
        </div>
        <p className="text-xs text-muted-foreground">
          {namaMinggu(nilai.tahun, dari)} &ndash;{" "}
          {namaMinggu(nilai.tahun, Math.min(MINGGU_SKDR_TERAKHIR, sampai))} {nilai.tahun}
        </p>
        <p className="text-justify text-[11px] text-muted-foreground">
          Data kasus per desa berhenti di minggu {MINGGU_DATA_TERAKHIR} {TAHUN_DATA_TERAKHIR}
          (diperbarui {waktuPembaruan()}). Karena itu deret mingguan SKDR dipotong di minggu{" "}
          {MINGGU_SKDR_TERAKHIR} dan tidak menampilkan minggu {MINGGU_SKDR_TERAKHIR + 1}-
          {JUMLAH_MINGGU}: minggu setelahnya tidak punya laporan kasus, jadi tidak ditampilkan
          sebagai data. Perbandingan {TAHUN_SKDR[1]} vs {TAHUN_SKDR[0]} memakai rentang minggu yang
          sama.
        </p>
      </div>

      {/* 5. Wilayah */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">5. Wilayah</Label>
        <Select
          value={nilai.kodeKecamatan ?? "semua"}
          onValueChange={(v) => set({ kodeKecamatan: v === "semua" ? null : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">
              Seluruh {KABUPATEN} ({KECAMATAN.length} kecamatan)
            </SelectItem>
            {KECAMATAN.map((k) => (
              <SelectItem key={k.kode} value={k.kode}>
                {k.nama} &middot; {nf.format(k.penduduk)} jiwa
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
        <Siren className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1 text-justify">
          <p>
            <span className="font-medium text-foreground">Ambang {nilai.penyakit}:</span>{" "}
            {AMBANG[nilai.penyakit].dasar}
          </p>
          <p>
            <span className="font-medium text-foreground">Sumber acuan:</span>{" "}
            {AMBANG[nilai.penyakit].sumber}{" "}
            {AMBANG[nilai.penyakit].statusSumber === "perlu verifikasi acuan Dinkes" ? (
              <span className="font-semibold text-warning-text">
                ({AMBANG[nilai.penyakit].statusSumber})
              </span>
            ) : (
              <span className="text-success-text">(tercatat)</span>
            )}
          </p>
          <p className="text-[11px]">
            Angka ambang ini nilai simulasi, bukan ketetapan. Saat implementasi angkanya akan
            ditetapkan bersama Dinkes Kabupaten Bandung, lalu ditulis satu kali di
            src/data/ambang.ts. Jumlah penduduk desa juga masih kosong dan diisi dari sumber resmi
            bersama Dinkes sebelum aturan insidensi boleh dipakai.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Kotak pilihan satu minggu. Dipakai berpasangan: satu untuk awal periode,
 * satu untuk akhirnya. Jumlah minggu yang bisa dipilih sengaja tidak diubah
 * -- hanya cara menentukannya yang diganti.
 */
function PemilihMinggu({
  label,
  minggu,
  tahun,
  onPilih,
}: {
  label: string;
  minggu: number;
  tahun: number;
  onPilih: (minggu: number) => void;
}) {
  const id = `minggu-${label.toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={String(minggu)} onValueChange={(v) => onPilih(Number(v))}>
        <SelectTrigger id={id} className="w-full" aria-label={`Minggu ${label.toLowerCase()}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINGGU_SKDR.map((m) => (
            <SelectItem key={m} value={String(m)}>
              <span className="font-medium">Minggu {m}</span>
              <span className="text-muted-foreground">&nbsp;&middot; {namaMinggu(tahun, m)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PemilihPreset({
  nilai,
  onPilih,
}: {
  nilai: FilterState;
  onPilih: (p: Partial<FilterState>) => void;
}) {
  const aktif = PRESET.find(
    (p) =>
      nilai.mingguDari === p.dari &&
      nilai.mingguSampai === p.sampai &&
      (p.tahun === undefined || nilai.tahun === p.tahun),
  );
  return (
    <Select
      value={aktif?.label ?? ""}
      onValueChange={(label) => {
        const p = PRESET.find((x) => x.label === label);
        if (!p) return;
        onPilih({
          mingguDari: p.dari,
          mingguSampai: p.sampai,
          ...(p.tahun ? { tahun: p.tahun } : {}),
        });
      }}
    >
      <SelectTrigger className="w-full" aria-label="Pilih preset periode">
        <SelectValue placeholder="Rentang khusus" />
      </SelectTrigger>
      <SelectContent>
        {PRESET.map((p) => (
          <SelectItem key={p.label} value={p.label}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RingkasWilayah({ nama, jumlah }: { nama: string; jumlah: number }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MapPin className="size-3.5" aria-hidden />
      {nama} &middot; {nf.format(jumlah)} desa/kelurahan
    </p>
  );
}
