ALTER TABLE purchase_order_items ADD COLUMN vendor_material_name VARCHAR(255) AFTER material_name;
ALTER TABLE purchase_order_items ADD COLUMN rate_per_kg DECIMAL(15,2) DEFAULT 0 AFTER unit;
ALTER TABLE purchase_order_items ADD COLUMN total_weight DECIMAL(15,4) DEFAULT 0 AFTER rate_per_kg;