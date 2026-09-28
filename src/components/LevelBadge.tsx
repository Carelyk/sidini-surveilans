export function LevelBadge({ level }: { level: "Aman" | "Waspada" | "KLB" }) {
  // Teks memakai varian gelap (-text), isian memakai warna aslinya. Warna
  // status versi terang hanya aman sebagai isian: amber di atas putih cuma
  // 2,0:1. Lihat catatan varian teks di src/styles.css.
  const kelas =
    level === "KLB"
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : level === "Waspada"
        ? "bg-warning/15 text-warning-text border-warning/40"
        : "bg-success/15 text-success-text border-success/40";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kelas}`}
    >
      {level}
    </span>
  );
}
