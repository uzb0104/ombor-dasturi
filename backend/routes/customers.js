import express from "express";
import { isSupabaseConfigured, supabaseClient, readLocalDb, writeLocalDb, getCached, setCached, clearCached } from "../lib/db.js";
import { toFeCustomer, toDbCustomer } from "../lib/mappers.js";
import { validate, customerSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
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

router.post("/", authenticateToken, validate(customerSchema), async (req, res) => {
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

router.put("/:id", authenticateToken, validate(customerSchema.partial()), async (req, res) => {
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

router.delete("/:id", authenticateToken, async (req, res) => {
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

export default router;
