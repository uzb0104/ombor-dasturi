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
import { toFeIncoming, toDbIncoming } from "../lib/mappers.js";
import { validate, incomingSchema } from "../lib/validators.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { applyIncomingBatch } from "../services/incomingService.js";

const router = express.Router();

// GET ALL INCOMING
router.get("/", authenticateToken, requirePermission("/incoming"), async (req, res) => {
  const cacheKey = "cache:incoming";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("incoming")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const mapped = (data || []).map(toFeIncoming);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.incoming || []);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST NEW INCOMING
router.post(
  "/",
  authenticateToken,
  requirePermission("/incoming"),
  validate(incomingSchema),
  async (req, res) => {
    const i = req.body;
    i.id ||= `inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    i.status ||= "pending";
    try {
      if (isSupabaseConfigured) {
        let savedData = null;
        if (i.status === "applied") {
          const dbObj = toDbIncoming(i);
          const { error: transactionError } = await supabaseClient.rpc("create_incoming_atomic", {
            p_incoming: dbObj,
          });
          if (transactionError) throw transactionError;
          const { data, error } = await supabaseClient
            .from("incoming")
            .select("*")
            .eq("id", i.id)
            .single();
          if (error) throw error;
          savedData = data;
        } else {
          // Status is 'pending' - saqlanadi, lekin tovarlar bazasiga hozircha qo'shilmaydi
          const dbObj = toDbIncoming(i);
          let { data, error } = await supabaseClient
            .from("incoming")
            .insert(dbObj)
            .select()
            .single();
          if (error && (error.code === "42703" || error.code === "PGRST204")) {
            delete dbObj.status;
            delete dbObj.buy_price_usd;
            delete dbObj.currency;
            const retry = await supabaseClient.from("incoming").insert(dbObj).select().single();
            if (retry.error) throw retry.error;
            data = retry.data;
          } else if (error) {
            throw error;
          }
          savedData = data;
        }

        await Promise.all([clearCached("cache:incoming"), clearCached("cache:products")]);

        const feItem = toFeIncoming(savedData);
        if (i.status) feItem.status = i.status;
        res.json(feItem);
      } else {
        const db = readLocalDb();

        if (i.status === "applied") {
          db.products = db.products.map((p) =>
            p.id === i.productId ? { ...p, quantity: (p.quantity || 0) + i.qty } : p,
          );
        }

        db.incoming.unshift(i);
        writeLocalDb(db);
        res.json(i);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST APPLY BATCH (Tovarlar bazasiga o'tkazish / tasdiqlash)
router.post("/apply-batch", authenticateToken, requirePermission("/incoming"), async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Kirim IDlari tanlanmagan" });
  }

  try {
    const count = await applyIncomingBatch(ids);
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT EDIT INCOMING
router.put("/:id", authenticateToken, validate(incomingSchema.partial()), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (isSupabaseConfigured) {
      const { data: oldInc, error: selectErr } = await supabaseClient
        .from("incoming")
        .select("*")
        .eq("id", id)
        .single();
      if (selectErr || !oldInc) return res.status(404).json({ error: "Kirim topilmadi" });

      const oldFe = toFeIncoming(oldInc);

      const dbObj = toDbIncoming(updates);
      delete dbObj.id;
      let { data: updatedInc, error: updateErr } = await supabaseClient
        .from("incoming")
        .update(dbObj)
        .eq("id", id)
        .select()
        .single();
      if (updateErr && (updateErr.code === "42703" || updateErr.code === "PGRST204")) {
        delete dbObj.status;
        delete dbObj.buy_price_usd;
        delete dbObj.currency;
        const retry = await supabaseClient
          .from("incoming")
          .update(dbObj)
          .eq("id", id)
          .select()
          .single();
        if (retry.error) throw retry.error;
        updatedInc = retry.data;
      } else if (updateErr) {
        throw updateErr;
      }

      const newFe = toFeIncoming(updatedInc);

      // Tovar zaxirasini atomik to'g'rilash (faqat oldin bazaga qo'shilgan bo'lsa)
      if (oldFe.status === "applied") {
        if (oldFe.productId === newFe.productId) {
          const qtyDiff = newFe.qty - oldFe.qty;
          if (qtyDiff > 0) {
            await supabaseClient.rpc("increment_product_qty", {
              p_id: newFe.productId,
              p_qty: qtyDiff,
            });
          } else if (qtyDiff < 0) {
            await supabaseClient.rpc("decrement_product_qty", {
              p_id: newFe.productId,
              p_qty: Math.abs(qtyDiff),
            });
          }
        } else {
          await supabaseClient.rpc("decrement_product_qty", {
            p_id: oldFe.productId,
            p_qty: oldFe.qty,
          });
          await supabaseClient.rpc("increment_product_qty", {
            p_id: newFe.productId,
            p_qty: newFe.qty,
          });
        }
      }

      await Promise.all([clearCached("cache:incoming"), clearCached("cache:products")]);

      res.json(newFe);
    } else {
      const db = readLocalDb();
      const oldIdx = db.incoming.findIndex((x) => x.id === id);
      if (oldIdx === -1) return res.status(404).json({ error: "Kirim topilmadi" });

      const oldFe = db.incoming[oldIdx];
      const newFe = { ...oldFe, ...updates };

      if (oldFe.status === "applied") {
        if (oldFe.productId === newFe.productId) {
          const qtyDiff = newFe.qty - oldFe.qty;
          db.products = db.products.map((p) =>
            p.id === newFe.productId
              ? { ...p, quantity: Math.max(0, (p.quantity || 0) + qtyDiff) }
              : p,
          );
        } else {
          db.products = db.products.map((p) => {
            if (p.id === oldFe.productId)
              return { ...p, quantity: Math.max(0, (p.quantity || 0) - oldFe.qty) };
            if (p.id === newFe.productId) return { ...p, quantity: (p.quantity || 0) + newFe.qty };
            return p;
          });
        }
      }

      db.incoming[oldIdx] = newFe;
      writeLocalDb(db);
      res.json(newFe);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE INCOMING
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { data: inc } = await supabaseClient.from("incoming").select("*").eq("id", id).single();
      if (!inc) return res.status(404).json({ error: "Kirim topilmadi" });

      const feInc = toFeIncoming(inc);

      // Tovar miqdorini kamaytirish (faqat bazaga qo'shilgan bo'lsa)
      if (feInc.status !== "pending") {
        await supabaseClient.rpc("decrement_product_qty", {
          p_id: feInc.productId,
          p_qty: feInc.qty,
        });
      }

      await supabaseClient.from("incoming").delete().eq("id", id);

      await Promise.all([clearCached("cache:incoming"), clearCached("cache:products")]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      const inc = db.incoming.find((x) => x.id === id);
      if (!inc) return res.status(404).json({ error: "Kirim topilmadi" });

      if (inc.status !== "pending") {
        db.products = db.products.map((p) =>
          p.id === inc.productId ? { ...p, quantity: Math.max(0, (p.quantity || 0) - inc.qty) } : p,
        );
      }

      db.incoming = db.incoming.filter((x) => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
