import express from "express";
import { isSupabaseConfigured, supabaseClient, readLocalDb, writeLocalDb, getCached, setCached, clearCached } from "../lib/db.js";
import { validate, expenseSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
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

router.post("/", authenticateToken, validate(expenseSchema), async (req, res) => {
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

router.put("/:id", authenticateToken, validate(expenseSchema.partial()), async (req, res) => {
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

router.delete("/:id", authenticateToken, async (req, res) => {
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

export default router;
