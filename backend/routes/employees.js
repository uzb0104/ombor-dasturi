import express from "express";
import { isSupabaseConfigured, supabaseClient, readLocalDb, writeLocalDb, getCached, setCached, clearCached } from "../lib/db.js";
import { toFeEmployee, toDbEmployee } from "../lib/mappers.js";
import { validate, employeeSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
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

router.post("/", authenticateToken, validate(employeeSchema), async (req, res) => {
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

router.put("/:id", authenticateToken, validate(employeeSchema.partial()), async (req, res) => {
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

router.delete("/:id", authenticateToken, async (req, res) => {
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

export default router;
