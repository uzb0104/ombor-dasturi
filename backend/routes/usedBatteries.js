import express from "express";
import {
  isSupabaseConfigured,
  supabaseClient,
  readLocalDb,
  writeLocalDb,
  getCached,
  setCached,
  clearCached,
} from "../lib/db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

function toSnakeCase(item) {
  if (!item) return item;
  const res = { ...item };
  if (item.customerName !== undefined) {
    res.customer_name = item.customerName;
    delete res.customerName;
  }
  if (item.factoryName !== undefined) {
    res.factory_name = item.factoryName;
    delete res.factoryName;
  }
  if (item.batteryType !== undefined) {
    res.battery_type = item.batteryType;
    delete res.batteryType;
  }
  if (item.weightKg !== undefined) {
    res.weight_kg = item.weightKg;
    delete res.weightKg;
  }
  if (item.pricePerKg !== undefined) {
    res.price_per_kg = item.pricePerKg;
    delete res.pricePerKg;
  }
  if (item.totalAmount !== undefined) {
    res.total_amount = item.totalAmount;
    delete res.totalAmount;
  }
  if (item.paymentMethod !== undefined) {
    res.payment_method = item.paymentMethod;
    delete res.paymentMethod;
  }
  return res;
}

function toCamelCase(item) {
  if (!item) return item;
  return {
    id: item.id,
    date: item.date,
    type: item.type,
    customerName: item.customer_name || item.customerName,
    factoryName: item.factory_name || item.factoryName,
    batteryType: item.battery_type || item.batteryType,
    weightKg: item.weight_kg !== undefined ? Number(item.weight_kg) : Number(item.weightKg || 0),
    pricePerKg:
      item.price_per_kg !== undefined && item.price_per_kg !== null
        ? Number(item.price_per_kg)
        : item.pricePerKg
          ? Number(item.pricePerKg)
          : undefined,
    totalAmount:
      item.total_amount !== undefined ? Number(item.total_amount) : Number(item.totalAmount || 0),
    paymentMethod: item.payment_method || item.paymentMethod,
    status: item.status,
    note: item.note,
  };
}

// GET all used batteries
router.get("/", authenticateToken, async (_req, res) => {
  const cacheKey = "cache:used_batteries";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("used_batteries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback to empty list or throw
        console.warn(
          "⚠️ Supabase used_batteries o'qishda xatolik (jadval yaratilganini tekshiring):",
          error.message,
        );
        throw error;
      }

      const formatted = (data || []).map(toCamelCase);
      await setCached(cacheKey, formatted);
      res.json(formatted);
    } else {
      const db = readLocalDb();
      res.json(db.used_batteries || []);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new used battery entry
router.post("/", authenticateToken, async (req, res) => {
  const body = req.body;
  try {
    if (isSupabaseConfigured) {
      const snakeData = toSnakeCase(body);
      const { data, error } = await supabaseClient
        .from("used_batteries")
        .insert([snakeData])
        .select()
        .single();

      if (error) throw error;
      await clearCached("cache:used_batteries");
      res.json(toCamelCase(data));
    } else {
      const db = readLocalDb();
      if (!db.used_batteries) db.used_batteries = [];
      db.used_batteries.unshift(body);
      writeLocalDb(db);
      res.json(body);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update used battery entry
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const snakeData = toSnakeCase(updates);
      const { data, error } = await supabaseClient
        .from("used_batteries")
        .update(snakeData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      await clearCached("cache:used_batteries");
      res.json(toCamelCase(data));
    } else {
      const db = readLocalDb();
      if (!db.used_batteries) db.used_batteries = [];
      db.used_batteries = db.used_batteries.map((x) => (x.id === id ? { ...x, ...updates } : x));
      writeLocalDb(db);
      res.json(db.used_batteries.find((x) => x.id === id));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE used battery entry
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("used_batteries").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:used_batteries");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      if (!db.used_batteries) db.used_batteries = [];
      db.used_batteries = db.used_batteries.filter((x) => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
