import { createClient } from "@supabase/supabase-js";
import { createClient as createRedisClient } from "redis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DB_JSON_PATH = path.join(__dirname, "..", "db.json");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export let isSupabaseConfigured = false;
export let supabaseClient = null;

if (
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes("your-supabase-project") &&
  supabaseKey !== "your-supabase-anon-key-here"
) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    isSupabaseConfigured = true;
    console.log("🚀 Supabase ma'lumotlar bazasi muvaffaqiyatli ulandi!");
  } catch (error) {
    console.error("❌ Supabase ulanishida xatolik, Mahalliy rejimga o'tilmoqda:", error.message);
  }
}

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ DIQQAT: Supabase sozlanmagan! Tizim avtomatik ravishda MAHALLIY JSON DATABASE rejimida ishlamoqda.",
  );
  console.warn(`📂 Ma'lumotlar saqlanish fayli: ${DB_JSON_PATH}`);
}

const initialJsonDb = {
  app_users: [],
  products: [],
  customers: [],
  suppliers: [],
  employees: [],
  sales: [],
  expenses: [],
  incoming: [],
  categories: [
    "Dvigatel",
    "Tormoz tizimi",
    "Elektr",
    "Shinalar (Balon)",
    "Akkumulyator",
    "Filtrlar",
    "Moy",
    "Kuzov qismlari",
    "Podveska",
  ],
  vehicle_brands: [
    "Shineray T30",
    "JAC",
    "FAW",
    "ISUZU",
    "Chevrolet",
    "Hyundai",
    "Kia",
    "Toyota",
    "Nexia",
    "Damas",
    "Labo",
  ],
  branches: ["Asosiy ombor", "Filial 1", "Filial 2"],
  debt_payments: [],
  audit_logs: [],
  price_history: [],
};

export function readLocalDb() {
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

export function writeLocalDb(db) {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify(db, null, 2));
}

// ─────────────── REDIS INTEGRATSIYASI UCHUN IN-MEMORY FALLBACK KESH TIZIMI ───────────────
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let redisClient = null;
export let isRedisConnected = false;

const localMemoryCache = new Map();
const localMemoryCacheExpiry = new Map();

try {
  redisClient = createRedisClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          return new Error("Redis reconnection retries exhausted");
        }
        return Math.min(retries * 100, 1000);
      },
    },
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
    console.log(
      "⚠️ Redis serveri topilmadi. Tizim tezkor ishlashi uchun vaqtinchalik mahalliy tezkor xotira (In-Memory Cache) ishlatiladi.",
    );
  });
} catch (error) {
  console.log("⚠️ Redis ulanishida xatolik, mahalliy tezkor xotira ishlatiladi:", error.message);
}

export async function getCached(key) {
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

export async function setCached(key, data, ttl = 60) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      console.log(`💾 [Redis Cache] Saqlandi: ${key}`);
    } catch (err) {
      console.error(`❌ Redis set xatosi (${key}):`, err.message);
    }
  } else {
    const now = Date.now();
    localMemoryCache.set(key, JSON.stringify(data));
    localMemoryCacheExpiry.set(key, now + ttl * 1000);
    console.log(`💾 [Memory Cache] Saqlandi: ${key} (TTL: ${ttl}s)`);
  }
}

export async function clearCached(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      console.log(`🧹 [Redis Cache] Tozalandi: ${key}`);
    } catch (err) {
      console.error(`❌ Redis del xatosi (${key}):`, err.message);
    }
  } else {
    localMemoryCache.delete(key);
    localMemoryCacheExpiry.delete(key);
    console.log(`🧹 [Memory Cache] Tozalandi: ${key}`);
  }
}
