import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Konfigurasi uji unit.
 *
 * Hanya memakai alias `@` -> src (sama dengan tsconfig) dan environment
 * node, karena perbaikan di proyek ini berupa logika murni (analitik,
 * ambang, referensi data) yang tidak butuh DOM. Memasang plugin TanStack
 * di sini tidak perlu dan justru memperlambat test.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
