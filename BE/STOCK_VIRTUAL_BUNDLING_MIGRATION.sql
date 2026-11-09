-- Virtual Bundling Stock Migration
-- Safe, non-destructive migration for Supabase/PostgreSQL.
-- Run the AUDIT section first. Do not run the enforcement section until audit is clean.

BEGIN;

-- ============================================================================
-- 1. AUDIT ONLY (run these SELECT statements separately before this migration)
-- ============================================================================
-- Negative or impossible item stock:
-- SELECT id, name, stock, available_stock
-- FROM public.items
-- WHERE stock < 0 OR available_stock < 0 OR available_stock > stock;
--
-- Duplicate components in one package:
-- SELECT package_id, item_id, COUNT(*) AS duplicate_rows
-- FROM public.packages_items
-- GROUP BY package_id, item_id
-- HAVING COUNT(*) > 1;
--
-- Invalid borrowing quantities:
-- SELECT id, borrowing_id, item_id, quantity, quantity_returned
-- FROM public.borrowings_items
-- WHERE quantity <= 0
--    OR quantity_returned < 0
--    OR quantity_returned > quantity;
--
-- Packages whose legacy stock differs from component-derived stock:
-- SELECT p.id, p.name, p.stock_available AS legacy_stock,
--        MIN(FLOOR(i.available_stock::numeric / NULLIF(pi.quantity, 0))) AS derived_stock
-- FROM public.packages p
-- JOIN public.packages_items pi ON pi.package_id = p.id
-- JOIN public.items i ON i.id = pi.item_id
-- GROUP BY p.id, p.name, p.stock_available;

-- ============================================================================
-- 2. Compatibility columns: keep them for old data, but mark as deprecated.
-- They are NOT a source of truth and must not be updated by application code.
-- ============================================================================
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS stock_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_borrowed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_available integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.packages.stock_total IS
  'DEPRECATED: virtual package stock; calculate from items.available_stock.';
COMMENT ON COLUMN public.packages.stock_borrowed IS
  'DEPRECATED: virtual package stock; do not update manually.';
COMMENT ON COLUMN public.packages.stock_available IS
  'DEPRECATED: virtual package stock; do not use for availability decisions.';

-- Required for partial returns and idempotent return processing.
ALTER TABLE public.borrowings
  ADD COLUMN IF NOT EXISTS package_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.borrowings_items
  ADD COLUMN IF NOT EXISTS quantity_returned integer NOT NULL DEFAULT 0;

-- ============================================================================
-- 3. Database invariants. NOT VALID prevents a migration failure on legacy rows.
-- After cleaning legacy data, run the VALIDATE statements in section 6.
-- ============================================================================
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_stock_nonnegative;
ALTER TABLE public.items
  ADD CONSTRAINT items_stock_nonnegative
  CHECK (stock >= 0 AND available_stock >= 0 AND available_stock <= stock)
  NOT VALID;

ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_positive;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_positive
  CHECK (quantity > 0)
  NOT VALID;

ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_returned_valid;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_returned_valid
  CHECK (quantity_returned >= 0 AND quantity_returned <= quantity)
  NOT VALID;

ALTER TABLE public.borrowings
  DROP CONSTRAINT IF EXISTS borrowings_package_quantity_positive;
ALTER TABLE public.borrowings
  ADD CONSTRAINT borrowings_package_quantity_positive
  CHECK (package_quantity > 0)
  NOT VALID;

-- Prevent zero/negative package component quantities.
ALTER TABLE public.packages_items
  DROP CONSTRAINT IF EXISTS packages_items_quantity_positive;
ALTER TABLE public.packages_items
  ADD CONSTRAINT packages_items_quantity_positive
  CHECK (quantity > 0)
  NOT VALID;

-- ============================================================================
-- 4. Canonical package availability function.
-- This reads physical item availability only; it never reads package stock.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_virtual_package_stock(p_package_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(MIN(FLOOR(i.available_stock::numeric / NULLIF(pi.quantity, 0)))::integer, 0)
  FROM public.packages_items pi
  JOIN public.items i ON i.id = pi.item_id
  WHERE pi.package_id = p_package_id
    AND i.status NOT IN ('Dalam Pemeliharaan', 'Nonaktif', 'Non-Aktif', 'Stok Rusak');
$$;

-- Convenient read model for admin/user catalog. It does not create a second stock.
CREATE OR REPLACE VIEW public.virtual_package_availability AS
SELECT
  p.id AS package_id,
  p.name,
  p.package_code,
  public.get_virtual_package_stock(p.id) AS available_stock,
  (public.get_virtual_package_stock(p.id) > 0) AS is_available
FROM public.packages p;

-- ============================================================================
-- 5. Indexes for package stock recalculation and transaction lookups.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_packages_items_item_package
  ON public.packages_items(item_id, package_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_items_item_borrowing
  ON public.borrowings_items(item_id, borrowing_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_items_active_return
  ON public.borrowings_items(borrowing_id, quantity_returned);

-- Do NOT create a unique package/item index until the duplicate audit is clean.
-- Then run:
-- CREATE UNIQUE INDEX uq_packages_items_package_item
--   ON public.packages_items(package_id, item_id);

-- Do not grant broad access. Existing RLS policies remain unchanged.
COMMIT;

-- ============================================================================
-- 6. Run only after fixing audit results
-- ============================================================================
-- ALTER TABLE public.items VALIDATE CONSTRAINT items_stock_nonnegative;
-- ALTER TABLE public.borrowings_items VALIDATE CONSTRAINT borrowings_items_quantity_positive;
-- ALTER TABLE public.borrowings_items VALIDATE CONSTRAINT borrowings_items_quantity_returned_valid;
-- ALTER TABLE public.borrowings VALIDATE CONSTRAINT borrowings_package_quantity_positive;
-- ALTER TABLE public.packages_items VALIDATE CONSTRAINT packages_items_quantity_positive;
-- CREATE UNIQUE INDEX uq_packages_items_package_item
--   ON public.packages_items(package_id, item_id);
