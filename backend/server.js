import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { createClient as createRedisClient } from "redis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, "db.json");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_for_autoerp_token_generation_2026";

app.use(cors());
app.use(express.json());

// ─────────────── SUPABASE YOKI MAHALLIY DB MOSLASHTIRISH ───────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let isSupabaseConfigured = false;
let supabaseClient = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes("your-supabase-project") && supabaseKey !== "your-supabase-anon-key-here") {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    isSupabaseConfigured = true;
    console.log("🚀 Supabase ma'lumotlar bazasi muvaffaqiyatli ulandi!");
  } catch (error) {
    console.error("❌ Supabase ulanishida xatolik, Mahalliy rejimga o'tilmoqda:", error.message);
  }
}

if (!isSupabaseConfigured) {
  console.warn("⚠️ DIQQAT: Supabase sozlanmagan! Tizim avtomatik ravishda MAHALLIY JSON DATABASE rejimida ishlamoqda.");
  console.warn(`📂 Ma'lumotlar saqlanish fayli: ${DB_JSON_PATH}`);
}

// ─────────────── BOSHLANG'ICH ADMIN (SUPABASE) ───────────────
async function ensureDefaultAdmin() {
  if (!isSupabaseConfigured) return;
  try {
    const { data: existing } = await supabaseClient
      .from("app_users")
      .select("id")
      .eq("email", "admin@autoerp.uz")
      .maybeSingle();

    if (existing) {
      console.log("✅ Admin foydalanuvchi Supabase da mavjud");
      return;
    }

    const passwordHash = bcrypt.hashSync("admin123", 10);
    const { error } = await supabaseClient.from("app_users").insert([
      {
        id: "u_admin",
        name: "Bosh admin",
        email: "admin@autoerp.uz",
        password: passwordHash,
        role: "Admin",
        permissions: [],
        active: true,
      },
    ]);

    if (error) {
      console.error("❌ Admin seed xatosi:", error.message);
      return;
    }
    console.log("✅ Bosh admin Supabase ga qo'shildi (admin@autoerp.uz / admin123)");
  } catch (err) {
    console.error("❌ Admin seed:", err.message);
  }
}

// ─────────────── REDIS INTEGRATSIYASI UCHUN IN-MEMORY FALLBACK KESH TIZIMI ───────────────
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let redisClient = null;
let isRedisConnected = false;

// Mahalliy tezkor xotira keshi (Redis bo'lmasa fallback sifatida ishlaydi)
const localMemoryCache = new Map();
const localMemoryCacheExpiry = new Map();

try {
  redisClient = createRedisClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          // Stop retrying after 3 attempts to prevent infinite hang
          return new Error("Redis reconnection retries exhausted");
        }
        return Math.min(retries * 100, 1000); // retry delay
      }
    }
  });
  redisClient.on("error", (err) => {
    if (isRedisConnected) {
      console.log("⚠️ Redis ulanishida uzilish:", err.message);
    }
    isRedisConnected = false;
  });
  redisClient.on("connect", () => {
    isRedisConnected = true;
    console.log("🚀 Redis kesh tizimi muvaffaqiyatli ulandi!");
  });
  redisClient.connect().catch((error) => {
    console.log("⚠️ Redis serveri topilmadi. Tizim tezkor ishlashi uchun vaqtinchalik mahalliy tezkor xotira (In-Memory Cache) ishlatiladi.");
  });
} catch (error) {
  console.log("⚠️ Redis ulanishida xatolik, mahalliy tezkor xotira ishlatiladi:", error.message);
}

// ─────────────── KESH YORDAMCHI FUNKSIYALARI ───────────────
async function getCached(key) {
  if (isRedisConnected && redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        console.log(`⚡ [Redis Cache] O'qildi: ${key}`);
        return JSON.parse(value);
      }
    } catch (err) {
      console.error(`❌ Redis get xatosi (${key}):`, err.message);
    }
  } else {
    // In-memory fallback
    const now = Date.now();
    const expiry = localMemoryCacheExpiry.get(key);
    if (expiry && expiry > now) {
      const val = localMemoryCache.get(key);
      if (val !== undefined) {
        console.log(`⚡ [Memory Cache] O'qildi: ${key}`);
        return JSON.parse(val);
      }
    } else {
      localMemoryCache.delete(key);
      localMemoryCacheExpiry.delete(key);
    }
  }
  return null;
}

async function setCached(key, data, ttl = 60) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      console.log(`💾 [Redis Cache] Saqlandi: ${key}`);
    } catch (err) {
      console.error(`❌ Redis set xatosi (${key}):`, err.message);
    }
  } else {
    // In-memory fallback
    const now = Date.now();
    localMemoryCache.set(key, JSON.stringify(data));
    localMemoryCacheExpiry.set(key, now + ttl * 1000);
    console.log(`💾 [Memory Cache] Saqlandi: ${key} (TTL: ${ttl}s)`);
  }
}

async function clearCached(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      console.log(`🧹 [Redis Cache] Tozalandi: ${key}`);
    } catch (err) {
      console.error(`❌ :-D Redis del xatosi (${key}):`, err.message);
    }
  } else {
    // In-memory fallback
    localMemoryCache.delete(key);
    localMemoryCacheExpiry.delete(key);
    console.log(`🧹 [Memory Cache] Tozalandi: ${key}`);
  }
}


// ─────────────── MAPPER FUNCTIONS (FRONTEND <-> DATABASE) ───────────────

// 1. PRODUCTS
function toDbProduct(p) {
  if (!p) return null;
  const dbObj = {};
  if (p.id !== undefined) dbObj.id = p.id;
  if (p.name !== undefined) dbObj.name = p.name;
  // UNIQUE maydonlar: bo'sh string -> null (aks holda ikkinchi tovar qo'shib bo'lmaydi)
  if (p.sku !== undefined) dbObj.sku = p.sku || null;
  if (p.barcode !== undefined) dbObj.barcode = p.barcode || null;
  // FK maydonlar: bo'sh string -> null (aks holda FK constraint buziladi)
  if (p.vehicle !== undefined) dbObj.vehicle = p.vehicle || null;
  if (p.category !== undefined) dbObj.category = p.category || null;
  if (p.supplierId !== undefined) dbObj.supplier_id = p.supplierId || null;
  if (p.buyPrice !== undefined) dbObj.buy_price = p.buyPrice;
  if (p.sellPrice !== undefined) dbObj.sell_price = p.sellPrice;
  if (p.quantity !== undefined) dbObj.quantity = p.quantity;
  if (p.minQty !== undefined) dbObj.min_qty = p.minQty;
  if (p.image !== undefined) dbObj.image = p.image || null;
  if (p.description !== undefined) dbObj.description = p.description || null;
  if (p.attributes !== undefined) dbObj.attributes = p.attributes;
  if (p.branchStock !== undefined) dbObj.branch_stock = p.branchStock;
  return dbObj;
}

function toFeProduct(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    vehicle: p.vehicle,
    category: p.category,
    supplierId: p.supplier_id,
    buyPrice: Number(p.buy_price || 0),
    sellPrice: Number(p.sell_price || 0),
    quantity: Number(p.quantity || 0),
    minQty: Number(p.min_qty || 0),
    image: p.image,
    description: p.description,
    attributes: p.attributes || {},
    branchStock: p.branch_stock || {}
  };
}

// 2. CUSTOMERS
function toDbCustomer(c) {
  if (!c) return null;
  const dbObj = {};
  if (c.id !== undefined) dbObj.id = c.id;
  if (c.name !== undefined) dbObj.name = c.name;
  if (c.phone !== undefined) dbObj.phone = c.phone;
  if (c.address !== undefined) dbObj.address = c.address;
  if (c.vehicle !== undefined) dbObj.vehicle = c.vehicle || null;
  if (c.totalPurchases !== undefined) dbObj.total_purchases = c.totalPurchases;
  if (c.debt !== undefined) dbObj.debt = c.debt;
  return dbObj;
}

function toFeCustomer(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    vehicle: c.vehicle,
    totalPurchases: Number(c.total_purchases || 0),
    debt: Number(c.debt || 0)
  };
}

// 3. EMPLOYEES
function toDbEmployee(e) {
  if (!e) return null;
  const dbObj = {};
  if (e.id !== undefined) dbObj.id = e.id;
  if (e.name !== undefined) dbObj.name = e.name;
  if (e.phone !== undefined) dbObj.phone = e.phone;
  if (e.role !== undefined) dbObj.role = e.role;
  if (e.salary !== undefined) dbObj.salary = e.salary;
  if (e.advance !== undefined) dbObj.advance = e.advance;
  if (e.hireDate !== undefined) dbObj.hire_date = e.hireDate;
  if (e.status !== undefined) dbObj.status = e.status;
  return dbObj;
}

function toFeEmployee(e) {
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    phone: e.phone,
    role: e.role,
    salary: Number(e.salary || 0),
    advance: Number(e.advance || 0),
    hireDate: e.hire_date,
    status: e.status
  };
}

// 4. INCOMING
function toDbIncoming(i) {
  if (!i) return null;
  const dbObj = {};
  if (i.id !== undefined) dbObj.id = i.id;
  if (i.date !== undefined) dbObj.date = i.date;
  if (i.supplierId !== undefined) dbObj.supplier_id = i.supplierId || null;
  if (i.productId !== undefined) dbObj.product_id = i.productId || null;
  if (i.qty !== undefined) dbObj.qty = i.qty;
  if (i.buyPrice !== undefined) dbObj.buy_price = i.buyPrice;
  if (i.invoice !== undefined) dbObj.invoice = i.invoice;
  return dbObj;
}

function toFeIncoming(i) {
  if (!i) return null;
  return {
    id: i.id,
    date: i.date,
    supplierId: i.supplier_id,
    productId: i.product_id,
    qty: Number(i.qty || 0),
    buyPrice: Number(i.buy_price || 0),
    invoice: i.invoice
  };
}

// 5. SALES & SALE ITEMS
function toDbSale(s) {
  if (!s) return null;
  const dbObj = {};
  if (s.id !== undefined) dbObj.id = s.id;
  if (s.date !== undefined) dbObj.date = s.date;
  if (s.customerId !== undefined) dbObj.customer_id = s.customerId || null;
  if (s.sellerId !== undefined) dbObj.seller_id = s.sellerId || null;
  if (s.discount !== undefined) dbObj.discount = s.discount;
  if (s.paymentType !== undefined) dbObj.payment_type = s.paymentType;
  if (s.total !== undefined) dbObj.total = s.total;
  if (s.profit !== undefined) dbObj.profit = s.profit;
  return dbObj;
}

function toFeSale(s, items = []) {
  if (!s) return null;
  return {
    id: s.id,
    date: s.date,
    customerId: s.customer_id,
    sellerId: s.seller_id,
    discount: Number(s.discount || 0),
    paymentType: s.payment_type,
    total: Number(s.total || 0),
    profit: Number(s.profit || 0),
    items: items.map(i => ({
      productId: i.product_id,
      qty: Number(i.qty || 0),
      price: Number(i.price || 0),
      buyPrice: Number(i.buy_price || 0)
    }))
  };
}

// 6. DEBT PAYMENTS
function toDbDebtPayment(p) {
  if (!p) return null;
  const dbObj = {};
  if (p.id !== undefined) dbObj.id = p.id;
  if (p.date !== undefined) dbObj.date = p.date;
  if (p.type !== undefined) dbObj.type = p.type;
  if (p.targetId !== undefined) dbObj.target_id = p.targetId;
  if (p.targetName !== undefined) dbObj.target_name = p.targetName;
  if (p.amount !== undefined) dbObj.amount = p.amount;
  if (p.paymentMethod !== undefined) dbObj.payment_method = p.paymentMethod;
  if (p.note !== undefined) dbObj.note = p.note;
  return dbObj;
}

function toFeDebtPayment(p) {
  if (!p) return null;
  return {
    id: p.id,
    date: p.date,
    type: p.type,
    targetId: p.target_id,
    targetName: p.target_name,
    amount: Number(p.amount || 0),
    paymentMethod: p.payment_method,
    note: p.note
  };
}

// 7. AUDIT LOGS
function toDbAuditLog(l) {
  if (!l) return null;
  const dbObj = {};
  if (l.id !== undefined) dbObj.id = l.id;
  if (l.ts !== undefined) dbObj.ts = l.ts;
  if (l.userId !== undefined) dbObj.user_id = l.userId;
  if (l.userName !== undefined) dbObj.user_name = l.userName;
  if (l.action !== undefined) dbObj.action = l.action;
  if (l.entity !== undefined) dbObj.entity = l.entity;
  if (l.entityId !== undefined) dbObj.entity_id = l.entityId;
  if (l.summary !== undefined) dbObj.summary = l.summary;
  return dbObj;
}

function toFeAuditLog(l) {
  if (!l) return null;
  return {
    id: l.id,
    ts: l.ts,
    userId: l.user_id,
    userName: l.user_name,
    action: l.action,
    entity: l.entity,
    entityId: l.entity_id,
    summary: l.summary
  };
}

// ─────────────── MAHALLIY JSON DATA YORDAMCHI FUNKSIYALARI ───────────────
const initialJsonDb = {
  app_users: [
    { id: "u_admin", name: "Bosh admin", email: "admin@autoerp.uz", password: bcrypt.hashSync("admin123", 10), role: "Admin", permissions: [], active: true }
  ],
  products: [],
  customers: [],
  suppliers: [],
  employees: [],
  sales: [],
  expenses: [],
  incoming: [],
  categories: ["Dvigatel", "Tormoz tizimi", "Elektr", "Shinalar (Balon)", "Akkumulyator", "Filtrlar", "Moy", "Kuzov qismlari", "Podveska"],
  vehicle_brands: ["Shineray T30", "JAC", "FAW", "ISUZU", "Chevrolet", "Hyundai", "Kia", "Toyota", "Nexia", "Damas", "Labo"],
  branches: ["Asosiy ombor", "Filial 1", "Filial 2"],
  debt_payments: [],
  audit_logs: [],
  price_history: []
};

function readLocalDb() {
  if (!fs.existsSync(DB_JSON_PATH)) {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(initialJsonDb, null, 2));
    return initialJsonDb;
  }
  try {
    const data = fs.readFileSync(DB_JSON_PATH, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return initialJsonDb;
  }
}

function writeLocalDb(db) {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify(db, null, 2));
}

// ─────────────── NARX TARIXI ───────────────
function toFePriceHistory(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    productId: row.product_id,
    productName: row.product_name,
    field: row.field,
    oldValue: row.old_value != null ? Number(row.old_value) : null,
    newValue: Number(row.new_value || 0),
    changedById: row.changed_by_id,
    changedByName: row.changed_by_name,
    createdAt: row.created_at,
  };
}

async function insertPriceHistoryEntries(entries) {
  if (!entries.length) return;
  if (isSupabaseConfigured) {
    const { error } = await supabaseClient.from("price_history").insert(entries);
    if (error) console.error("❌ price_history insert:", error.message);
  } else {
    const db = readLocalDb();
    if (!db.price_history) db.price_history = [];
    for (const e of entries) {
      db.price_history.unshift({
        id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...e,
        created_at: new Date().toISOString(),
      });
    }
    if (db.price_history.length > 5000) db.price_history = db.price_history.slice(0, 5000);
    writeLocalDb(db);
  }
}

async function recordPriceChanges(productId, productName, before, afterDbObj, user) {
  const uid = user?.id || "system";
  const uname = user?.name || "Tizim";
  const entries = [];
  const pairs = [
    ["buy_price", before?.buy_price, afterDbObj.buy_price],
    ["sell_price", before?.sell_price, afterDbObj.sell_price],
  ];
  for (const [field, oldRaw, newRaw] of pairs) {
    if (newRaw === undefined) continue;
    const oldNum = oldRaw != null && oldRaw !== "" ? Number(oldRaw) : null;
    const newNum = Number(newRaw);
    if (oldNum === newNum) continue;
    if (!before && newNum === 0) continue;
    entries.push({
      product_id: productId,
      product_name: productName,
      field,
      old_value: oldNum,
      new_value: newNum,
      changed_by_id: uid,
      changed_by_name: uname,
    });
  }
  await insertPriceHistoryEntries(entries);
}

// ─────────────── MIDDLEWARE: AUTH TOKEN TEKSHIRUVI ───────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Kirish taqiqlangan, token topilmadi" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token yaroqsiz yoki muddati o'tgan" });
    req.user = user;
    next();
  });
}

// ─────────────── API MARSHRUTLARI (ROUTES) ───────────────

// TIZIM HOLATI (diagnostika)
app.get("/api/health", async (_req, res) => {
  res.json({
    ok: true,
    supabase: isSupabaseConfigured,
    redis: isRedisConnected,
    port: Number(PORT),
    mode: isSupabaseConfigured ? "supabase" : "local-json",
  });
});

// 1. TIZIMGA KIRISH (LOGIN)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email va parol kiritilishi shart" });

  try {
    let user = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("app_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("active", true)
        .single();
      
      if (data) user = data;
    } else {
      const db = readLocalDb();
      user = db.app_users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    }

    // Default admin fallback agar hech qanday foydalanuvchi bo'lmasa
    if (!user && email.toLowerCase() === "admin@autoerp.uz") {
      const defaultHash = bcrypt.hashSync("admin123", 10);
      user = { id: "u_admin", name: "Bosh admin", email: "admin@autoerp.uz", password: defaultHash, role: "Admin", permissions: [], active: true };
      if (isSupabaseConfigured) {
        await supabaseClient.from("app_users").upsert(
          {
            id: user.id,
            name: user.name,
            email: user.email,
            password: defaultHash,
            role: user.role,
            permissions: [],
            active: true,
          },
          { onConflict: "id" }
        );
      } else {
        const db = readLocalDb();
        if (!db.app_users.find((u) => u.id === user.id)) {
          db.app_users.push(user);
          writeLocalDb(db);
        }
      }
    }

    if (!user) return res.status(400).json({ error: "Email yoki parol noto'g'ri" });

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ error: "Email yoki parol noto'g'ri" });

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions || [] };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user: payload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// JORIY SESSIYA USERINI OLISH
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 2. TOVARLAR MARSHRUTLARI (PRODUCTS)
app.get("/api/products", async (req, res) => {
  const cacheKey = "cache:products";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      const mapped = (data || []).map(toFeProduct);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.products);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/products", authenticateToken, async (req, res) => {
  const p = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbProduct(p);
      console.log("📦 [Products POST] Ma'lumot:", JSON.stringify(dbObj, null, 2));
      const { data, error } = await supabaseClient.from("products").insert([dbObj]).select().single();
      if (error) {
        console.error("❌ [Products POST] Supabase xatolik:", error.message, error.details, error.hint);
        throw error;
      }
      await recordPriceChanges(data.id, data.name, null, dbObj, req.user);
      await clearCached("cache:products");
      res.json(toFeProduct(data));
    } else {
      const db = readLocalDb();
      db.products.unshift(p);
      writeLocalDb(db);
      const dbObj = toDbProduct(p);
      await recordPriceChanges(p.id, p.name, null, dbObj, req.user);
      res.json(p);
    }
  } catch (error) {
    console.error("❌ [Products POST] Xatolik:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const { data: before } = await supabaseClient.from("products").select("*").eq("id", id).single();
      const dbObj = toDbProduct(updates);
      delete dbObj.id;
      console.log(`📦 [Products PUT] ID: ${id}, Ma'lumot:`, JSON.stringify(dbObj, null, 2));
      const { data, error } = await supabaseClient.from("products").update(dbObj).eq("id", id).select().single();
      if (error) {
        console.error("❌ [Products PUT] Supabase xatolik:", error.message, error.details, error.hint);
        throw error;
      }
      await recordPriceChanges(id, data.name, before, dbObj, req.user);
      await clearCached("cache:products");
      res.json(toFeProduct(data));
    } else {
      const db = readLocalDb();
      const before = db.products.find((x) => x.id === id);
      const beforeDb = before ? toDbProduct(before) : null;
      db.products = db.products.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      const updated = db.products.find(x => x.id === id);
      const dbObj = toDbProduct(updates);
      await recordPriceChanges(id, updated?.name || id, beforeDb, dbObj, req.user);
      res.json(updated);
    }
  } catch (error) {
    console.error("❌ [Products PUT] Xatolik:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("products").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:products");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.products = db.products.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Narx tarixi
app.get("/api/price-history", authenticateToken, async (req, res) => {
  const productId = req.query.productId;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  try {
    if (isSupabaseConfigured) {
      let q = supabaseClient.from("price_history").select("*").order("created_at", { ascending: false }).limit(limit);
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      res.json((data || []).map(toFePriceHistory));
    } else {
      const db = readLocalDb();
      let rows = db.price_history || [];
      if (productId) rows = rows.filter((r) => r.product_id === productId);
      res.json(rows.slice(0, limit).map(toFePriceHistory));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/products/:id/price-history", authenticateToken, async (req, res) => {
  const productId = req.params.id;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("price_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      res.json((data || []).map(toFePriceHistory));
    } else {
      const db = readLocalDb();
      const rows = (db.price_history || []).filter((r) => r.product_id === productId);
      res.json(rows.slice(0, limit).map(toFePriceHistory));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tovarlarni ommaviy import
app.post("/api/products/import", authenticateToken, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "Import ro'yxati bo'sh" });

  const result = { created: 0, failed: 0, errors: [] };

  for (const raw of items) {
    try {
      const p = { ...raw };
      if (!p.id) p.id = `prd_${Math.random().toString(36).slice(2, 9)}`;
      if (!p.name) throw new Error("Nomi majburiy");

      if (isSupabaseConfigured) {
        const dbObj = toDbProduct(p);
        const { data: existing } = await supabaseClient.from("products").select("id").eq("id", p.id).maybeSingle();
        if (existing) {
          const { data: before } = await supabaseClient.from("products").select("*").eq("id", p.id).single();
          delete dbObj.id;
          const { error } = await supabaseClient.from("products").update(dbObj).eq("id", p.id);
          if (error) throw error;
          await recordPriceChanges(p.id, p.name, before, dbObj, req.user);
        } else {
          const { error } = await supabaseClient.from("products").insert([dbObj]);
          if (error) throw error;
          await recordPriceChanges(p.id, p.name, null, dbObj, req.user);
        }
      } else {
        const db = readLocalDb();
        const idx = db.products.findIndex((x) => x.id === p.id);
        if (idx >= 0) {
          const beforeDb = toDbProduct(db.products[idx]);
          db.products[idx] = { ...db.products[idx], ...p };
          await recordPriceChanges(p.id, p.name, beforeDb, toDbProduct(p), req.user);
        } else {
          db.products.unshift(p);
          await recordPriceChanges(p.id, p.name, null, toDbProduct(p), req.user);
        }
        writeLocalDb(db);
      }
      result.created++;
    } catch (e) {
      result.failed++;
      result.errors.push({ name: raw.name || raw.id, error: e.message });
    }
  }

  await clearCached("cache:products");
  res.json(result);
});

// 3. MIJOZLAR MARSHRUTLARI (CUSTOMERS)
app.get("/api/customers", async (req, res) => {
  const cacheKey = "cache:customers";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      const mapped = (data || []).map(toFeCustomer);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.customers);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/customers", authenticateToken, async (req, res) => {
  const c = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbCustomer(c);
      const { data, error } = await supabaseClient.from("customers").insert([dbObj]).select().single();
      if (error) throw error;
      
      await clearCached("cache:customers");
      res.json(toFeCustomer(data));
    } else {
      const db = readLocalDb();
      db.customers.unshift(c);
      writeLocalDb(db);
      res.json(c);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/customers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbCustomer(updates);
      const { data, error } = await supabaseClient.from("customers").update(dbObj).eq("id", id).select().single();
      if (error) throw error;
      
      await clearCached("cache:customers");
      res.json(toFeCustomer(data));
    } else {
      const db = readLocalDb();
      db.customers = db.customers.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      res.json(db.customers.find(x => x.id === id));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/customers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("customers").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:customers");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.customers = db.customers.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. YETKAZIB BERUVCHILAR (SUPPLIERS)
app.get("/api/suppliers", async (req, res) => {
  const cacheKey = "cache:suppliers";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("suppliers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      await setCached(cacheKey, data);
      res.json(data);
    } else {
      const db = readLocalDb();
      res.json(db.suppliers);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/suppliers", authenticateToken, async (req, res) => {
  const s = req.body;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("suppliers").insert([s]).select().single();
      if (error) throw error;
      
      await clearCached("cache:suppliers");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.suppliers.unshift(s);
      writeLocalDb(db);
      res.json(s);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/suppliers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("suppliers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      
      await clearCached("cache:suppliers");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.suppliers = db.suppliers.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      res.json(db.suppliers.find(x => x.id === id));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/suppliers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:suppliers");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.suppliers = db.suppliers.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. XODIMLAR MARSHRUTLARI (EMPLOYEES)
app.get("/api/employees", async (req, res) => {
  const cacheKey = "cache:employees";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("employees").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      const mapped = (data || []).map(toFeEmployee);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.employees);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/employees", authenticateToken, async (req, res) => {
  const e = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbEmployee(e);
      const { data, error } = await supabaseClient.from("employees").insert([dbObj]).select().single();
      if (error) throw error;
      
      await clearCached("cache:employees");
      res.json(toFeEmployee(data));
    } else {
      const db = readLocalDb();
      db.employees.unshift(e);
      writeLocalDb(db);
      res.json(e);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/employees/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbEmployee(updates);
      const { data, error } = await supabaseClient.from("employees").update(dbObj).eq("id", id).select().single();
      if (error) throw error;
      
      await clearCached("cache:employees");
      res.json(toFeEmployee(data));
    } else {
      const db = readLocalDb();
      db.employees = db.employees.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      res.json(db.employees.find(x => x.id === id));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/employees/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("employees").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:employees");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.employees = db.employees.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. XARAJATLAR MARSHRUTLARI (EXPENSES)
app.get("/api/expenses", async (req, res) => {
  const cacheKey = "cache:expenses";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("expenses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      await setCached(cacheKey, data);
      res.json(data);
    } else {
      const db = readLocalDb();
      res.json(db.expenses);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/expenses", authenticateToken, async (req, res) => {
  const e = req.body;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("expenses").insert([e]).select().single();
      if (error) throw error;
      await clearCached("cache:expenses");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.expenses.unshift(e);
      writeLocalDb(db);
      res.json(e);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/expenses/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("expenses").update(updates).eq("id", id).select().single();
      if (error) throw error;
      await clearCached("cache:expenses");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.expenses = db.expenses.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      res.json(db.expenses.find(x => x.id === id));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/expenses/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("expenses").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:expenses");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.expenses = db.expenses.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. SOTUVLAR MARSHRUTLARI (SALES INTEGRATION)
app.get("/api/sales", async (req, res) => {
  const cacheKey = "cache:sales";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data: sales, error: err1 } = await supabaseClient.from("sales").select("*").order("created_at", { ascending: false });
      if (err1) throw err1;

      const { data: items, error: err2 } = await supabaseClient.from("sale_items").select("*");
      if (err2) throw err2;

      const fullSales = sales.map(s => {
        const matchingItems = items.filter(i => i.sale_id === s.id);
        return toFeSale(s, matchingItems);
      });

      await setCached(cacheKey, fullSales);
      res.json(fullSales);
    } else {
      const db = readLocalDb();
      res.json(db.sales);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sales", authenticateToken, async (req, res) => {
  const sale = req.body; // { id, date, customerId, sellerId, items: [...], discount, paymentType, total, profit }
  const { items, ...saleMeta } = sale;

  try {
    if (isSupabaseConfigured) {
      const dbSaleMeta = toDbSale(saleMeta);
      const { data: createdSale, error: err1 } = await supabaseClient.from("sales").insert([dbSaleMeta]).select().single();
      if (err1) throw err1;

      const itemsToInsert = items.map(i => ({
        sale_id: sale.id,
        product_id: i.productId,
        qty: i.qty,
        price: i.price,
        buy_price: i.buyPrice
      }));
      const { error: err2 } = await supabaseClient.from("sale_items").insert(itemsToInsert);
      if (err2) throw err2;

      for (const i of items) {
        const { data: prod } = await supabaseClient.from("products").select("quantity").eq("id", i.productId).single();
        if (prod) {
          await supabaseClient.from("products").update({ quantity: Math.max(0, prod.quantity - i.qty) }).eq("id", i.productId);
        }
      }

      if (sale.paymentType === "Qarz" && sale.customerId) {
        const { data: cust } = await supabaseClient.from("customers").select("debt", "total_purchases").eq("id", sale.customerId).single();
        if (cust) {
          await supabaseClient.from("customers").update({
            debt: cust.debt + sale.total,
            total_purchases: cust.total_purchases + sale.total
          }).eq("id", sale.customerId);
        }
      } else if (sale.customerId) {
        const { data: cust } = await supabaseClient.from("customers").select("total_purchases").eq("id", sale.customerId).single();
        if (cust) {
          await supabaseClient.from("customers").update({
            total_purchases: cust.total_purchases + sale.total
          }).eq("id", sale.customerId);
        }
      }

      await Promise.all([
        clearCached("cache:sales"),
        clearCached("cache:products"),
        clearCached("cache:customers")
      ]);

      res.json(toFeSale(createdSale, items.map(i => ({ product_id: i.productId, qty: i.qty, price: i.price, buy_price: i.buyPrice }))));
    } else {
      const db = readLocalDb();
      db.products = db.products.map(p => {
        const item = items.find(i => i.productId === p.id);
        return item ? { ...p, quantity: Math.max(0, p.quantity - item.qty) } : p;
      });

      db.customers = db.customers.map(c => {
        if (c.id !== sale.customerId) return c;
        const debtDelta = sale.paymentType === "Qarz" ? sale.total : 0;
        return { ...c, debt: c.debt + debtDelta, totalPurchases: c.totalPurchases + sale.total };
      });

      db.sales.unshift(sale);
      writeLocalDb(db);
      res.json(sale);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/sales/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { data: sale } = await supabaseClient.from("sales").select("*").eq("id", id).single();
      if (!sale) return res.status(404).json({ error: "Sotuv topilmadi" });

      const { data: items } = await supabaseClient.from("sale_items").select("*").eq("sale_id", id);

      if (items) {
        for (const i of items) {
          const { data: prod } = await supabaseClient.from("products").select("quantity").eq("id", i.product_id).single();
          if (prod) {
            await supabaseClient.from("products").update({ quantity: prod.quantity + i.qty }).eq("id", i.product_id);
          }
        }
      }

      if (sale.customer_id) {
        const { data: cust } = await supabaseClient.from("customers").select("debt", "total_purchases").eq("id", sale.customer_id).single();
        if (cust) {
          const debtDelta = sale.payment_type === "Qarz" ? sale.total : 0;
          await supabaseClient.from("customers").update({
            debt: Math.max(0, cust.debt - debtDelta),
            total_purchases: Math.max(0, cust.total_purchases - sale.total)
          }).eq("id", sale.customer_id);
        }
      }

      await supabaseClient.from("sales").delete().eq("id", id);

      await Promise.all([
        clearCached("cache:sales"),
        clearCached("cache:products"),
        clearCached("cache:customers")
      ]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      const s = db.sales.find(x => x.id === id);
      if (!s) return res.status(404).json({ error: "Sotuv topilmadi" });

      db.products = db.products.map(p => {
        const item = s.items.find(i => i.productId === p.id);
        return item ? { ...p, quantity: p.quantity + item.qty } : p;
      });

      db.customers = db.customers.map(c => {
        if (c.id !== s.customerId) return c;
        const debtDelta = s.paymentType === "Qarz" ? s.total : 0;
        return { ...c, debt: Math.max(0, c.debt - debtDelta), totalPurchases: Math.max(0, c.totalPurchases - s.total) };
      });

      db.sales = db.sales.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. KIRIMLAR MARSHRUTLARI (INCOMING STOCK)
app.get("/api/incoming", async (req, res) => {
  const cacheKey = "cache:incoming";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("incoming").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      const mapped = (data || []).map(toFeIncoming);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.incoming);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/incoming", authenticateToken, async (req, res) => {
  const i = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbIncoming(i);
      const { data, error } = await supabaseClient.from("incoming").insert([dbObj]).select().single();
      if (error) throw error;

      const { data: prod } = await supabaseClient.from("products").select("quantity").eq("id", i.productId).single();
      if (prod) {
        await supabaseClient.from("products").update({ quantity: prod.quantity + i.qty }).eq("id", i.productId);
      }

      await Promise.all([
        clearCached("cache:incoming"),
        clearCached("cache:products")
      ]);

      res.json(toFeIncoming(data));
    } else {
      const db = readLocalDb();
      db.products = db.products.map(p => p.id === i.productId ? { ...p, quantity: p.quantity + i.qty } : p);
      db.incoming.unshift(i);
      writeLocalDb(db);
      res.json(i);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/incoming/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { data: inc } = await supabaseClient.from("incoming").select("*").eq("id", id).single();
      if (!inc) return res.status(404).json({ error: "Kirim topilmadi" });

      const { data: prod } = await supabaseClient.from("products").select("quantity").eq("id", inc.product_id).single();
      if (prod) {
        await supabaseClient.from("products").update({ quantity: Math.max(0, prod.quantity - inc.qty) }).eq("id", inc.product_id);
      }

      await supabaseClient.from("incoming").delete().eq("id", id);

      await Promise.all([
        clearCached("cache:incoming"),
        clearCached("cache:products")
      ]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      const inc = db.incoming.find(x => x.id === id);
      if (!inc) return res.status(404).json({ error: "Kirim topilmadi" });

      db.products = db.products.map(p => p.id === inc.productId ? { ...p, quantity: Math.max(0, p.quantity - inc.qty) } : p);
      db.incoming = db.incoming.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. QARZ TO'LOVLARI (DEBT PAYMENTS)
app.get("/api/debt-payments", async (req, res) => {
  const cacheKey = "cache:debt_payments";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("debt_payments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      const mapped = (data || []).map(toFeDebtPayment);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.debt_payments);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/debt-payments", authenticateToken, async (req, res) => {
  const p = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbDebtPayment(p);
      const { data, error } = await supabaseClient.from("debt_payments").insert([dbObj]).select().single();
      if (error) throw error;

      if (p.type === "customer") {
        const { data: cust } = await supabaseClient.from("customers").select("debt").eq("id", p.targetId).single();
        if (cust) {
          await supabaseClient.from("customers").update({ debt: Math.max(0, cust.debt - p.amount) }).eq("id", p.targetId);
        }
      } else if (p.type === "supplier") {
        const { data: supp } = await supabaseClient.from("suppliers").select("debt").eq("id", p.targetId).single();
        if (supp) {
          await supabaseClient.from("suppliers").update({ debt: Math.max(0, supp.debt - p.amount) }).eq("id", p.targetId);
        }
      }

      await Promise.all([
        clearCached("cache:debt_payments"),
        clearCached("cache:customers"),
        clearCached("cache:suppliers")
      ]);

      res.json(toFeDebtPayment(data));
    } else {
      const db = readLocalDb();
      db.customers = db.customers.map(c => {
        if (p.type === "customer" && c.id === p.targetId) {
          return { ...c, debt: Math.max(0, c.debt - p.amount) };
        }
        return c;
      });
      db.suppliers = db.suppliers.map(s => {
        if (p.type === "supplier" && s.id === p.targetId) {
          return { ...s, debt: Math.max(0, s.debt - p.amount) };
        }
        return s;
      });
      db.debt_payments.unshift(p);
      writeLocalDb(db);
      res.json(p);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. FOYDALANUVCHILARNI BOSHQARISH (USERS - ONLY FOR ADMIN)
app.get("/api/users", authenticateToken, async (req, res) => {
  const cacheKey = "cache:users";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("app_users").select("id, name, email, role, permissions, active").order("created_at", { ascending: false });
      if (error) throw error;
      await setCached(cacheKey, data);
      res.json(data);
    } else {
      const db = readLocalDb();
      res.json(db.app_users.map(({ password, ...u }) => u));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", authenticateToken, async (req, res) => {
  const u = req.body;
  u.password = bcrypt.hashSync(u.password || "user123", 10);
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("app_users").insert([u]).select("id, name, email, role, permissions, active").single();
      if (error) throw error;
      await clearCached("cache:users");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.app_users.unshift(u);
      writeLocalDb(db);
      const { password, ...safeUser } = u;
      res.json(safeUser);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (updates.password) {
    updates.password = bcrypt.hashSync(updates.password, 10);
  }
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("app_users").update(updates).eq("id", id).select("id, name, email, role, permissions, active").single();
      if (error) throw error;
      await clearCached("cache:users");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.app_users = db.app_users.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      const user = db.app_users.find(x => x.id === id);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("app_users").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:users");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.app_users = db.app_users.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. AUDIT LOGS
app.get("/api/audit-logs", authenticateToken, async (req, res) => {
  const cacheKey = "cache:audit_logs";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("audit_logs").select("*").order("ts", { ascending: false }).limit(2000);
      if (error) throw error;
      
      const mapped = (data || []).map(toFeAuditLog);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.audit_logs);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/audit-logs", authenticateToken, async (req, res) => {
  const log = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbAuditLog(log);
      const { data, error } = await supabaseClient.from("audit_logs").insert([dbObj]).select().single();
      if (error) throw error;
      
      await clearCached("cache:audit_logs");
      res.json(toFeAuditLog(data));
    } else {
      const db = readLocalDb();
      db.audit_logs.unshift(log);
      if (db.audit_logs.length > 2000) db.audit_logs = db.audit_logs.slice(0, 2000);
      writeLocalDb(db);
      res.json(log);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/audit-logs", authenticateToken, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      await supabaseClient.from("audit_logs").delete().neq("id", "");
      await clearCached("cache:audit_logs");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.audit_logs = [];
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. BOSHQA QO'SHIMCHA METODLAR: KATEGORIYALAR, BRENDLAR, FILIALLAR

// Konstantalarni biryo'la olish (dastlabki yuklanish uchun)
app.get("/api/constants", async (req, res) => {
  const cacheKey = "cache:constants";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data: cats } = await supabaseClient.from("categories").select("name");
      const { data: brands } = await supabaseClient.from("vehicle_brands").select("name");
      const { data: branches } = await supabaseClient.from("branches").select("name");

      const resData = {
        categories: (cats || []).map(c => c.name),
        vehicleBrands: (brands || []).map(b => b.name),
        branches: (branches || []).map(br => br.name)
      };
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json({
        categories: db.categories,
        vehicleBrands: db.vehicle_brands,
        branches: db.branches
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// KATEGORIYALAR CRUD
app.get("/api/categories", async (req, res) => {
  const cacheKey = "cache:categories";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("categories").select("name");
      if (error) throw error;
      const resData = (data || []).map(c => c.name);
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json(db.categories);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/categories", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Kategoriya nomi kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("categories").insert([{ name: name.trim() }]).select().single();
      if (error) throw error;
      await Promise.all([
        clearCached("cache:categories"),
        clearCached("cache:constants")
      ]);
      res.json(data);
    } else {
      const db = readLocalDb();
      const n = name.trim();
      if (db.categories.includes(n)) return res.status(400).json({ error: "Bu kategoriya mavjud" });
      db.categories.push(n);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/categories/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim()) return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("categories").update({ name: newName.trim() }).eq("name", oldName).select().single();
      if (error) throw error;
      
      await supabaseClient.from("products").update({ category: newName.trim() }).eq("category", oldName);
      
      await Promise.all([
        clearCached("cache:categories"),
        clearCached("cache:constants"),
        clearCached("cache:products")
      ]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = newName.trim();
      db.categories = db.categories.map(c => c === oldName ? n : c);
      db.products = db.products.map(p => p.category === oldName ? { ...p, category: n } : p);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/categories/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("categories").delete().eq("name", name);
      if (error) throw error;
      
      await Promise.all([
        clearCached("cache:categories"),
        clearCached("cache:constants")
      ]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.categories = db.categories.filter(c => c !== name);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MASHINA BRENDLARI CRUD
app.get("/api/vehicle-brands", async (req, res) => {
  const cacheKey = "cache:vehicle_brands";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("vehicle_brands").select("name");
      if (error) throw error;
      const resData = (data || []).map(b => b.name);
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json(db.vehicle_brands);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/vehicle-brands", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Brend nomi kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("vehicle_brands").insert([{ name: name.trim() }]).select().single();
      if (error) throw error;
      
      await Promise.all([
        clearCached("cache:vehicle_brands"),
        clearCached("cache:constants")
      ]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = name.trim();
      if (db.vehicle_brands.includes(n)) return res.status(400).json({ error: "Bu brend mavjud" });
      db.vehicle_brands.push(n);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/vehicle-brands/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim()) return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("vehicle_brands").update({ name: newName.trim() }).eq("name", oldName).select().single();
      if (error) throw error;
      await supabaseClient.from("products").update({ vehicle: newName.trim() }).eq("vehicle", oldName);
      await supabaseClient.from("customers").update({ vehicle: newName.trim() }).eq("vehicle", oldName);
      
      await Promise.all([
        clearCached("cache:vehicle_brands"),
        clearCached("cache:constants"),
        clearCached("cache:products"),
        clearCached("cache:customers")
      ]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = newName.trim();
      db.vehicle_brands = db.vehicle_brands.map(b => b === oldName ? n : b);
      db.products = db.products.map(p => p.vehicle === oldName ? { ...p, vehicle: n } : p);
      db.customers = db.customers.map(c => c.vehicle === oldName ? { ...c, vehicle: n } : c);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/vehicle-brands/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("vehicle_brands").delete().eq("name", name);
      if (error) throw error;
      
      await Promise.all([
        clearCached("cache:vehicle_brands"),
        clearCached("cache:constants")
      ]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.vehicle_brands = db.vehicle_brands.filter(b => b !== name);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FILIALLAR (BRANCHES) CRUD
app.get("/api/branches", async (req, res) => {
  const cacheKey = "cache:branches";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("branches").select("name");
      if (error) throw error;
      const resData = (data || []).map(br => br.name);
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json(db.branches);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/branches", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Filial nomi kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("branches").insert([{ name: name.trim() }]).select().single();
      if (error) throw error;
      
      await Promise.all([
        clearCached("cache:branches"),
        clearCached("cache:constants")
      ]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = name.trim();
      if (db.branches.includes(n)) return res.status(400).json({ error: "Bu filial mavjud" });
      db.branches.push(n);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/branches/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim()) return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("branches").update({ name: newName.trim() }).eq("name", oldName).select().single();
      if (error) throw error;
      
      await Promise.all([
        clearCached("cache:branches"),
        clearCached("cache:constants")
      ]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = newName.trim();
      db.branches = db.branches.map(b => b === oldName ? n : b);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/branches/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("branches").delete().eq("name", name);
      if (error) throw error;
      
      await Promise.all([
        clearCached("cache:branches"),
        clearCached("cache:constants")
      ]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.branches = db.branches.filter(b => b !== name);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ULANISH VA ISHGA TUSHIRISH
app.listen(PORT, async () => {
  console.log(`📡 AutoERP Pro backend server port ${PORT} da muvaffaqiyatli ishga tushdi!`);
  console.log(`🔗 API manzili: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  await ensureDefaultAdmin();
});
