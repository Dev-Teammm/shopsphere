-- Add soft-delete column to products table
-- Products with deleted_at set are hidden from shop/search but kept for order history

ALTER TABLE products
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

COMMENT ON COLUMN products.deleted_at IS 'When set, product is soft-deleted and excluded from listings';
