/**
 * Helper utilitas untuk Chat (WhatsApp style date badge & Last Seen status)
 * Mendukung EN/ID via param lang ("id" | "en").
 */

export function formatChatDateBadge(dateStr?: string, lang: "id" | "en" = "id"): string {
  const todayLabel = lang === "en" ? "Today" : "Hari ini";
  const yesterdayLabel = lang === "en" ? "Yesterday" : "Kemarin";
  const locale = lang === "en" ? "en-US" : "id-ID";
  if (!dateStr) return todayLabel;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return todayLabel;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return todayLabel;
  if (diffDays === 1) return yesterdayLabel;

  // Kurang dari 7 hari: tampilkan nama hari lengkap
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }

  // Lebih dari 7 hari: format lengkap
  return date.toLocaleDateString(locale, {
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
  isOnline?: boolean,
  lang: "id" | "en" = "id"
): { text: string; isOnline: boolean } {
  const locale = lang === "en" ? "en-US" : "id-ID";
  const suffix = lang === "en" ? "" : " WIB";
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
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  // Relatif untuk hari ini (lebih hidup & akurat)
  if (diffMs >= 0 && diffMin < 1) {
    return { text: lang === "en" ? "Last seen just now" : "Terakhir dilihat baru saja", isOnline: false };
  }
  if (diffMs >= 0 && diffMin < 60) {
    return { text: lang === "en" ? `Last seen ${diffMin} min ago` : `Terakhir dilihat ${diffMin} menit lalu`, isOnline: false };
  }
  if (diffMs >= 0 && diffMin < 1440) {
    const timeStr = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) + suffix;
    return { text: lang === "en" ? `Last seen today at ${timeStr}` : `Terakhir dilihat hari ini pukul ${timeStr}`, isOnline: false };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const timeStr =
    date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }) + suffix;

  if (diffDays === 1) {
    return { text: lang === "en" ? `Last seen yesterday at ${timeStr}` : `Terakhir dilihat kemarin pukul ${timeStr}`, isOnline: false };
  }
  if (diffDays < 7 && diffDays > 1) {
    const dayName = date.toLocaleDateString(locale, { weekday: "long" });
    return { text: lang === "en" ? `Last seen ${dayName} at ${timeStr}` : `Terakhir dilihat ${dayName} pukul ${timeStr}`, isOnline: false };
  }

  const dateFormatted = date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
  return { text: lang === "en" ? `Last seen ${dateFormatted} at ${timeStr}` : `Terakhir dilihat ${dateFormatted} pukul ${timeStr}`, isOnline: false };
}

export interface ReplyInfo {
  id: string;
  senderName: string;
  text: string;
}

export function parseMessageContent(rawText?: string | null): {
  replyTo: ReplyInfo | null;
  text: string;
} {
  if (!rawText) return { replyTo: null, text: "" };

  const match = rawText.match(/^\[reply:(\{.*?\})\]\n?([\s\S]*)$/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === "object") {
        return {
          replyTo: {
            id: String(parsed.id || ""),
            senderName: String(parsed.senderName || "Pesan"),
            text: String(parsed.text || ""),
          },
          text: match[2] || "",
        };
      }
    } catch (_) {
      // Fallback normal
    }
  }

  return { replyTo: null, text: rawText };
}

export function formatReplyMessage(replyTo: ReplyInfo, actualText: string): string {
  const cleanSnippet = replyTo.text.length > 120 ? replyTo.text.slice(0, 117) + "..." : replyTo.text;
  const replyMeta: ReplyInfo = {
    id: replyTo.id,
    senderName: replyTo.senderName,
    text: cleanSnippet.replace(/[\r\n]+/g, " "),
  };
  return `[reply:${JSON.stringify(replyMeta)}]\n${actualText}`;
}

export function getCleanMessagePreview(rawText?: string | null): string {
  return parseMessageContent(rawText).text;
}
