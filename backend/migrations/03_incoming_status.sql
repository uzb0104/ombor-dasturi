-- ====================================================================
-- AutoERP Pro: Kirimlar uchun "status" ustuni migratsiyasi
-- Ushbu SQL kodni Supabase Dashboard -> SQL Editor bo'limiga qo'yib, "Run" tugmasini bosing
-- ====================================================================

-- 1. KIRIM (INCOMING) JADVALIGA "status" USTUNINI QO'SHISH
-- 'pending' = Tovar bazasiga hali qo'shilmagan (kutilmoqda)
-- 'applied' = Tovar bazasiga qo'shilgan (qabul qilingan)
ALTER TABLE public.incoming
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'applied';

-- 2. STATUS UCHUN INDEKS
CREATE INDEX IF NOT EXISTS idx_incoming_status ON public.incoming(status);
