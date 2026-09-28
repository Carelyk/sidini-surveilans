import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DATASET_AWAL, type Kasus } from "@/data/dataset";

interface Ctx {
  kasus: Kasus[];
  /**
   * true bila data saat ini berbeda dari dataset bawaan — kasus ditambahkan,
   * dihapus, atau statusnya diubah lewat halaman verifikasi.
   */
  adaTambahan: boolean;
  tambah: (k: Omit<Kasus, "id">) => Kasus;
  ubahStatus: (id: string, status: Kasus["status"]) => void;
  reset: () => void;
}

const SurveilansContext = createContext<Ctx | null>(null);

/**
 * Kunci penyimpanan lokal. Naikkan versinya kalau bentuk data atau generator
 * dataset berubah, supaya data lama yang tersimpan tidak dipakai lagi.
 */
const KUNCI = "sigap-bandung-v2";

/**
 * Peta kasus bawaan. Dibandingkan dengan data saat ini agar "ada perubahan"
 * terdeteksi akurat, termasuk saat status sebuah kasus diubah lewat halaman
 * verifikasi — bukan hanya saat ada kasus baru.
 */
const PETA_AWAL = new Map(DATASET_AWAL.map((k) => [k.id, k]));

function muatTersimpan(): Kasus[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KUNCI);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as Kasus[];
  } catch {
    return null;
  }
}

export function SurveilansProvider({ children }: { children: ReactNode }) {
  // Selalu mulai dari dataset bawaan supaya render SSR dan render pertama di
  // klien identik. Data tersimpan baru dimuat setelah hydration (lihat useEffect).
  const [kasus, setKasus] = useState<Kasus[]>(DATASET_AWAL);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    const tersimpan = muatTersimpan();
    if (tersimpan) setKasus(tersimpan);
    setSiap(true);
  }, []);

  useEffect(() => {
    if (!siap) return;
    try {
      window.localStorage.setItem(KUNCI, JSON.stringify(kasus));
    } catch {
      // Kuota penuh atau storage diblokir — aplikasi tetap jalan tanpa persistensi.
    }
  }, [kasus, siap]);

  const tambah = useCallback((k: Omit<Kasus, "id">) => {
    // Awalan "U" menandai kasus buatan pengguna: tidak pernah bentrok dengan id
    // bawaan "SS-00001", dan formatnya selalu sama lebarnya.
    const baru: Kasus = { ...k, id: `SS-U${Date.now().toString(36)}` };
    setKasus((prev) => [baru, ...prev]);
    return baru;
  }, []);

  const ubahStatus = useCallback((id: string, status: Kasus["status"]) => {
    setKasus((prev) => prev.map((k) => (k.id === id ? { ...k, status } : k)));
  }, []);

  const reset = useCallback(() => {
    setKasus(DATASET_AWAL);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(KUNCI);
      } catch {
        // diamkan saja — reset tetap berlaku di memori
      }
    }
  }, []);

  const adaTambahan = useMemo(() => {
    if (kasus.length !== PETA_AWAL.size) return true;
    return kasus.some((k) => {
      const asli = PETA_AWAL.get(k.id);
      return !asli || asli.status !== k.status;
    });
  }, [kasus]);

  const value = useMemo(
    () => ({ kasus, adaTambahan, tambah, ubahStatus, reset }),
    [kasus, adaTambahan, tambah, ubahStatus, reset],
  );

  return <SurveilansContext.Provider value={value}>{children}</SurveilansContext.Provider>;
}

export function useSurveilans() {
  const ctx = useContext(SurveilansContext);
  if (!ctx) throw new Error("useSurveilans harus dipakai di dalam SurveilansProvider");
  return ctx;
}
