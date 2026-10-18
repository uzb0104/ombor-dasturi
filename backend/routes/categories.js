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

// GET ALL CATEGORIES
router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:categories";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("categories")
        .select("name")
        .order("name", { ascending: true });
      if (error) throw error;
      const resData = (data || [])
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" }));
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json(
        (db.categories || [])
          .slice()
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
      );
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE CATEGORY
router.post("/", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Kategoriya nomi kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("categories")
        .insert([{ name: name.trim() }])
        .select()
        .single();
      if (error) throw error;
      await Promise.all([clearCached("cache:categories"), clearCached("cache:constants")]);
      res.json(data);
    } else {
      const db = readLocalDb();
      const n = name.trim();
      if (!db.categories) db.categories = [];
      if (db.categories.includes(n)) return res.status(400).json({ error: "Bu kategoriya mavjud" });
      db.categories.push(n);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE CATEGORY
router.put("/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim())
    return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("categories")
        .update({ name: newName.trim() })
        .eq("name", oldName)
        .select()
        .single();
      if (error) throw error;

      await supabaseClient
        .from("products")
        .update({ category: newName.trim() })
        .eq("category", oldName);

      await Promise.all([
        clearCached("cache:categories"),
        clearCached("cache:constants"),
        clearCached("cache:products"),
      ]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = newName.trim();
      if (!db.categories) db.categories = [];
      db.categories = db.categories.map((c) => (c === oldName ? n : c));
      if (db.products) {
        db.products = db.products.map((p) => (p.category === oldName ? { ...p, category: n } : p));
      }
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE CATEGORY
router.delete("/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("categories").delete().eq("name", name);
      if (error) throw error;

      await Promise.all([clearCached("cache:categories"), clearCached("cache:constants")]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      if (db.categories) {
        db.categories = db.categories.filter((c) => c !== name);
      }
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
