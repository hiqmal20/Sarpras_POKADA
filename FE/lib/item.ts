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

export function normalizeItem(raw: any): NormalizedItem {
  const stock = Number(raw.available_stock ?? raw.stock ?? 0);
  const totalStock = Number(raw.stock ?? raw.total_stock ?? raw.available_stock ?? 0);
  const statusValue = String(raw.status ?? "").toLowerCase();

  return {
    ...raw,
    id: String(raw.id),
    name: raw.name || "Barang tanpa nama",
    category: raw.category?.name || raw.categories?.name || raw.category || "Tanpa Kategori",
    description: raw.description || "Tidak ada deskripsi barang.",
    stock,
    total_stock: totalStock,
    status: statusValue.includes("tersedia") || statusValue === "available" || stock > 0 ? "available" : "busy",
    asset_id: raw.asset_id || raw.assetId,
    image: raw.image || raw.image_url || raw.foto || undefined,
  };
}
