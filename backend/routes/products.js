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
import { toFeProduct, toDbProduct } from "../lib/mappers.js";
import { validate, productSchema } from "../lib/validators.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { recordPriceChanges, fetchPriceHistory } from "../services/priceHistoryService.js";
import {
  safeSupabaseProductUpsert,
  findExistingProduct,
  bulkImportProducts,
} from "../services/productService.js";

const router = express.Router();

// ─────────────── GET PRODUCTS (with pagination & filters) ───────────────
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

// ─────────────── POST CREATE PRODUCT ───────────────
router.post(
  "/",
  authenticateToken,
  requirePermission("/products"),
  validate(productSchema),
  async (req, res) => {
    const p = req.body;
    try {
      if (isSupabaseConfigured) {
        let dbObj = toDbProduct(p);
        const existing = await findExistingProduct(dbObj.name, dbObj.vehicle);

        if (existing) {
          const oldQty = Number(existing.quantity) || 0;
          const addedQty = Number(dbObj.quantity) || 0;
          const newQty = oldQty + addedQty;

          const updateObj = {
            quantity: newQty,
            buy_price: dbObj.buy_price > 0 ? dbObj.buy_price : existing.buy_price,
            buy_price_usd:
              (dbObj.buy_price_usd || 0) > 0 ? dbObj.buy_price_usd : existing.buy_price_usd,
            sell_price: dbObj.sell_price > 0 ? dbObj.sell_price : existing.sell_price,
            sell_price_usd:
              (dbObj.sell_price_usd || 0) > 0 ? dbObj.sell_price_usd : existing.sell_price_usd,
          };

          const { data: updated, error: uErr } = await safeSupabaseProductUpsert(
            "update",
            existing.id,
            updateObj,
          );
          if (uErr) throw uErr;

          await recordPriceChanges(existing.id, existing.name, existing, updateObj, req.user);
          await clearCached("cache:products");
          return res.json(toFeProduct(updated));
        }

        const { data, error } = await safeSupabaseProductUpsert("insert", null, dbObj);

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
        const pName = (p.name || "").trim().toLowerCase();
        const pVeh = (p.vehicle || "").trim().toLowerCase();
        const existingIdx = db.products.findIndex(
          (item) =>
            (item.name || "").trim().toLowerCase() === pName &&
            (item.vehicle || "").trim().toLowerCase() === pVeh,
        );

        if (existingIdx !== -1) {
          const ext = db.products[existingIdx];
          const oldQty = Number(ext.quantity) || 0;
          const addedQty = Number(p.quantity) || 0;
          ext.quantity = oldQty + addedQty;
          if (p.buyPrice > 0) ext.buyPrice = p.buyPrice;
          if (p.buyPriceUsd > 0) ext.buyPriceUsd = p.buyPriceUsd;
          if (p.sellPrice > 0) ext.sellPrice = p.sellPrice;
          if (p.sellPriceUsd > 0) ext.sellPriceUsd = p.sellPriceUsd;
          writeLocalDb(db);
          await recordPriceChanges(ext.id, ext.name, null, toDbProduct(ext), req.user);
          return res.json(ext);
        }

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

// ─────────────── PUT UPDATE PRODUCT ───────────────
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
        let dbObj = toDbProduct(updates);
        delete dbObj.id;
        const { data, error } = await safeSupabaseProductUpsert("update", id, dbObj);

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

// ─────────────── DELETE PRODUCT ───────────────
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

// ─────────────── PRICE HISTORY ROUTES ───────────────
router.get("/price-history", authenticateToken, async (req, res) => {
  try {
    const list = await fetchPriceHistory(req.query.productId, req.query.limit);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/price-history", authenticateToken, async (req, res) => {
  try {
    const list = await fetchPriceHistory(req.params.id, req.query.limit);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── BULK IMPORT ───────────────
router.post("/import", authenticateToken, requirePermission("/products"), async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "Import ro'yxati bo'sh" });
  if (items.length > 20000) {
    return res
      .status(413)
      .json({ error: "Bir importda ko'pi bilan 20000 ta mahsulot yuborish mumkin" });
  }

  const result = await bulkImportProducts(items, req.user);
  res.json(result);
});

export default router;
