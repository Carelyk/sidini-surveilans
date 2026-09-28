// ============================================================================
// Utilitas geometri untuk peta choropleth.
// Tidak ada dependensi peta (Leaflet/MapLibre/Google Maps) maupun API key:
// peta digambar sendiri sebagai SVG dari poligon wilayah.ts. Keuntungannya
// untuk demo: jalan offline, tidak ada rate limit tile, dan tidak pernah
// menampilkan koordinat yang bukan milik sistem ini sendiri.
import { BOUNDS, type Kecamatan } from "@/data/wilayah";

export type Pasangan = readonly [number, number]; // [lon, lat]
/** Satu cincin batas: daftar titik [lon, lat]. */
export type Ring = number[][];

export interface Proyeksi {
  /** [lon, lat] -> [x, y] dalam piksel SVG */
  keLayar(lon: number, lat: number): [number, number];
  /** [x, y] -> [lon, lat], kebalikan dari keLayar */
  keGeo(x: number, y: number): [number, number];
  lebar: number;
  tinggi: number;
}

/**
 * Proyeksi equirectangular dengan koreksi cos(lat) pada sumbu bujur.
 * Kabupaten Bandung lebar ~0,68 derajat lintang dan 0,68 derajat bujur, jadi
 * tanpa koreksi ini bentuknya akan "~5% melebar" -- cukup untuk membuat
 * kecamatan terlihat gepeng.
 */
export function buatProyeksi(lebar: number, tinggi: number, pad = 8): Proyeksi {
  const [minLon, minLat, maxLon, maxLat] = BOUNDS;
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const lebarGeo = (maxLon - minLon) * kx;
  const tinggiGeo = maxLat - minLat;
  const skala = Math.min((lebar - pad * 2) / lebarGeo, (tinggi - pad * 2) / tinggiGeo);

  const lebarPakai = lebarGeo * skala;
  const tinggiPakai = tinggiGeo * skala;
  const offX = (lebar - lebarPakai) / 2;
  const offY = (tinggi - tinggiPakai) / 2;

  return {
    lebar,
    tinggi,
    keLayar(lon, lat) {
      return [offX + (lon - minLon) * kx * skala, offY + (maxLat - lat) * skala];
    },
    keGeo(x, y) {
      return [minLon + (x - offX) / (kx * skala), maxLat - (y - offY) / skala];
    },
  };
}

/** Ringkas daftar ring menjadi satu string path SVG, sudah diproyeksikan. */
export function kePath(ring: Ring[], p: Proyeksi, presisi = 1): string {
  const f = (n: number) => String(Number(n.toFixed(presisi)));
  return ring
    .map(
      (cincin) =>
        cincin
          .map((titik, i) => {
            const [x, y] = p.keLayar(titik[0]!, titik[1]!);
            return `${i === 0 ? "M" : "L"}${f(x)} ${f(y)}`;
          })
          .join("") + "Z",
    )
    .join("");
}

/** Ray casting. GADM level 3 hanya menghasilkan satu cincin luar per kecamatan. */
export function diDalamRing(ring: Ring, lon: number, lat: number): boolean {
  let diDalam = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const potong = yi > lat !== yj > lat;
    if (potong && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) diDalam = !diDalam;
  }
  return diDalam;
}

export function diDalamKecamatan(k: Kecamatan, lon: number, lat: number): boolean {
  return k.ring.some((cincin) => diDalamRing(cincin, lon, lat));
}

export function kotakBatas(k: Kecamatan) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const cincin of k.ring) {
    for (const titik of cincin) {
      const lon = titik[0]!;
      const lat = titik[1]!;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLon, minLat, maxLon, maxLat };
}

/** PRNG deterministik (mulberry32) supaya sebaran titik tidak "berjumps" tiap render. */
function benih(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Sebar `jumlah` titik seragam di dalam poligon kecamatan.
 *
 * Titik-titik ini hanya MEWAKILI sebaran kasus di dalam batas kecamatan.
 * Koordinat pasien individual tidak ada di sumber publik mana pun, jadi
 * titik-titik seperti ini tidak boleh diberi nama desa atau alamat. Yang
 * punya koordinat sungguhan hanya dataset Kasus (src/data/dataset.ts) untuk
 * 42 hari terakhir; SKDR sendiri tidak punya koordinat, karena formularnya
 * agregat per minggu per puskesmas.
 */
export function sebarTitik(
  k: Kecamatan,
  jumlah: number,
  kunci: string,
): { lon: number; lat: number }[] {
  const r = benih(hashString(k.kode + "|" + kunci));
  const bb = kotakBatas(k);
  const hasil: { lon: number; lat: number }[] = [];
  // Batas percobaan supaya poligon yang tipis tidak mengulang selamanya.
  for (let coba = 0; coba < jumlah * 60 && hasil.length < jumlah; coba++) {
    const lon = bb.minLon + r() * (bb.maxLon - bb.minLon);
    const lat = bb.minLat + r() * (bb.maxLat - bb.minLat);
    if (diDalamKecamatan(k, lon, lat)) hasil.push({ lon, lat });
  }
  // Poligon sangat kecil: jatuh ke centroid supaya peta tidak kosong.
  while (hasil.length < jumlah) hasil.push({ lon: k.centroid.lon, lat: k.centroid.lat });
  return hasil;
}

/** Rata-rata BUffered centroid: titik yang selalu ada di dalam poligon. */
export function titikDalam(k: Kecamatan): { lon: number; lat: number } {
  const r = benih(hashString(k.kode + "|titik"));
  const bb = kotakBatas(k);
  for (let coba = 0; coba < 4000; coba++) {
    const lon = bb.minLon + r() * (bb.maxLon - bb.minLon);
    const lat = bb.minLat + r() * (bb.maxLat - bb.minLat);
    if (diDalamKecamatan(k, lon, lat)) return { lon, lat };
  }
  return { lon: k.centroid.lon, lat: k.centroid.lat };
}
