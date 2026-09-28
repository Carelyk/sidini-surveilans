import { CalendarRange, MapPin, Siren, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KABUPATEN, KECAMATAN, PROVINSI, TOTAL_PENDUDUK } from "@/data/wilayah";
import { JUMLAH_MINGGU, PENYAKIT, TAHUN_SKDR } from "@/data/skdr";
import { AMBANG, type JenisKasus, type Penyakit, type FilterSKDR } from "@/lib/skdr";
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

const PRESET = [
  { label: "Seminggu terakhir", dari: 46, sampai: 52 },
  { label: "4 minggu terakhir", dari: 49, sampai: 52 },
  { label: "Puncak musim hujan", dari: 5, sampai: 9 },
  { label: "Seumur tahun", dari: 1, sampai: 52 },
] as const;

/** Daftar nomor minggu yang sah, dipakai oleh kedua kotak pilihan. */
const MINGGU_SKDR = Array.from({ length: JUMLAH_MINGGU }, (_, i) => i + 1);

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
        <ToggleGroup
          type="single"
          value={nilai.penyakit}
          onValueChange={(v) => v && set({ penyakit: v as Penyakit })}
          variant="outline"
          className="flex flex-wrap"
        >
          {PENYAKIT.map((p) => (
            <ToggleGroupItem key={p} value={p} className="px-4">
              {p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* 2. Jenis kasus */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            2. Jenis kasus
          </Label>
          <ToggleGroup
            type="single"
            value={nilai.jenis}
            onValueChange={(v) => v && set({ jenis: v as JenisKasus })}
            variant="outline"
            className="w-full"
          >
            <ToggleGroupItem value="penderita" className="flex-1 px-4">
              Penderita
            </ToggleGroupItem>
            <ToggleGroupItem value="meninggal" className="flex-1 px-4">
              Meninggal
            </ToggleGroupItem>
          </ToggleGroup>
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
            max={JUMLAH_MINGGU}
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
            <span>Minggu {JUMLAH_MINGGU}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET.map((p) => {
            const aktif = nilai.mingguDari === p.dari && nilai.mingguSampai === p.sampai;
            return (
              <Button
                key={p.label}
                type="button"
                size="sm"
                variant={aktif ? "default" : "outline"}
                onClick={() => set({ mingguDari: p.dari, mingguSampai: p.sampai })}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {namaMinggu(nilai.tahun, dari)} &ndash;{" "}
          {namaMinggu(nilai.tahun, Math.min(JUMLAH_MINGGU, sampai))} {nilai.tahun}
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
        <p>
          <span className="font-medium text-foreground">Ambang {nilai.penyakit}:</span>{" "}
          {AMBANG[nilai.penyakit].dasar}
        </p>
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

export function RingkasWilayah({ nama, jumlah }: { nama: string; jumlah: number }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MapPin className="size-3.5" aria-hidden />
      {nama} &middot; {nf.format(jumlah)} desa/kelurahan
    </p>
  );
}
