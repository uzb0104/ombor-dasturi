-- AutoERP Pro — Race Condition Tuzatish uchun RPC funksiyalar
-- Bu funksiyalar atomik (xavfsiz) quantity/debt yangilash uchun ishlatiladi.
-- Supabase SQL Editor'da ishga tushiring.

-- 1. Tovar miqdorini atomik kamaytirish (sotuv uchun)
CREATE OR REPLACE FUNCTION decrement_product_qty(p_id VARCHAR, p_qty NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET quantity = GREATEST(0, quantity - p_qty) WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Tovar miqdorini atomik oshirish (kirim/qaytarish uchun)
CREATE OR REPLACE FUNCTION increment_product_qty(p_id VARCHAR, p_qty NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET quantity = quantity + p_qty WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Mijoz qarzini atomik oshirish
CREATE OR REPLACE FUNCTION increment_customer_debt(c_id VARCHAR, delta_debt NUMERIC, delta_purchases NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET
    debt = debt + delta_debt,
    total_purchases = total_purchases + delta_purchases
  WHERE id = c_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Mijoz qarzini atomik kamaytirish
CREATE OR REPLACE FUNCTION decrement_customer_debt(c_id VARCHAR, delta_debt NUMERIC, delta_purchases NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET
    debt = GREATEST(0, debt - delta_debt),
    total_purchases = GREATEST(0, total_purchases - delta_purchases)
  WHERE id = c_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Yetkazib beruvchi qarzini atomik o'zgartirish
CREATE OR REPLACE FUNCTION adjust_supplier_debt(s_id VARCHAR, delta NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE suppliers SET debt = GREATEST(0, debt + delta) WHERE id = s_id;
END;
$$ LANGUAGE plpgsql;

-- Mavjud jadvalga paid ustun qo'shish (agar allaqachon yo'q bo'lsa)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='paid') THEN
    ALTER TABLE sales ADD COLUMN paid NUMERIC(20, 2) DEFAULT 0.00;
  END IF;
END $$;

-- sale_items ga product_name ustun qo'shish
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='product_name') THEN
    ALTER TABLE sale_items ADD COLUMN product_name VARCHAR(255);
  END IF;
END $$;
