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
import { validate, supplierSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:suppliers";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });
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

router.post("/", authenticateToken, validate(supplierSchema), async (req, res) => {
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

router.put("/:id", authenticateToken, validate(supplierSchema.partial()), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("suppliers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await clearCached("cache:suppliers");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.suppliers = db.suppliers.map((x) => (x.id === id ? { ...x, ...updates } : x));
      writeLocalDb(db);
      res.json(db.suppliers.find((x) => x.id === id));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:suppliers");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.suppliers = db.suppliers.filter((x) => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
