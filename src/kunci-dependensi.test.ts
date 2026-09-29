import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Tugas 1: hanya bun.lock yang boleh governs dependensi.
 *
 * Latar: bun.lock yang ada di repository tidak memuat vitest maupun
 * devDependency lain yang ditambahkan belakangan. Artinya `bun install
 * --frozen-lockfile` pada lockfile lama tidak akan memasang test runner,
 * dan hasil test di satu mesin bisa berbeda dari mesin lain. Berkas
 * package-lock.json juga pernah muncul sebagai untracked karena ada
 * pemasangan npm, dan kalau ikut ter-commit menjadi dua lockfile untuk
 * satu proyek.
 *
 * Test di sini menjaga dua hal: bun.lock memuat seluruh dependensi yang
 * disebut package.json, dan lockfile keluarga npm tidak boleh lolos ke
 * repository.
 */

/** Lockfile milik proyek ini. */
const LOCKFILE_BUN = "bun.lock";

/** Lockfile lain yang tidak boleh dipakai di proyek ini. */
const LOCKFILE_LAIN = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json"];

interface Paket {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function namaDependensi(): string[] {
  const isi = readFileSync("package.json", "utf8");
  const paket = JSON.parse(isi) as Paket;
  return [...Object.keys(paket.dependencies ?? {}), ...Object.keys(paket.devDependencies ?? {})];
}

function isiGitignore(): string[] {
  return readFileSync(".gitignore", "utf8")
    .split(/\r?\n/)
    .map((b) => b.trim());
}

describe("kunci dependensi proyek", () => {
  const bun = readFileSync(LOCKFILE_BUN, "utf8");
  const nama = namaDependensi();

  it("bun.lock memuat seluruh dependensi dan devDependency", () => {
    // Bentuk yang dicek adalah entri paket terselesaikan ("nama": [),
    // bukan blok spesifikasi, karena bun boleh menulis ulang blok itu:
    // "nitro" ditulis "^3.0.260603-beta" di package.json tapi "3.0.260603-beta"
    // di bun.lock, sebab rentang ber-prerelease tidak boleh longgar.
    const hilang = nama.filter((n) => !bun.includes(`"${n}": [`));
    expect(hilang).toEqual([]);
  });

  it("vitest ada di bun.lock, bukan hanya di package.json", () => {
    // Runner test adalah devDependency yang paling mudah terlupa saat
    // lockfile dibuat sebelum test diperkenalkan.
    expect(nama).toContain("vitest");
    expect(bun).toContain('"vitest": [');
  });

  it("lockfile keluarga npm masuk .gitignore", () => {
    const aturan = isiGitignore();
    const tidakDiabaikan = LOCKFILE_LAIN.filter((f) => !aturan.includes(f));
    expect(tidakDiabaikan).toEqual([]);
  });

  it("hanya bun.lock yang ada di direktori kerja", () => {
    // Kalau package-lock.json muncul lagi karena ada yang menjalankan npm
    // install, file itu tidak akan ter-commit, tapi tetap perlu dicek di
    // sini supaya ketahuan lebih awal.
    const ada = LOCKFILE_LAIN.filter((f) => existsSync(f));
    expect(ada).toEqual([]);
  });
});
