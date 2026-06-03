-- Narx tarixi jadvali (Supabase SQL Editor da ishga tushiring)
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    field VARCHAR(20) NOT NULL CHECK (field IN ('buy_price', 'sell_price')),
    old_value NUMERIC(20, 2),
    new_value NUMERIC(20, 2) NOT NULL,
    changed_by_id VARCHAR(100),
    changed_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON price_history(created_at DESC);
