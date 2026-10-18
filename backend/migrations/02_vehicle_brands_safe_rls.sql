-- ====================================================================
-- AutoERP Pro: Mashina brendlari (vehicle_brands) va xavfsizlik sozlamalari
-- Ushbu SQL kodni Supabase Dashboard -> SQL Editor bo'limiga qo'yib, "Run" tugmasini bosing
-- ====================================================================

-- 1. VEHICLE_BRANDS JADVALI MAVJUDLIGINI TA'MINLASH
CREATE TABLE IF NOT EXISTS public.vehicle_brands (
    name VARCHAR(100) PRIMARY KEY
);

-- 2. RLS (ROW LEVEL SECURITY) HUQUQI - Foydalanuvchilar bemalol brend qo'sha olishi uchun
ALTER TABLE public.vehicle_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for vehicle_brands" ON public.vehicle_brands;
CREATE POLICY "Allow all for vehicle_brands"
ON public.vehicle_brands
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. CUSTOMERS JADVALIDA FOREIGN KEYNI MOSLASHTIRISH
-- (Brend o'chirilganda mijoz ma'lumotlari buzilmasligi uchun ON DELETE SET NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_vehicle_fkey' AND table_name = 'customers'
  ) THEN
    ALTER TABLE public.customers DROP CONSTRAINT customers_vehicle_fkey;
  END IF;
END $$;

ALTER TABLE public.customers
ADD CONSTRAINT customers_vehicle_fkey
FOREIGN KEY (vehicle) REFERENCES public.vehicle_brands(name)
ON UPDATE CASCADE ON DELETE SET NULL;
