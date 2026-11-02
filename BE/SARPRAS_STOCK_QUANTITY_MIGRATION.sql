-- Safe migration: quantity, item stock invariants, package stock, and active borrowing guard.
-- Review and run in Supabase SQL editor. No destructive operations.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS stock_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_borrowed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_available integer NOT NULL DEFAULT 0;

ALTER TABLE public.borrowings
  ADD COLUMN IF NOT EXISTS package_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.borrowings_items
  ADD COLUMN IF NOT EXISTS quantity_returned integer NOT NULL DEFAULT 0;

UPDATE public.borrowings_items
SET quantity = 1
WHERE quantity IS NULL OR quantity < 1;

UPDATE public.borrowings_items
SET quantity_returned = CASE
  WHEN b.status = 'Dikembalikan' THEN quantity
  ELSE LEAST(quantity_returned, quantity)
END
FROM public.borrowings b
WHERE b.id = borrowing_id;

-- Initialize package stock from the current component-derived availability only
-- when package stock has never been configured.
UPDATE public.packages p
SET stock_total = COALESCE(src.stock_total, 0),
    stock_available = COALESCE(src.stock_available, 0),
    stock_borrowed = GREATEST(COALESCE(src.stock_total, 0) - COALESCE(src.stock_available, 0), 0)
FROM (
  SELECT pi.package_id,
         MIN(FLOOR(COALESCE(i.stock, 0)::numeric / GREATEST(pi.quantity, 1)))::integer AS stock_total,
         MIN(FLOOR(COALESCE(i.available_stock, 0)::numeric / GREATEST(pi.quantity, 1)))::integer AS stock_available
  FROM public.packages_items pi
  JOIN public.items i ON i.id = pi.item_id
  GROUP BY pi.package_id
) src
WHERE p.id = src.package_id AND p.stock_total = 0;

ALTER TABLE public.borrowings
  DROP CONSTRAINT IF EXISTS borrowings_package_quantity_positive;
ALTER TABLE public.borrowings
  ADD CONSTRAINT borrowings_package_quantity_positive CHECK (package_quantity > 0);

ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_positive;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_returned_valid;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_returned_valid CHECK (quantity_returned >= 0 AND quantity_returned <= quantity);
ALTER TABLE public.packages
  DROP CONSTRAINT IF EXISTS packages_stock_nonnegative;
ALTER TABLE public.packages
  ADD CONSTRAINT packages_stock_nonnegative CHECK (stock_total >= 0 AND stock_borrowed >= 0 AND stock_available >= 0 AND stock_borrowed + stock_available = stock_total);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_borrowing_per_user
ON public.borrowings (user_id)
WHERE status IN ('Pending', 'Disetujui', 'Dipinjam', 'Terlambat');

-- Atomic item stock functions used by the existing stockManager.
CREATE OR REPLACE FUNCTION public.decrement_item_stock(p_item_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r items;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity harus positif'; END IF;
  UPDATE items SET available_stock = available_stock - p_quantity,
    status = CASE WHEN available_stock - p_quantity = 0 THEN 'Stok Kosong' ELSE status END,
    update_at = NOW()
  WHERE id = p_item_id AND available_stock >= p_quantity AND status IN ('Tersedia','Stok Kosong')
  RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stok item tidak mencukupi atau item tidak tersedia'; END IF;
  RETURN jsonb_build_object('id', r.id, 'available_stock', r.available_stock, 'status', r.status);
END; $$;

CREATE OR REPLACE FUNCTION public.increment_item_stock(p_item_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r items;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity harus positif'; END IF;
  UPDATE items SET available_stock = LEAST(stock, available_stock + p_quantity),
    status = CASE WHEN LEAST(stock, available_stock + p_quantity) > 0 AND status = 'Stok Kosong' THEN 'Tersedia' ELSE status END,
    update_at = NOW()
  WHERE id = p_item_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item tidak ditemukan'; END IF;
  RETURN jsonb_build_object('id', r.id, 'available_stock', r.available_stock, 'status', r.status);
END; $$;

REVOKE ALL ON FUNCTION public.decrement_item_stock(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_item_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_item_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_item_stock(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decrement_package_stock(p_package_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r packages;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity paket harus positif'; END IF;
  UPDATE packages SET stock_available = stock_available - p_quantity,
    stock_borrowed = stock_borrowed + p_quantity
  WHERE id = p_package_id AND stock_available >= p_quantity
  RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stok paket tidak mencukupi atau paket tidak tersedia'; END IF;
  RETURN jsonb_build_object('id', r.id, 'stock_available', r.stock_available, 'stock_borrowed', r.stock_borrowed);
END; $$;

CREATE OR REPLACE FUNCTION public.increment_package_stock(p_package_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r packages;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity paket harus positif'; END IF;
  UPDATE packages SET stock_available = LEAST(stock_total, stock_available + p_quantity),
    stock_borrowed = GREATEST(0, stock_borrowed - p_quantity)
  WHERE id = p_package_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paket tidak ditemukan'; END IF;
  RETURN jsonb_build_object('id', r.id, 'stock_available', r.stock_available, 'stock_borrowed', r.stock_borrowed);
END; $$;

REVOKE ALL ON FUNCTION public.decrement_package_stock(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_package_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_package_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_package_stock(uuid, integer) TO authenticated, service_role;
