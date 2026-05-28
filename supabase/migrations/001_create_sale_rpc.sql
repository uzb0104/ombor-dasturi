-- ============================================================
-- Atomic sotuv yaratish uchun PostgreSQL funksiya
-- Bu funksiya bir tranzaksiya ichida quyidagilarni bajaradi:
--   1. Sotuvni yaratish (sales jadval)
--   2. Sotuv elementlarini saqlash (sale_items jadval)
--   3. Ombordan miqdorni ayirish (inventory jadval)
--   4. Mijoz qarzini yangilash (agar DEBT bo'lsa)
-- Xato bo'lsa — hammasi avtomatik qaytariladi (rollback)
-- ============================================================

-- Supabase SQL Editor da yoki migration sifatida ishga tushiring:

CREATE OR REPLACE FUNCTION create_sale_atomic(
  p_customer_id TEXT DEFAULT NULL,
  p_seller_id TEXT DEFAULT NULL,
  p_warehouse_id TEXT DEFAULT NULL,
  p_discount NUMERIC DEFAULT 0,
  p_payment_type TEXT DEFAULT 'CASH',
  p_note TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id TEXT;
  v_total NUMERIC := 0;
  v_total_buy NUMERIC := 0;
  v_net_total NUMERIC;
  v_profit NUMERIC;
  v_item JSONB;
  v_current_qty INT;
BEGIN
  -- 1. Jami summa va olish narxini hisoblash
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (v_item->>'price')::NUMERIC * (v_item->>'qty')::INT;
    v_total_buy := v_total_buy + (v_item->>'buy_price')::NUMERIC * (v_item->>'qty')::INT;
  END LOOP;

  v_net_total := v_total - COALESCE(p_discount, 0);
  v_profit := v_net_total - v_total_buy;

  -- 2. Sotuvni yaratish
  INSERT INTO sales (customer_id, seller_id, warehouse_id, discount, payment_type, total, profit, note)
  VALUES (p_customer_id, p_seller_id, p_warehouse_id, p_discount, p_payment_type, v_net_total, v_profit, p_note)
  RETURNING id INTO v_sale_id;

  -- 3. Har bir element uchun: sale_item yaratish + inventory tekshirish/yangilash
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Sale item qo'shish
    INSERT INTO sale_items (sale_id, product_id, qty, price, buy_price)
    VALUES (
      v_sale_id,
      v_item->>'product_id',
      (v_item->>'qty')::INT,
      (v_item->>'price')::NUMERIC,
      (v_item->>'buy_price')::NUMERIC
    );

    -- Ombordagi miqdorni tekshirish
    SELECT quantity INTO v_current_qty
    FROM inventory
    WHERE product_id = v_item->>'product_id'
      AND warehouse_id = p_warehouse_id;

    IF v_current_qty IS NULL THEN
      RAISE EXCEPTION 'Omborda bu mahsulot topilmadi: %', v_item->>'product_id';
    END IF;

    IF v_current_qty < (v_item->>'qty')::INT THEN
      RAISE EXCEPTION 'Yetarli zaxira yo''q! Mahsulot: %, Mavjud: %, Talab: %',
        v_item->>'product_id', v_current_qty, (v_item->>'qty')::INT;
    END IF;

    -- Inventarni atomic ravishda kamaytirish
    UPDATE inventory
    SET quantity = quantity - (v_item->>'qty')::INT
    WHERE product_id = v_item->>'product_id'
      AND warehouse_id = p_warehouse_id;
  END LOOP;

  -- 4. Mijoz qarzini yangilash (agar DEBT bo'lsa)
  IF p_payment_type = 'DEBT' AND p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET debt = debt + v_net_total,
        total_purchases = total_purchases + v_net_total
    WHERE id = p_customer_id;
  ELSIF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_purchases = total_purchases + v_net_total
    WHERE id = p_customer_id;
  END IF;

  -- 5. Natijani qaytarish
  RETURN jsonb_build_object(
    'id', v_sale_id,
    'total', v_net_total,
    'profit', v_profit,
    'items_count', jsonb_array_length(p_items)
  );
END;
$$;
