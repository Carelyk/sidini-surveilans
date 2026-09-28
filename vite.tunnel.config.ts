/**
 * Config KHUSUS untuk mencoba aplikasi lewat Cloudflare Tunnel.
 *
 * Vite memblokir request yang `Host`-header-nya tidak dikenal (proteksi anti
 * DNS-rebinding). Saat aplikasi dibuka lewat terowongan publik, Host-nya jadi
 * domain trycloudflare.com sehingga Vite menjawab 403. File ini whitelist
 * hostname terowongan itu — tanpa menyentuh `vite.config.ts`, jadi posture
 * keamanan project Anda tidak berubah.
 *
 * Cara pakai (PowerShell):
 *   $env:TUNNEL_HOST = "xxxx.trycloudflare.com"
 *   npx vite dev --config vite.tunnel.config.ts
 *
 * Kalau `TUNNEL_HOST` belum di-set, `server` dibiarkan kosong dan perilakunya
 * identik dengan `vite.config.ts` biasa.
 *
 * Tidak diperlukan untuk deploy ke Cloudflare Workers — di production tidak ada
 * dev server Vite, jadi blokir ini tidak terjadi.
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const hostTunnel = process.env.TUNNEL_HOST?.trim();

export default defineConfig({
  tanstackStart: {
    // Sama dengan vite.config.ts agar tunnel mencerminkan aplikasi apa adanya.
    server: { entry: "server" },
  },
  vite: {
    server: hostTunnel ? { allowedHosts: [hostTunnel] } : {},
  },
});
