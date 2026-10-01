import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type NadaDialog = "sukses" | "bahaya" | "info";

interface AksiDialog {
  label: string;
  nada?: NadaDialog;
  jalankan: () => void;
}

const GAYA_JUDUL: Record<NadaDialog, string> = {
  sukses: "text-success-text",
  bahaya: "text-destructive",
  info: "text-foreground",
};

const GAYA_TOMBOL: Record<NadaDialog, string> = {
  sukses: "bg-success text-success-foreground hover:bg-success/90",
  bahaya: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  info: "bg-primary text-primary-foreground hover:bg-primary/90",
};

/**
 * Dialog konfirmasi untuk aksi yang mengubah data.
 *
 * Ada karena tiga tombol triase di halaman verifikasi punya akibat berbeda
 * dan tidak boleh salah klik: menyetujui laporan menambah angka ke dashboard,
 * menolak laporan mengeluarkan laporan itu dari antrean, dan menandai
 * investigasi menahan laporan tanpa menghitungnya. Petugas perlu membaca
 * akibatnya, bukan hanya melihat label tombolnya.
 */
export function DialogKonfirmasi({
  terbuka,
  tutup,
  judul,
  pesan,
  aksi,
  nada = "info",
  tampilkanBatal = true,
}: {
  terbuka: boolean;
  tutup: () => void;
  judul: string;
  pesan: React.ReactNode;
  aksi: AksiDialog[];
  nada?: NadaDialog;
  /**
   * Dialog yang hanya memberitahukan hasil (bukan meminta keputusan) tidak
   * perlu tombol Batal. "Batal" di sana hanya membingungkan karena tidak
   * ada keputusan yang dibatalkan.
   */
  tampilkanBatal?: boolean;
}) {
  return (
    <Dialog
      open={terbuka}
      onOpenChange={(v) => {
        if (!v) tutup();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn("text-justify", GAYA_JUDUL[nada])}>{judul}</DialogTitle>
          <DialogDescription className="text-justify text-sm">{pesan}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          {tampilkanBatal && (
            <button
              type="button"
              onClick={tutup}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Batal
            </button>
          )}
          {aksi.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                a.jalankan();
                tutup();
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                GAYA_TOMBOL[a.nada ?? nada],
              )}
            >
              {a.label}
            </button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
