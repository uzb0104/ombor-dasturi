-- AutoERP Pro — Race Condition Tuzatish uchun RPC funksiyalar
-- Bu funksiyalar atomik (xavfsiz) quantity/debt yangilash uchun ishlatiladi.
-- Supabase SQL Editor'da ishga tushiring.

-- 1. Tovar miqdorini atomik kamaytirish (sotuv uchun)
CREATE OR REPLACE FUNCTION decrement_product_qty(p_id VARCHAR, p_qty NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET quantity = quantity - p_qty
  WHERE id = p_id AND quantity >= p_qty;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tovar qoldig''i yetarli emas: %', p_id USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_sale_atomic(p_sale JSONB, p_items JSONB)
RETURNS VOID AS $$
DECLARE
  item JSONB;
  product_id_value VARCHAR;
  qty_value NUMERIC;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    product_id_value := item->>'productId';
    qty_value := (item->>'qty')::NUMERIC;
    UPDATE products SET quantity = quantity - qty_value
    WHERE id = product_id_value AND quantity >= qty_value;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tovar qoldig''i yetarli emas: %', product_id_value USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  INSERT INTO sales (id, date, customer_id, seller_id, discount, payment_type, total, profit, paid)
  VALUES (
    p_sale->>'id', p_sale->>'date', NULLIF(p_sale->>'customer_id', ''),
    NULLIF(p_sale->>'seller_id', ''), COALESCE((p_sale->>'discount')::NUMERIC, 0),
    p_sale->>'payment_type', COALESCE((p_sale->>'total')::NUMERIC, 0),
    COALESCE((p_sale->>'profit')::NUMERIC, 0), COALESCE((p_sale->>'paid')::NUMERIC, 0)
  );

  INSERT INTO sale_items (sale_id, product_id, product_name, qty, price, buy_price)
  SELECT p_sale->>'id', item->>'productId', products.name,
         (item->>'qty')::NUMERIC, (item->>'price')::NUMERIC, (item->>'buyPrice')::NUMERIC
  FROM jsonb_array_elements(p_items) item
  JOIN products ON products.id = item->>'productId';

  IF p_sale->>'customer_id' IS NOT NULL AND p_sale->>'customer_id' <> '' THEN
    UPDATE customers SET
      debt = debt + CASE WHEN p_sale->>'payment_type' = 'Qarz'
        THEN GREATEST(0, (p_sale->>'total')::NUMERIC - COALESCE((p_sale->>'paid')::NUMERIC, 0)) ELSE 0 END,
      total_purchases = total_purchases + (p_sale->>'total')::NUMERIC
    WHERE id = p_sale->>'customer_id';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_incoming_atomic(p_incoming JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO incoming (id, date, supplier_id, product_id, qty, buy_price, invoice)
  VALUES (p_incoming->>'id', p_incoming->>'date', NULLIF(p_incoming->>'supplier_id', ''),
          p_incoming->>'product_id', (p_incoming->>'qty')::NUMERIC,
          (p_incoming->>'buy_price')::NUMERIC, COALESCE(p_incoming->>'invoice', ''));
  UPDATE products SET quantity = quantity + (p_incoming->>'qty')::NUMERIC
  WHERE id = p_incoming->>'product_id';
  IF p_incoming->>'supplier_id' IS NOT NULL AND p_incoming->>'supplier_id' <> '' THEN
    UPDATE suppliers SET debt = GREATEST(0, debt +
      (p_incoming->>'qty')::NUMERIC * (p_incoming->>'buy_price')::NUMERIC)
    WHERE id = p_incoming->>'supplier_id';
  END IF;
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

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_type_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_type_check
  CHECK (payment_type IN ('Naqd', 'Karta', 'Qarz', 'O''tkazma'));

-- sale_items ga product_name ustun qo'shish
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='product_name') THEN
    ALTER TABLE sale_items ADD COLUMN product_name VARCHAR(255);
  END IF;
END $$;
