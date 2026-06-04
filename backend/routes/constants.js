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

// ─────────────── CONSTANTS OVERALL ───────────────
router.get("/constants", authenticateToken, async (req, res) => {
  const cacheKey = "cache:constants";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data: cats } = await supabaseClient.from("categories").select("name");
      const { data: brands } = await supabaseClient.from("vehicle_brands").select("name");
      const { data: branches } = await supabaseClient.from("branches").select("name");

      const resData = {
        categories: (cats || []).map((c) => c.name),
        vehicleBrands: (brands || []).map((b) => b.name),
        branches: (branches || []).map((br) => br.name),
      };
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json({
        categories: db.categories || [],
        vehicleBrands: db.vehicle_brands || [],
        branches: db.branches || [],
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── CATEGORIES ───────────────
router.get("/categories", authenticateToken, async (req, res) => {
  const cacheKey = "cache:categories";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("categories").select("name");
      if (error) throw error;
      const resData = (data || []).map((c) => c.name);
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json(db.categories || []);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/categories", authenticateToken, async (req, res) => {
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

router.put("/categories/:oldName", authenticateToken, async (req, res) => {
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

router.delete("/categories/:name", authenticateToken, async (req, res) => {
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

// ─────────────── VEHICLE BRANDS ───────────────
router.get("/vehicle-brands", authenticateToken, async (req, res) => {
  const cacheKey = "cache:vehicle_brands";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("vehicle_brands").select("name");
      if (error) throw error;
      const resData = (data || []).map((b) => b.name);
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json(db.vehicle_brands || []);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/vehicle-brands", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Brend nomi kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("vehicle_brands")
        .insert([{ name: name.trim() }])
        .select()
        .single();
      if (error) throw error;

      await Promise.all([clearCached("cache:vehicle_brands"), clearCached("cache:constants")]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = name.trim();
      if (!db.vehicle_brands) db.vehicle_brands = [];
      if (db.vehicle_brands.includes(n)) return res.status(400).json({ error: "Bu brend mavjud" });
      db.vehicle_brands.push(n);
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/vehicle-brands/:oldName", authenticateToken, async (req, res) => {
  const oldName = decodeURIComponent(req.params.oldName);
  const { name: newName } = req.body;
  if (!newName || !newName.trim())
    return res.status(400).json({ error: "Yangi nom kiritilishi shart" });
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("vehicle_brands")
        .update({ name: newName.trim() })
        .eq("name", oldName)
        .select()
        .single();
      if (error) throw error;
      await supabaseClient
        .from("products")
        .update({ vehicle: newName.trim() })
        .eq("vehicle", oldName);
      await supabaseClient
        .from("customers")
        .update({ vehicle: newName.trim() })
        .eq("vehicle", oldName);

      await Promise.all([
        clearCached("cache:vehicle_brands"),
        clearCached("cache:constants"),
        clearCached("cache:products"),
        clearCached("cache:customers"),
      ]);

      res.json(data);
    } else {
      const db = readLocalDb();
      const n = newName.trim();
      if (!db.vehicle_brands) db.vehicle_brands = [];
      db.vehicle_brands = db.vehicle_brands.map((b) => (b === oldName ? n : b));
      if (db.products) {
        db.products = db.products.map((p) => (p.vehicle === oldName ? { ...p, vehicle: n } : p));
      }
      if (db.customers) {
        db.customers = db.customers.map((c) => (c.vehicle === oldName ? { ...c, vehicle: n } : c));
      }
      writeLocalDb(db);
      res.json({ name: n });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/vehicle-brands/:name", authenticateToken, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("vehicle_brands").delete().eq("name", name);
      if (error) throw error;

      await Promise.all([clearCached("cache:vehicle_brands"), clearCached("cache:constants")]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      if (db.vehicle_brands) {
        db.vehicle_brands = db.vehicle_brands.filter((b) => b !== name);
      }
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── BRANCHES ───────────────
router.get("/branches", authenticateToken, async (req, res) => {
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

router.post("/branches", authenticateToken, async (req, res) => {
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

router.put("/branches/:oldName", authenticateToken, async (req, res) => {
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

router.delete("/branches/:name", authenticateToken, async (req, res) => {
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
