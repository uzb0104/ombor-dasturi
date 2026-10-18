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

// GET ALL VEHICLE BRANDS
router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:vehicle_brands";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("vehicle_brands").select("name");
      if (!error && Array.isArray(data)) {
        const resData = data
          .map((b) => b.name)
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" }));
        await setCached(cacheKey, resData);
        return res.json(resData);
      }
    }
    const db = readLocalDb();
    res.json(
      (db.vehicle_brands || [])
        .slice()
        .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    );
  } catch (error) {
    const db = readLocalDb();
    res.json(
      (db.vehicle_brands || [])
        .slice()
        .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    );
  }
});

// CREATE VEHICLE BRAND
router.post("/", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Brend nomi kiritilishi shart" });
  try {
    const n = name.trim();
    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("vehicle_brands").upsert([{ name: n }], { onConflict: "name" });
      } catch (err) {
        console.warn("⚠️ Supabase vehicle_brands upsert:", err.message);
      }
    }
    const db = readLocalDb();
    if (!db.vehicle_brands) db.vehicle_brands = [];
    if (!db.vehicle_brands.includes(n)) {
      db.vehicle_brands.push(n);
      writeLocalDb(db);
    }
    await Promise.all([clearCached("cache:vehicle_brands"), clearCached("cache:constants")]);
    res.json({ name: n });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE VEHICLE BRAND
router.put("/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim())
    return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    const n = newName.trim();
    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("vehicle_brands").update({ name: n }).eq("name", oldName);
        await supabaseClient.from("products").update({ vehicle: n }).eq("vehicle", oldName);
        await supabaseClient.from("customers").update({ vehicle: n }).eq("vehicle", oldName);
      } catch (err) {
        console.warn("⚠️ Supabase vehicle_brands update:", err.message);
      }
    }
    const db = readLocalDb();
    if (!db.vehicle_brands) db.vehicle_brands = [];
    db.vehicle_brands = db.vehicle_brands.map((b) => (b === oldName ? n : b));
    if (db.products) {
      db.products = db.products.map((p) => (p.vehicle === oldName ? { ...p, vehicle: n } : p));
    }
    if (db.customers) {
      db.customers = db.customers.map((c) => (c.vehicle === oldName ? { ...c, vehicle: n } : c));
    }
    writeLocalDb(db);

    await Promise.all([
      clearCached("cache:vehicle_brands"),
      clearCached("cache:constants"),
      clearCached("cache:products"),
      clearCached("cache:customers"),
    ]);

    res.json({ name: n });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE VEHICLE BRAND
router.delete("/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("vehicle_brands").delete().eq("name", name);
      } catch (err) {
        console.warn("⚠️ Supabase vehicle_brands delete:", err.message);
      }
    }
    const db = readLocalDb();
    if (!db.vehicle_brands) db.vehicle_brands = [];
    db.vehicle_brands = db.vehicle_brands.filter((b) => b !== name);
    writeLocalDb(db);
    await Promise.all([clearCached("cache:vehicle_brands"), clearCached("cache:constants")]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
