import { useMemo, useState, type ReactNode } from "react";
import { Check, ClipboardCopy, Download, FileSpreadsheet, Printer, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Alat untuk satu tabel: cari, salin, dan ekspor.
 *
 * Sengaja melekat pada tabelnya sendiri, bukan jadi toolbar global halaman.
 * Dashboard ini punya dua lapis data dengan satuan berbeda (kasus per hari
 * vs agregat mingguan per penyakit), jadi tombol "ekspor semua" di tingkat
 * halaman akan ambigu: data mana yang diunduh? Dengan melekat per tabel,
 * isi berkas selalu sama dengan yang sedang terlihat di layar.
 *
 * Format:
 *   - Salin  : TSV ke clipboard, langsung ditempel ke Excel atau Sheets.
 *   - CSV    : pemisah titik koma. Excel lokal Indonesia memakai koma sebagai
 *              pemisah desimal, jadi pemisah kolom harus titik koma supaya
 *              angka tidak pecah menjadi beberapa kolom.
 *   - Excel  : berkas .xls berbentuk tabel HTML. Excel membukanya dengan
 *              format utuh, tanpa perlu pustaka spreadsheet.
 *   - Cetak  : lewat dialog cetak browser, "Simpan sebagai PDF" tersedia di
 *              sana. Aplikasi tidak perlu pustaka pembuat PDF.
 */

export interface Kolom<T> {
  /** Kunci unik untuk React sekaligus urutan kolom ekspor */
  kunci: string;
  /** Label yang dilihat orang */
  judul: string;
  /** Nilai untuk ditampilkan di layar; juga yang ikut diekspor */
  nilai: (baris: T) => string;
  /** Teks yang dibandingkan dengan kotak pencarian. Kosong = pakai `nilai`. */
  cari?: (baris: T) => string;
  /** Tampilan kustom di layar (mis. nama desa yang jadi tautan) */
  render?: (baris: T) => ReactNode;
  /** Kolom angka: rata kanan dan font tabular */
  angka?: boolean;
  /** Kelas tambahan untuk header */
  kelas?: string;
}

export interface PropsAlat<T> {
  kolom: Kolom<T>[];
  baris: T[];
  /** Nama tabel; dipakai pada nama berkas ekspor */
  nama: string;
  /** Kunci baris untuk React */
  rowKey: (baris: T) => string;
  /** Nomor baris pada kolom paling kiri */
  nomor?: boolean;
  /** Kelas untuk elemen <table> */
  kelasTabel?: string;
  /** Header menempel di atas saat tabel digulir, dan tabel dibatasi tingginya */
  sticky?: boolean;
  /** Kelas tambahan per baris, mis. untuk menyorot baris yang sedang dipilih */
  kelasBaris?: (baris: T) => string | undefined;
  /** Judul tabel */
  judul: ReactNode;
  /** Teks kecil di bawah judul */
  keterangan?: ReactNode;
}

export function AlatTabel<T>({
  kolom,
  baris,
  nama,
  rowKey,
  nomor = false,
  kelasTabel = "w-full text-sm",
  sticky = false,
  kelasBaris,
  judul,
  keterangan,
}: PropsAlat<T>) {
  const [cari, setCari] = useState("");
  const [tersalin, setTersalin] = useState(false);

  const hasil = useMemo(() => {
    const t = cari.trim().toLowerCase();
    if (!t) return baris;
    return baris.filter((b) =>
      kolom.some((k) => (k.cari ? k.cari(b) : k.nilai(b)).toLowerCase().includes(t)),
    );
  }, [baris, kolom, cari]);

  const unduh = (isi: string, ekstensi: string, tipe: string) => {
    const blob = new Blob([isi], { type: `${tipe};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nama}.${ekstensi}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Satu baris sebagai daftar sel, dengan kolom nomor bila diaktifkan. */
  const selBaris = (b: T, i: number, ubah?: (v: string) => string): string[] => [
    ...(nomor ? [String(i + 1)] : []),
    ...kolom.map((k) => (ubah ? ubah(k.nilai(b)) : k.nilai(b))),
  ];
  const selKepala = (): string[] => [...(nomor ? ["#"] : []), ...kolom.map((k) => k.judul)];

  const keTsv = () =>
    [selKepala().join("\t"), ...hasil.map((b, i) => selBaris(b, i).join("\t"))].join("\n");

  const keCsv = () => {
    // Sel yang memuat pemisah, kutip, atau baris baru harus diapit kutip.
    const sel = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    // Awalan BOM supaya Excel membaca berkas ini sebagai UTF-8.
    return [
      "﻿" + selKepala().join(";"),
      ...hasil.map((b, i) => selBaris(b, i, sel).join(";")),
    ].join("\r\n");
  };

  const keExcel = () => {
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const isi = [
      `<tr>${selKepala()
        .map((j) => `<th>${esc(j)}</th>`)
        .join("")}</tr>`,
      ...hasil.map(
        (b, i) =>
          `<tr>${selBaris(b, i, esc)
            .map((s) => `<td>${s}</td>`)
            .join("")}</tr>`,
      ),
    ].join("");
    return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${isi}</table></body></html>`;
  };

  const tombol =
    "no-print inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {judul}
          {keterangan ? <div className="mt-1">{keterangan}</div> : null}
        </div>

        <div className="no-print flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <label htmlFor={`cari-${nama}`} className="sr-only">
              Cari di tabel {nama}
            </label>
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id={`cari-${nama}`}
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari..."
              className="w-32 rounded-lg border border-border bg-surface py-1.5 pl-7 pr-2 text-xs outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:w-40"
            />
            {cari ? (
              <button
                type="button"
                onClick={() => setCari("")}
                aria-label="Bersihkan pencarian"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className={tombol}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(keTsv());
                setTersalin(true);
                setTimeout(() => setTersalin(false), 1600);
              } catch {
                // Clipboard ditolak: tanpa izin, atau konteks tidak aman.
                // Tidak ada tindakan yang bisa dilakukan di sini, jadi diamkan saja.
              }
            }}
          >
            {tersalin ? (
              <Check className="size-3.5 text-success-text" aria-hidden />
            ) : (
              <ClipboardCopy className="size-3.5" aria-hidden />
            )}
            {tersalin ? "Tersalin" : "Salin"}
          </button>

          <button
            type="button"
            className={tombol}
            onClick={() => unduh(keCsv(), "csv", "text/csv")}
          >
            <Download className="size-3.5" aria-hidden />
            CSV
          </button>

          <button
            type="button"
            className={tombol}
            onClick={() => unduh(keExcel(), "xls", "application/vnd.ms-excel")}
          >
            <FileSpreadsheet className="size-3.5" aria-hidden />
            Excel
          </button>

          <button type="button" className={tombol} onClick={() => window.print()}>
            <Printer className="size-3.5" aria-hidden />
            Cetak
          </button>
        </div>
      </div>

      {cari.trim() !== "" ? (
        <p className="text-xs text-muted-foreground" role="status">
          {hasil.length} dari {baris.length} baris cocok dengan &ldquo;{cari.trim()}&rdquo;.
        </p>
      ) : null}

      <div className={cn("overflow-x-auto", sticky && "max-h-[32rem] overflow-auto")}>
        <table className={kelasTabel}>
          <thead className={sticky ? "sticky top-0 z-10 bg-surface" : undefined}>
            <tr
              className={cn(
                "border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground",
                sticky && "border-y",
              )}
            >
              {nomor ? <th className="py-2 pr-3 font-medium">#</th> : null}
              {kolom.map((k) => (
                <th
                  key={k.kunci}
                  className={cn("py-2 pr-3 font-medium", k.kelas, k.angka && "text-right")}
                >
                  {k.judul}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasil.map((b, i) => (
              <tr
                key={rowKey(b)}
                className={cn(
                  "border-b border-border/50 transition-colors last:border-0",
                  !sticky && "last:border-0",
                  kelasBaris?.(b),
                )}
              >
                {nomor ? (
                  <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{i + 1}</td>
                ) : null}
                {kolom.map((k) => (
                  <td
                    key={k.kunci}
                    className={cn("py-2.5 pr-3", k.angka && "text-right font-mono tabular-nums")}
                  >
                    {k.render ? k.render(b) : k.nilai(b)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {hasil.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tidak ada baris yang cocok dengan &ldquo;{cari.trim()}&rdquo;.
          </p>
        ) : null}
      </div>
    </div>
  );
}
