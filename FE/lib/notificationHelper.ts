export interface NotificationData {
  id?: string | number;
  title?: string;
  message?: string;
  type?: string;
  action_url?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  created_at?: string;
}

export function getNotificationTargetUrl(
  notif: NotificationData,
  isAdmin: boolean
): string {
  // 1. Jika action_url sudah disediakan dari backend
  if (notif.action_url && typeof notif.action_url === "string" && notif.action_url.trim()) {
    const url = notif.action_url.trim();

    // Pastikan kompatibilitas role jika URL tersimpan tertukar
    if (isAdmin && url.startsWith("/user/")) {
      if (url.includes("riwayat_peminjaman")) {
        const code = (url.match(/code=([^&]+)/) || [])[1];
        if (url.includes("tab=damage")) {
          return code ? `/admin/rekap_laporan?search=${code}` : "/admin/rekap_laporan";
        }
        if (url.includes("tab=returned")) {
          return code ? `/admin/pengembalian?search=${code}` : "/admin/pengembalian";
        }
        return code ? `/admin/manajemen_peminjaman?search=${code}` : "/admin/manajemen_peminjaman";
      }
      if (url.includes("/user/messages")) return "/admin/messages";
      return "/admin/dashboard_admin";
    }

    if (!isAdmin && url.startsWith("/admin/")) {
      if (url.includes("manajemen_peminjaman")) {
        const code = (url.match(/(?:code|search)=([^&]+)/) || [])[1];
        return code ? `/user/riwayat_peminjaman?code=${code}` : "/user/riwayat_peminjaman";
      }
      if (url.includes("pengembalian")) {
        const code = (url.match(/search=([^&]+)/) || [])[1];
        return code ? `/user/riwayat_peminjaman?tab=returned&code=${code}` : "/user/riwayat_peminjaman?tab=returned";
      }
      if (url.includes("rekap_laporan")) {
        const code = (url.match(/search=([^&]+)/) || [])[1];
        return code ? `/user/riwayat_peminjaman?tab=damage&code=${code}` : "/user/riwayat_peminjaman?tab=damage";
      }
      if (url.includes("/admin/messages")) return "/user/messages";
      return "/user/dashboard";
    }

    return url;
  }

  // 2. Fallback cerdas: ekstrak kode dari title dan message
  const combined = `${notif.title || ""} ${notif.message || ""}`;
  const borrowCodeMatch = combined.match(/(PJ-\d{8}-[A-Z0-9]+|PJ-[A-Z0-9-]+)/i);
  const damageCodeMatch = combined.match(/((?:ITM|PKG|LPR)-\d{8}-[A-Z0-9]+|(?:ITM|PKG|LPR)-[A-Z0-9-]+)/i);
  const type = (notif.type || "").toLowerCase();

  const borrowCode = borrowCodeMatch ? borrowCodeMatch[1] : "";
  const damageCode = damageCodeMatch ? damageCodeMatch[1] : "";

  if (type === "peminjaman" || type === "borrowing") {
    if (isAdmin) {
      return borrowCode
        ? `/admin/manajemen_peminjaman?search=${encodeURIComponent(borrowCode)}`
        : "/admin/manajemen_peminjaman";
    }
    return borrowCode
      ? `/user/riwayat_peminjaman?code=${encodeURIComponent(borrowCode)}`
      : "/user/riwayat_peminjaman";
  }

  if (type === "pengembalian" || type === "return") {
    if (isAdmin) {
      return borrowCode
        ? `/admin/pengembalian?search=${encodeURIComponent(borrowCode)}`
        : "/admin/pengembalian";
    }
    return borrowCode
      ? `/user/riwayat_peminjaman?tab=returned&code=${encodeURIComponent(borrowCode)}`
      : "/user/riwayat_peminjaman?tab=returned";
  }

  if (type === "laporan" || type === "kerusakan" || type === "damage") {
    if (isAdmin) {
      return damageCode
        ? `/admin/rekap_laporan?search=${encodeURIComponent(damageCode)}`
        : "/admin/rekap_laporan";
    }
    return damageCode
      ? `/user/riwayat_peminjaman?tab=damage&code=${encodeURIComponent(damageCode)}`
      : "/user/riwayat_peminjaman?tab=damage";
  }

  if (type === "chat" || type === "pesan" || type === "message") {
    return isAdmin ? "/admin/messages" : "/user/messages";
  }

  return isAdmin ? "/admin/dashboard_admin" : "/user/dashboard";
}

export function getNotificationActionLabel(type: string = "sistem", lang: "id" | "en" = "id"): string {
  const t = type.toLowerCase();
  const en = lang === "en";
  if (t === "peminjaman" || t === "borrowing") return en ? "Open Transaction" : "Buka Transaksi";
  if (t === "pengembalian" || t === "return") return en ? "View Return" : "Lihat Pengembalian";
  if (t === "laporan" || t === "kerusakan" || t === "damage") return en ? "Review Report" : "Periksa Laporan";
  if (t === "chat" || t === "pesan" || t === "message") return en ? "Open Messages" : "Buka Pesan";
  return en ? "Open" : "Buka";
}
