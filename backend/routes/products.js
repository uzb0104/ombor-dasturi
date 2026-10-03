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
import { toFeProduct, toDbProduct, toFePriceHistory } from "../lib/mappers.js";
import { validate, productSchema } from "../lib/validators.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";

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

router.get("/", authenticateToken, requirePermission("/products"), async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "").trim();
  const vehicle = String(req.query.vehicle || "").trim();
  const pagedRequest = ["page", "limit", "search", "category", "vehicle"].some(
    (key) => key in req.query,
  );
  const cacheKey = pagedRequest ? null : "cache:products";
  try {
    if (cacheKey) {
      const cached = await getCached(cacheKey);
      if (cached) return res.json(Array.isArray(cached) ? cached : cached.items || []);
    }

    if (isSupabaseConfigured) {
      let query = supabaseClient
        .from("products")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (pagedRequest) {
        const from = (page - 1) * limit;
        query = query.range(from, from + limit - 1);
      }
      if (search)
        query = query.or(
          `name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%,vehicle.ilike.%${search}%,description.ilike.%${search}%`,
        );
      if (category) query = query.eq("category", category);
      if (vehicle) query = query.ilike("vehicle", `%${vehicle}%`);
      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(toFeProduct);
      const result = {
        items: mapped,
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      };
      if (cacheKey) await setCached(cacheKey, mapped);
      res.json(pagedRequest ? result : mapped);
    } else {
      const db = readLocalDb();
      const filtered = (Array.isArray(db.products) ? db.products : []).filter(
        (p) =>
          (!search ||
            [
              p.name,
              p.barcode,
              p.sku,
              p.category,
              p.vehicle,
              ...(Array.isArray(p.vehicles) ? p.vehicles : []),
              p.description,
              p.attributes?.unitBrand,
              p.attributes?.amperage,
              p.attributes?.voltage,
              p.attributes?.tireSize,
              p.attributes?.tireSeason,
              p.buyPrice != null ? String(p.buyPrice) : "",
              p.sellPrice != null ? String(p.sellPrice) : "",
            ].some((v) =>
              String(v || "")
                .toLowerCase()
                .includes(search.toLowerCase()),
            )) &&
          (!category || p.category === category) &&
          (!vehicle ||
            p.vehicle === vehicle ||
            (p.vehicle && p.vehicle.includes(vehicle)) ||
            (Array.isArray(p.vehicles) && p.vehicles.includes(vehicle))),
      );
      const start = (page - 1) * limit;
      const result = {
        items: filtered.slice(start, start + limit),
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      };
      res.json(pagedRequest ? result : filtered);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/",
  authenticateToken,
  requirePermission("/products"),
  validate(productSchema),
  async (req, res) => {
    const p = req.body;
    try {
      if (isSupabaseConfigured) {
        const dbObj = toDbProduct(p);
        console.log("📦 [Products POST] Ma'lumot:", JSON.stringify(dbObj, null, 2));
        let { data, error } = await supabaseClient
          .from("products")
          .insert([dbObj])
          .select()
          .single();
        if (
          error &&
          (error.message?.includes("buy_price_usd") ||
            error.message?.includes("sell_price_usd") ||
            error.message?.includes("schema cache"))
        ) {
          console.warn(
            "⚠️ Column buy_price_usd missing on DB, retrying insert without USD columns...",
          );
          delete dbObj.buy_price_usd;
          delete dbObj.sell_price_usd;
          delete dbObj.currency;
          const retry = await supabaseClient.from("products").insert([dbObj]).select().single();
          data = retry.data;
          error = retry.error;
        }
        if (error) {
          console.error(
            "❌ [Products POST] Supabase xatolik:",
            error.message,
            error.details,
            error.hint,
          );
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
  },
);

router.put(
  "/:id",
  authenticateToken,
  requirePermission("/products"),
  validate(productSchema.partial()),
  async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      if (isSupabaseConfigured) {
        const { data: before } = await supabaseClient
          .from("products")
          .select("*")
          .eq("id", id)
          .single();
        const dbObj = toDbProduct(updates);
        delete dbObj.id;
        console.log(`📦 [Products PUT] ID: ${id}, Ma'lumot:`, JSON.stringify(dbObj, null, 2));
        let { data, error } = await supabaseClient
          .from("products")
          .update(dbObj)
          .eq("id", id)
          .select()
          .single();
        if (
          error &&
          (error.message?.includes("buy_price_usd") ||
            error.message?.includes("sell_price_usd") ||
            error.message?.includes("schema cache"))
        ) {
          console.warn(
            "⚠️ Column buy_price_usd missing on DB, retrying update without USD columns...",
          );
          delete dbObj.buy_price_usd;
          delete dbObj.sell_price_usd;
          delete dbObj.currency;
          const retry = await supabaseClient
            .from("products")
            .update(dbObj)
            .eq("id", id)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }
        if (error) {
          console.error(
            "❌ [Products PUT] Supabase xatolik:",
            error.message,
            error.details,
            error.hint,
          );
          throw error;
        }
        await recordPriceChanges(id, data.name, before, dbObj, req.user);
        await clearCached("cache:products");
        res.json(toFeProduct(data));
      } else {
        const db = readLocalDb();
        const before = db.products.find((x) => x.id === id);
        const beforeDb = before ? toDbProduct(before) : null;
        db.products = db.products.map((x) => (x.id === id ? { ...x, ...updates } : x));
        writeLocalDb(db);
        const updated = db.products.find((x) => x.id === id);
        const dbObj = toDbProduct(updates);
        await recordPriceChanges(id, updated?.name || id, beforeDb, dbObj, req.user);
        res.json(updated);
      }
    } catch (error) {
      console.error("❌ [Products PUT] Xatolik:", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete("/:id", authenticateToken, requirePermission("/products"), async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("products").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:products");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.products = db.products.filter((x) => x.id !== id);
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
      let q = supabaseClient
        .from("price_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
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
router.post("/import", authenticateToken, requirePermission("/products"), async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "Import ro'yxati bo'sh" });
  if (items.length > 20000) {
    return res
      .status(413)
      .json({ error: "Bir importda ko'pi bilan 20000 ta mahsulot yuborish mumkin" });
  }

  const result = { created: 0, failed: 0, errors: [] };

  if (isSupabaseConfigured) {
    try {
      const rows = items.map((raw) => {
        const product = { ...raw, id: raw.id || `prd_${Math.random().toString(36).slice(2, 9)}` };
        if (!product.name) throw new Error("Nomi majburiy");
        return toDbProduct(product);
      });
      for (let index = 0; index < rows.length; index += 500) {
        const { error } = await supabaseClient
          .from("products")
          .upsert(rows.slice(index, index + 500), { onConflict: "id" });
        if (error) throw error;
      }
      await clearCached("cache:products");
      return res.json({ created: rows.length, failed: 0, errors: [] });
    } catch (error) {
      return res
        .status(400)
        .json({ created: 0, failed: items.length, errors: [{ error: error.message }] });
    }
  }

  for (const raw of items) {
    try {
      const p = { ...raw };
      if (!p.id) p.id = `prd_${Math.random().toString(36).slice(2, 9)}`;
      if (!p.name) throw new Error("Nomi majburiy");

      {
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
