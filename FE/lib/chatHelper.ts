/**
 * Helper utilitas untuk Chat (WhatsApp style date badge & Last Seen status)
 */

export function formatChatDateBadge(dateStr?: string): string {
  if (!dateStr) return "Hari ini";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Hari ini";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";

  // Kurang dari 7 hari: tampilkan nama hari lengkap
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }

  // Lebih dari 7 hari: format lengkap
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isDifferentDay(date1?: string, date2?: string): boolean {
  if (!date1 || !date2) return true;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;

  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
}

export function formatLastSeen(
  dateStr?: string | null,
  isOnline?: boolean
): { text: string; isOnline: boolean } {
  if (isOnline) {
    return { text: "Online", isOnline: true };
  }

  if (!dateStr) {
    return { text: "Offline", isOnline: false };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { text: "Offline", isOnline: false };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const timeStr =
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";

  if (diffDays === 0) {
    return { text: `Terakhir dilihat hari ini pukul ${timeStr}`, isOnline: false };
  }
  if (diffDays === 1) {
    return { text: `Terakhir dilihat kemarin pukul ${timeStr}`, isOnline: false };
  }
  if (diffDays < 7 && diffDays > 1) {
    const dayName = date.toLocaleDateString("id-ID", { weekday: "long" });
    return { text: `Terakhir dilihat ${dayName} pukul ${timeStr}`, isOnline: false };
  }

  const dateFormatted = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
  return { text: `Terakhir dilihat ${dateFormatted} pukul ${timeStr}`, isOnline: false };
}
