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

// GET ALL BRANCHES
router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:branches";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("branches").select("name");
      if (error) throw error;
      const resData = (data || []).map((br) => br.name);
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json(db.branches || []);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE BRANCH
router.post("/", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Filial nomi kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("branches")
        .insert([{ name: name.trim() }])
        .select()
        .single();
      if (error) throw error;

      await Promise.all([clearCached("cache:branches"), clearCached("cache:constants")]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = name.trim();
      if (!db.branches) db.branches = [];
      if (db.branches.includes(n)) return res.status(400).json({ error: "Bu filial mavjud" });
      db.branches.push(n);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE BRANCH
router.put("/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim())
    return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("branches")
        .update({ name: newName.trim() })
        .eq("name", oldName)
        .select()
        .single();
      if (error) throw error;

      await Promise.all([clearCached("cache:branches"), clearCached("cache:constants")]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = newName.trim();
      if (!db.branches) db.branches = [];
      db.branches = db.branches.map((b) => (b === oldName ? n : b));
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE BRANCH
router.delete("/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("branches").delete().eq("name", name);
      if (error) throw error;

      await Promise.all([clearCached("cache:branches"), clearCached("cache:constants")]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      if (db.branches) {
        db.branches = db.branches.filter((b) => b !== name);
      }
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
