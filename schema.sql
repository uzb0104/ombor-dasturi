-- Jadvallarni yaratish skripti (AutoERP Pro)
-- Buni Supabase -> SQL Editor bo'limiga nusxalab ishga tushiring

CREATE TYPE user_role AS ENUM ('ADMIN', 'SELLER', 'WAREHOUSE_KEEPER');
CREATE TYPE payment_type AS ENUM ('CASH', 'CARD', 'DEBT');
CREATE TYPE employee_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role user_role DEFAULT 'SELLER',
  active BOOLEAN DEFAULT TRUE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE vehicle_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  debt NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  vehicle_id UUID REFERENCES vehicle_brands(id) ON DELETE SET NULL,
  total_purchases NUMERIC(15,2) DEFAULT 0,
  debt NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  vehicle_id UUID REFERENCES vehicle_brands(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  buy_price NUMERIC(15,2) NOT NULL,
  sell_price NUMERIC(15,2) NOT NULL,
  min_qty INTEGER DEFAULT 5,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, warehouse_id)
);

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  discount NUMERIC(15,2) DEFAULT 0,
  payment_type payment_type NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  profit NUMERIC(15,2) NOT NULL,
  note TEXT
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL,
  price NUMERIC(15,2) NOT NULL,
  buy_price NUMERIC(15,2) NOT NULL
);

CREATE TABLE incoming_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL,
  buy_price NUMERIC(15,2) NOT NULL,
  invoice TEXT
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  salary NUMERIC(15,2) NOT NULL,
  hire_date DATE NOT NULL,
  status employee_status DEFAULT 'ACTIVE'
);

CREATE TABLE salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  type TEXT NOT NULL,
  note TEXT
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  note TEXT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL
);

CREATE TABLE debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  note TEXT
);

CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  note TEXT
);
