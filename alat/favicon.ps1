<#
.SYNOPSIS
  Membuat seluruh ukuran favicon dari satu gambar sumber.

.DESCRIPTION
  Membaca satu gambar (PNG atau JPG), memotong ruang kosongnya secara
  otomatis, lalu menulis favicon.ico, icon-192.png, icon-512.png, dan
  apple-touch-icon.png ke folder public.

  Memakai System.Drawing yang sudah ada di Windows, jadi tidak perlu
  memasang apa pun. Skrip ini hanya berjalan di Windows, karena
  System.Drawing tidak tersedia di PowerShell 7 di Linux.

.PARAMETER Sumber
  Berkas gambar sumber. Wajib.

.PARAMETER TanpaPotong
  Pakai gambar utuh tanpa memotong ruang kosongnya.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\alat\favicon.ps1 `
    -Sumber "C:\Users\User\Downloads\Games\logo.png"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Sumber,

  [switch]$TanpaPotong
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Sumber)) {
  throw "Berkas gambar tidak ditemukan: $Sumber"
}

$akar = Split-Path -Parent $PSScriptRoot
$pub = Join-Path $akar "public"
if (-not (Test-Path -LiteralPath $pub)) {
  New-Item -ItemType Directory -Path $pub | Out-Null
}

$ekstensi = [System.IO.Path]::GetExtension($Sumber).ToLower()
if ($ekstensi -notin @(".png", ".jpg", ".jpeg", ".bmp")) {
  throw "Format berkas '$ekstensi' belum didukung. Pakai PNG atau JPG."
}

$asal = [System.Drawing.Bitmap]::FromFile($Sumber)
Write-Host "Sumber      : $Sumber"
Write-Host "Dimensi     : $($asal.Width) x $($asal.Height)"

# --- Tentukan bidang yang benar-benar berisi gambar --------------------------
if ($TanpaPotong) {
  $potong = $null
  Write-Host "Pemotongan  : dilewati (-TanpaPotong)"
} else {
  $minX = $asal.Width; $minY = $asal.Height; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $asal.Height; $y += 2) {
    for ($x = 0; $x -lt $asal.Width; $x += 2) {
      $c = $asal.GetPixel($x, $y)
      # Anggap apa pun yang jauh dari putih sebagai bagian gambar.
      if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt 0) {
    Write-Warning "Gambarnya kosong semua. Pakai gambar utuh."
    $potong = $null
  } else {
    $lebarIsi = $maxX - $minX + 1
    $tinggiIsi = $maxY - $minY + 1
    $sisi = [Math]::Max($lebarIsi, $tinggiIsi)

    # Beri sedikit ruang supaya bagian tepi tidak menempel tepi bidang.
    $pinggir = [Math]::Max(2, [int]($sisi * 0.04))
    $kanvas = $sisi + ($pinggir * 2)

    $potong = New-Object System.Drawing.Bitmap($kanvas, $kanvas, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($potong)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $dx = $pinggir + [int](($sisi - $lebarIsi) / 2)
    $dy = $pinggir + [int](($sisi - $tinggiIsi) / 2)
    $g.DrawImage(
      $asal,
      (New-Object System.Drawing.Rectangle($dx, $dy, $lebarIsi, $tinggiIsi)),
      (New-Object System.Drawing.Rectangle($minX, $minY, $lebarIsi, $tinggiIsi)),
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $g.Dispose()
    Write-Host "Isi gambar : $lebarIsi x $tinggiIsi, kanvas $kanvas x $kanvas (pinggir $pinggir px)"
  }
}

$dasar = if ($potong) { $potong } else { $asal }

# --- Perkecil ke ukuran tertentu --------------------------------------------
function New-BitmapPersis($sumber, $sisi) {
  $keluar = New-Object System.Drawing.Bitmap($sisi, $sisi, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($keluar)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($sumber, 0, 0, $sisi, $sisi)
  $g.Dispose()
  return $keluar
}

function Save-Png($bitmap, $sisi, $namaBerkas) {
  $bit = New-Object System.Drawing.Bitmap($sisi, $sisi, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bit)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($bitmap, 0, 0, $sisi, $sisi)
  $g.Dispose()
  $path = Join-Path $pub $namaBerkas
  $bit.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bit.Dispose()
  $ukuran = [Math]::Round((Get-Item $path).Length / 1KB, 1)
  Write-Host ("  {0,-22} {1,3} x {2,-3}  {3,7} KB" -f $namaBerkas, $sisi, $sisi, $ukuran)
}

# --- PNG untuk Android, iPhone, dan PWA ------------------------------------
Write-Host ""
Write-Host "Menulis PNG:"
Save-Png $dasar 192 "icon-192.png"
Save-Png $dasar 512 "icon-512.png"
Save-Png $dasar 180 "apple-touch-icon.png"

# --- favicon.ico berisi 16, 32, dan 48 piksel -------------------------------
# Bentuk ICO menyimpan gambar sebagai PNG di dalam wadahnya. Semua browser
# modern bisa membacanya, dan ukurannya jauh lebih kecil daripada BMP.
Write-Host ""
Write-Host "Menulis favicon.ico (16, 32, 48):"

$ukuranIco = @(16, 32, 48)
$potongan = @()
foreach ($s in $ukuranIco) {
  $b = New-BitmapPersis $dasar $s
  $ms = New-Object System.IO.MemoryStream
  $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $potongan += ,@{ ukuran = $s; data = $ms.ToArray() }
  $ms.Dispose()
  $b.Dispose()
}

# ICONDIR: reserved(2) type(2) jumlah(2)
$jumlah = $ukuranIco.Count
$dir = New-Object byte[] 6
$dir[0] = 0; $dir[1] = 0
$dir[2] = 1; $dir[3] = 0
$dir[4] = [byte]$jumlah; $dir[5] = 0

# ICONDIRENTRY 16 byte per gambar, lalu datanya menyusul.
$offset = 6 + (16 * $jumlah)
$entri = New-Object byte[] (16 * $jumlah)
for ($i = 0; $i -lt $jumlah; $i++) {
  $s = $ukuranIco[$i]
  $len = $potongan[$i].data.Length
  $o = $i * 16
  $entri[$o] = [byte]$s
  $entri[$o + 1] = [byte]$s
  $entri[$o + 2] = 0
  $entri[$o + 3] = 0
  $entri[$o + 4] = 1; $entri[$o + 5] = 0
  $entri[$o + 6] = 32; $entri[$o + 7] = 0
  $entri[$o + 8] = [byte]($len -band 0xFF)
  $entri[$o + 9] = [byte](($len -shr 8) -band 0xFF)
  $entri[$o + 10] = [byte](($len -shr 16) -band 0xFF)
  $entri[$o + 11] = [byte](($len -shr 24) -band 0xFF)
  $entri[$o + 12] = [byte]($offset -band 0xFF)
  $entri[$o + 13] = [byte](($offset -shr 8) -band 0xFF)
  $entri[$o + 14] = [byte](($offset -shr 16) -band 0xFF)
  $entri[$o + 15] = [byte](($offset -shr 24) -band 0xFF)
  $offset += $len
}

$semua = New-Object System.Collections.Generic.List[byte]
$semua.AddRange($dir)
$semua.AddRange($entri)
foreach ($p in $potongan) { $semua.AddRange($p.data) }

$icoPath = Join-Path $pub "favicon.ico"
[System.IO.File]::WriteAllBytes($icoPath, $semua.ToArray())
Write-Host ("  {0,-22} {1,3} x {2,-3}  {3,7} KB" -f "favicon.ico", "16/32/48", "", [Math]::Round((Get-Item $icoPath).Length / 1KB, 1))

# --- Beri tahu kalau hasilnya kemungkinan tidak terbaca ----------------------
$kecil = New-BitmapPersis $dasar 16
$isi = 0
for ($y = 0; $y -lt 16; $y++) {
  for ($x = 0; $x -lt 16; $x++) {
    $c = $kecil.GetPixel($x, $y)
    $a = $c.A
    if ($a -lt 235) { $isi++ }
    elseif ($c.R -lt 235 -or $c.G -lt 235 -or $c.B -lt 235) { $isi++ }
  }
}
$kecil.Dispose()
$pct = [Math]::Round(100 * $isi / 256)
Write-Host ""
Write-Host "Isi pada 16 x 16 : $isi dari 256 piksel ($pct persen)"
if ($pct -lt 20) {
  Write-Warning "Isinya terlalu sedikit untuk favicon. Coba gambar dengan bentuk lebih besar dan pekat."
} else {
  Write-Host "Cukup terbaca untuk favicon."
}

$asal.Dispose()
if ($potong) { $potong.Dispose() }

Write-Host ""
Write-Host "Selesai. Semua berkas ada di $pub"
Write-Host "Langkah berikutnya: npm run build, lalu deploy ulang."
