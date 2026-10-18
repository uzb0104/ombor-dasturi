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

// GET ALL INCOMING CATEGORIES
router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:incoming_categories";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("incoming_categories")
        .select("name")
        .order("name", { ascending: true });
      if (!error && data) {
        const resData = data
          .map((c) => c.name)
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" }));
        await setCached(cacheKey, resData);
        return res.json(resData);
      }
    }
    const db = readLocalDb();
    const resData = (db.incoming_categories || [])
      .slice()
      .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" }));
    await setCached(cacheKey, resData);
    res.json(resData);
  } catch (error) {
    const db = readLocalDb();
    res.json(
      (db.incoming_categories || [])
        .slice()
        .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    );
  }
});

// CREATE INCOMING CATEGORY
router.post("/", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Kategoriya nomi kiritilishi shart" });
  try {
    const n = name.trim();
    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("incoming_categories").insert([{ name: n }]);
      } catch (_) {}
    }
    const db = readLocalDb();
    if (!db.incoming_categories) db.incoming_categories = [];
    if (!db.incoming_categories.includes(n)) {
      db.incoming_categories.push(n);
      writeLocalDb(db);
    }
    await clearCached("cache:incoming_categories");
    res.json({ name: n });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE INCOMING CATEGORY
router.put("/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim())
    return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    const n = newName.trim();
    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("incoming_categories").update({ name: n }).eq("name", oldName);
      } catch (_) {}
    }
    const db = readLocalDb();
    if (!db.incoming_categories) db.incoming_categories = [];
    db.incoming_categories = db.incoming_categories.map((c) => (c === oldName ? n : c));
    writeLocalDb(db);
    await clearCached("cache:incoming_categories");
    res.json({ name: n });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE INCOMING CATEGORY
router.delete("/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("incoming_categories").delete().eq("name", name);
      } catch (_) {}
    }
    const db = readLocalDb();
    if (db.incoming_categories) {
      db.incoming_categories = db.incoming_categories.filter((c) => c !== name);
      writeLocalDb(db);
    }
    await clearCached("cache:incoming_categories");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
