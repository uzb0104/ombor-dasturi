-- AutoERP Pro — Supabase jadvallarida Row Level Security (RLS) ni yoniq (Enable) qilish
-- Bu SQL ni Supabase Dashboard -> SQL Editor da ishga tushiring.
-- Bu jadvallarni xavfsiz holatga o'tkazadi va faqatgina backend (Service Role) yoki
-- to'g'ri huquqlarga (Policies) ega foydalanuvchilargina unga kira oladi.

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Eslatma: Backend kodingiz Supabase ga ulanishda "Service Role Key" ishlatsa (SUPABASE_KEY), 
-- u RLS ni avtomatik aylanib o'tadi va ishlashda davom etadi. 
-- Agar "Anon Key" ishlatilayotgan bo'lsa, xavfsizlik siyosati (Policies) qo'shishingiz kerak bo'ladi.
