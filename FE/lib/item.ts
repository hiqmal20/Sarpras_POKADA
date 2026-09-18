export type NormalizedItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  stock: number;
  total_stock: number;
  status: "available" | "busy";
  asset_id?: string;
  image?: string;
};

export function isItemEmptyStock(item: any) {
  const s = String(item?.status ?? "").toLowerCase();
  if (
    s.includes("dipinjam") ||
    s.includes("kosong") ||
    s.includes("habis") ||
    s.includes("maintenance") ||
    s.includes("pemeliharaan") ||
    s.includes("rusak") ||
    s === "busy" ||
    s === "unavailable"
  )
    return true;
  return Number(item?.stock ?? item?.available_stock ?? 0) <= 0;
}

export function isPackageEmptyStock(pkg: any) {
  if (pkg?.is_available === false) return true;
  if (pkg?.has_empty_item === true) return true;
  const rows = pkg?.packages_items || [];
  if (rows.length === 0) return false;
  return rows.some((r: any) => {
    const avail = Number(r.items?.available_stock ?? r.items?.stock ?? 0);
    return avail < Number(r.quantity || 1);
  });
}

export function normalizeItem(raw: any): NormalizedItem {
  const stock = Number(raw.available_stock ?? raw.stock ?? 0);
  const totalStock = Number(raw.stock ?? raw.total_stock ?? raw.available_stock ?? 0);
  const statusValue = String(raw.status ?? "").toLowerCase();

  const busyStatus =
    statusValue.includes("dipinjam") ||
    statusValue.includes("kosong") ||
    statusValue.includes("habis") ||
    statusValue.includes("maintenance") ||
    statusValue.includes("pemeliharaan") ||
    statusValue.includes("rusak") ||
    statusValue === "busy" ||
    statusValue === "unavailable";
  const availableStatus =
    statusValue.includes("tersedia") || statusValue === "available";

  return {
    ...raw,
    id: String(raw.id),
    name: raw.name || "Barang tanpa nama",
    category: raw.category?.name || raw.categories?.name || raw.category || "Tanpa Kategori",
    description: raw.description || "Tidak ada deskripsi barang.",
    stock,
    total_stock: totalStock,
    status: busyStatus || (!availableStatus && stock <= 0) ? "busy" : "available",
    asset_id: raw.asset_id || raw.assetId,
    image: raw.image || raw.image_url || raw.foto || undefined,
  };
}
