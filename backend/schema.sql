-- AutoERP Pro — Supabase PostgreSQL Ma'lumotlar Bazasi Tuzilmasi (Schema)

-- 1. BAZAVIY KONSTANTALAR UCHUN JADVALLAR
CREATE TABLE IF NOT EXISTS categories (
    name VARCHAR(100) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS vehicle_brands (
    name VARCHAR(100) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS branches (
    name VARCHAR(100) PRIMARY KEY
);

-- 2. FOYDALANUVCHILAR (RBAC) JADVALI
CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Sotuvchi', 'Omborchi')),
    permissions TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CRM VA HAMKORLAR JADVALLARI
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    debt NUMERIC(20, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    vehicle VARCHAR(100) REFERENCES vehicle_brands(name) ON UPDATE CASCADE,
    total_purchases NUMERIC(20, 2) DEFAULT 0.00,
    debt NUMERIC(20, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TOVARLAR JADVALI
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    vehicle VARCHAR(100) REFERENCES vehicle_brands(name) ON UPDATE CASCADE,
    category VARCHAR(100) REFERENCES categories(name) ON UPDATE CASCADE,
    supplier_id VARCHAR(100) REFERENCES suppliers(id) ON DELETE SET NULL,
    buy_price NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    sell_price NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    quantity NUMERIC(15, 2) DEFAULT 0.00,
    min_qty NUMERIC(15, 2) DEFAULT 0.00,
    image TEXT,
    description TEXT,
    attributes JSONB DEFAULT '{}', -- amperage, voltage, tireSize, tireSeason, unitBrand
    branch_stock JSONB DEFAULT '{}', -- { "Asosiy ombor": 10, "Filial 1": 5 }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. XODIMLAR JADVALI (HR)
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Sotuvchi', 'Omborchi')),
    salary NUMERIC(20, 2) DEFAULT 0.00,
    advance NUMERIC(20, 2) DEFAULT 0.00,
    hire_date VARCHAR(50),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Faol', 'Nofaol')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. XARAJATLAR JADVALI
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. KIRIM (INCOMING STOCK) JADVALI
CREATE TABLE IF NOT EXISTS incoming (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(50) NOT NULL,
    supplier_id VARCHAR(100) REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE CASCADE,
    qty NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    buy_price NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    invoice VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SOTUVLAR (SALES) VA SOTUV DETALLARI JADVALLARI
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(50) NOT NULL,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE SET NULL,
    seller_id VARCHAR(100) REFERENCES employees(id) ON DELETE SET NULL,
    discount NUMERIC(20, 2) DEFAULT 0.00,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('Naqd', 'Karta', 'Qarz')),
    total NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    profit NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    paid NUMERIC(20, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id VARCHAR(100) REFERENCES sales(id) ON DELETE CASCADE,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    qty NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    price NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    buy_price NUMERIC(20, 2) NOT NULL DEFAULT 0.00
);

-- 9. QARZ TO'LOVLARI (DEBT PAYMENTS) JADVALI
CREATE TABLE IF NOT EXISTS debt_payments (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('customer', 'supplier')),
    target_id VARCHAR(100) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    amount NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Naqd', 'Karta')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. NARX TARIXI
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

-- 11. AUDIT LOGS JADVALI
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    ts VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, login, logout
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEKSLAR (TEZKOR QIDIRUV VA FILTRLASH UCHUN)
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_vehicle ON products(vehicle);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_incoming_date ON incoming(date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(ts);

-- BOSHLANG'ICH MATERIALLARNI SEED QILISH (AGAR BO'SH BO'LSA)
INSERT INTO categories (name) VALUES 
('Dvigatel'), ('Tormoz tizimi'), ('Elektr'), ('Shinalar (Balon)'), 
('Akkumulyator'), ('Filtrlar'), ('Moy'), ('Kuzov qismlari'), ('Podveska')
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_brands (name) VALUES 
('Shineray T30'), ('JAC'), ('FAW'), ('ISUZU'), ('Chevrolet'),
('Hyundai'), ('Kia'), ('Toyota'), ('Nexia'), ('Damas'), ('Labo')
ON CONFLICT DO NOTHING;

INSERT INTO branches (name) VALUES 
('Asosiy ombor'), ('Filial 1'), ('Filial 2')
ON CONFLICT DO NOTHING;
