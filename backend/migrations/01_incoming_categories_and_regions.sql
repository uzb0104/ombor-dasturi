-- ====================================================================
-- AutoERP Pro: Kirim Kategoriyalari va Viloyatlar uchun Supabase Migratsiyasi
-- Ushbu SQL kodni Supabase Dashboard -> SQL Editor bo'limiga qo'yib, "Run" tugmasini bosing
-- ====================================================================

-- 1. KIRIM KATEGORIYALARI (VILOYATLAR / HUDUDLAR) JADVALINI YARATISH
CREATE TABLE IF NOT EXISTS public.incoming_categories (
    name VARCHAR(100) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. RLS (ROW LEVEL SECURITY) SOZLAMALARI (xavfsiz ruxsatlar)
ALTER TABLE public.incoming_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for incoming_categories" ON public.incoming_categories;
CREATE POLICY "Allow all for incoming_categories"
ON public.incoming_categories
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. KIRIM (INCOMING) JADVALIGA "region" USTUNINI QO'SHISH
ALTER TABLE public.incoming
ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- Tezkor qidiruv va filtr uchun indeks
CREATE INDEX IF NOT EXISTS idx_incoming_region ON public.incoming(region);

-- 4. ATOMIK KIRIM FUNKSIYASINI YANGILASH (region ustuni bilan)
CREATE OR REPLACE FUNCTION public.create_incoming_atomic(p_incoming JSONB)
RETURNS VOID AS $$
BEGIN
  -- Kirim jadvaliga yozish (region bilan birga)
  INSERT INTO public.incoming (id, date, supplier_id, product_id, qty, buy_price, invoice, region)
  VALUES (
    p_incoming->>'id',
    p_incoming->>'date',
    NULLIF(p_incoming->>'supplier_id', ''),
    p_incoming->>'product_id',
    (p_incoming->>'qty')::NUMERIC,
    (p_incoming->>'buy_price')::NUMERIC,
    COALESCE(p_incoming->>'invoice', ''),
    NULLIF(p_incoming->>'region', '')
  );

  -- Tovar qoldig'ini oshirish
  UPDATE public.products
  SET quantity = quantity + (p_incoming->>'qty')::NUMERIC
  WHERE id = p_incoming->>'product_id';

  -- Yetkazib beruvchi qarzini oshirish (agar tanlangan bo'lsa)
  IF p_incoming->>'supplier_id' IS NOT NULL AND p_incoming->>'supplier_id' <> '' THEN
    UPDATE public.suppliers
    SET debt = GREATEST(0, debt + (p_incoming->>'qty')::NUMERIC * (p_incoming->>'buy_price')::NUMERIC)
    WHERE id = p_incoming->>'supplier_id';
  END IF;
END;
$$ LANGUAGE plpgsql;
