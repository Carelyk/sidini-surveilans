# Membuat favicon dari satu gambar sumber

Skrip ini membaca satu berkas gambar, memotong bagian kosongnya, lalu
membuat seluruh ukuran yang dibutuhkan browser dan ponsel:

| Berkas                  | Ukuran | Dipakai oleh                        |
| ----------------------- | ------ | ----------------------------------- |
| `favicon.ico`           | 16, 32, 48 | Browser desktop                    |
| `icon-192.png`          | 192    | Android, PWA                        |
| `icon-512.png`          | 512    | PWA, layar tinggi                   |
| `apple-touch-icon.png`  | 180    | iPhone dan iPad saat diklik ke beranda |

## Cara pakai

Buka PowerShell di folder project ini, lalu jalankan:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\alat\favicon.ps1 -Sumber "C:\path\logo-anda.png"
```

Semua berkas hasil ditulis ke `public\`. Setelah itu deploy ulang.

## Format gambar sumber

- **Persegi**, lebar sama dengan tinggi.
- **PNG**. Ukuran aslini bebas, minimal 512 x 512 supaya tidak pecah saat
  dikecilkan. Yang paling aman: 1024 x 1024.
- **Isi gambarnya sebaiknya memenuhi seluruh bidang.** Kalau ada ruang kosong
  besar seperti file ChatGPT Image yang 1254 x 1254 itu (isinya cuma
  61 persen dari bidang), bagian kosongnya dipotong otomatis, tapi
  lebih bagus kalau logonya memang dirancang memenuhi bidang sejak awal.
- Latar boleh transparan, dan untuk favicon transparan biasanya lebih
  bagus. Kalau latar putih, tidak apa-apa.
- **Hindari detail tipis dan tulisan kecil.** Pada ukuran 16 x 16 piksel
  yang dipakai browser di tab, garis setipis satu piksel dan huruf
  sekecil itu hilang total. Bentuk besar dan pekat yang terbaca.
- Pentingkan bagian tengah, karena tepi bisa terpotong di beberapa
  launcher ponsel.

## Kalau ingin Memakai Gambar Utuh Tanpa Dipotong

Tambahkan sakelar `-TanpaPotong`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\alat\favicon.ps1 -Sumber "C:\path\logo.png" -TanpaPotong
```
