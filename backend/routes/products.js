import express from "express";
import { isSupabaseConfigured, supabaseClient, readLocalDb, writeLocalDb, getCached, setCached, clearCached } from "../lib/db.js";
import { toFeProduct, toDbProduct, toFePriceHistory } from "../lib/mappers.js";
import { validate, productSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// ─────────────── NARX TARIXI METODLARI ───────────────
async function insertPriceHistoryEntries(entries) {
  if (!entries.length) return;
  if (isSupabaseConfigured) {
    const { error } = await supabaseClient.from("price_history").insert(entries);
    if (error) console.error("❌ price_history insert:", error.message);
  } else {
    const db = readLocalDb();
    if (!db.price_history) db.price_history = [];
    for (const e of entries) {
      db.price_history.unshift({
        id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...e,
        created_at: new Date().toISOString(),
      });
    }
    if (db.price_history.length > 5000) db.price_history = db.price_history.slice(0, 5000);
    writeLocalDb(db);
  }
}

async function recordPriceChanges(productId, productName, before, afterDbObj, user) {
  const uid = user?.id || "system";
  const uname = user?.name || "Tizim";
  const entries = [];
  const pairs = [
    ["buy_price", before?.buy_price, afterDbObj.buy_price],
    ["sell_price", before?.sell_price, afterDbObj.sell_price],
  ];
  for (const [field, oldRaw, newRaw] of pairs) {
    if (newRaw === undefined) continue;
    const oldNum = oldRaw != null && oldRaw !== "" ? Number(oldRaw) : null;
    const newNum = Number(newRaw);
    if (oldNum === newNum) continue;
    if (!before && newNum === 0) continue;
    entries.push({
      product_id: productId,
      product_name: productName,
      field,
      old_value: oldNum,
      new_value: newNum,
      changed_by_id: uid,
      changed_by_name: uname,
    });
  }
  await insertPriceHistoryEntries(entries);
}

// ─────────────── ROUTES ───────────────

router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:products";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      const mapped = (data || []).map(toFeProduct);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.products);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, validate(productSchema), async (req, res) => {
  const p = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbProduct(p);
      console.log("📦 [Products POST] Ma'lumot:", JSON.stringify(dbObj, null, 2));
      const { data, error } = await supabaseClient.from("products").insert([dbObj]).select().single();
      if (error) {
        console.error("❌ [Products POST] Supabase xatolik:", error.message, error.details, error.hint);
        throw error;
      }
      await recordPriceChanges(data.id, data.name, null, dbObj, req.user);
      await clearCached("cache:products");
      res.json(toFeProduct(data));
    } else {
      const db = readLocalDb();
      db.products.unshift(p);
      writeLocalDb(db);
      const dbObj = toDbProduct(p);
      await recordPriceChanges(p.id, p.name, null, dbObj, req.user);
      res.json(p);
    }
  } catch (error) {
    console.error("❌ [Products POST] Xatolik:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", authenticateToken, validate(productSchema.partial()), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isSupabaseConfigured) {
      const { data: before } = await supabaseClient.from("products").select("*").eq("id", id).single();
      const dbObj = toDbProduct(updates);
      delete dbObj.id;
      console.log(`📦 [Products PUT] ID: ${id}, Ma'lumot:`, JSON.stringify(dbObj, null, 2));
      const { data, error } = await supabaseClient.from("products").update(dbObj).eq("id", id).select().single();
      if (error) {
        console.error("❌ [Products PUT] Supabase xatolik:", error.message, error.details, error.hint);
        throw error;
      }
      await recordPriceChanges(id, data.name, before, dbObj, req.user);
      await clearCached("cache:products");
      res.json(toFeProduct(data));
    } else {
      const db = readLocalDb();
      const before = db.products.find((x) => x.id === id);
      const beforeDb = before ? toDbProduct(before) : null;
      db.products = db.products.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      const updated = db.products.find(x => x.id === id);
      const dbObj = toDbProduct(updates);
      await recordPriceChanges(id, updated?.name || id, beforeDb, dbObj, req.user);
      res.json(updated);
    }
  } catch (error) {
    console.error("❌ [Products PUT] Xatolik:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("products").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:products");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.products = db.products.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Narx tarixi (barcha yoki filtr bilan)
router.get("/price-history", authenticateToken, async (req, res) => {
  const productId = req.query.productId;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  try {
    if (isSupabaseConfigured) {
      let q = supabaseClient.from("price_history").select("*").order("created_at", { ascending: false }).limit(limit);
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      res.json((data || []).map(toFePriceHistory));
    } else {
      const db = readLocalDb();
      let rows = db.price_history || [];
      if (productId) rows = rows.filter((r) => r.product_id === productId);
      res.json(rows.slice(0, limit).map(toFePriceHistory));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Muayyan tovar narx tarixi
router.get("/:id/price-history", authenticateToken, async (req, res) => {
  const productId = req.params.id;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("price_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      res.json((data || []).map(toFePriceHistory));
    } else {
      const db = readLocalDb();
      const rows = (db.price_history || []).filter((r) => r.product_id === productId);
      res.json(rows.slice(0, limit).map(toFePriceHistory));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tovarlarni ommaviy import qilish
router.post("/import", authenticateToken, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "Import ro'yxati bo'sh" });

  const result = { created: 0, failed: 0, errors: [] };

  for (const raw of items) {
    try {
      const p = { ...raw };
      if (!p.id) p.id = `prd_${Math.random().toString(36).slice(2, 9)}`;
      if (!p.name) throw new Error("Nomi majburiy");

      if (isSupabaseConfigured) {
        const dbObj = toDbProduct(p);
        const { data: existing } = await supabaseClient.from("products").select("id").eq("id", p.id).maybeSingle();
        if (existing) {
          const { data: before } = await supabaseClient.from("products").select("*").eq("id", p.id).single();
          delete dbObj.id;
          const { error } = await supabaseClient.from("products").update(dbObj).eq("id", p.id);
          if (error) throw error;
          await recordPriceChanges(p.id, p.name, before, dbObj, req.user);
        } else {
          const { error } = await supabaseClient.from("products").insert([dbObj]);
          if (error) throw error;
          await recordPriceChanges(p.id, p.name, null, dbObj, req.user);
        }
      } else {
        const db = readLocalDb();
        const idx = db.products.findIndex((x) => x.id === p.id);
        if (idx >= 0) {
          const beforeDb = toDbProduct(db.products[idx]);
          db.products[idx] = { ...db.products[idx], ...p };
          await recordPriceChanges(p.id, p.name, beforeDb, toDbProduct(p), req.user);
        } else {
          db.products.unshift(p);
          await recordPriceChanges(p.id, p.name, null, toDbProduct(p), req.user);
        }
        writeLocalDb(db);
      }
      result.created++;
    } catch (e) {
      result.failed++;
      result.errors.push({ name: raw.name || raw.id, error: e.message });
    }
  }

  await clearCached("cache:products");
  res.json(result);
});

export default router;
