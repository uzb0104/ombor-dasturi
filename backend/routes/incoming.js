import express from "express";
import { isSupabaseConfigured, supabaseClient, readLocalDb, writeLocalDb, getCached, setCached, clearCached } from "../lib/db.js";
import { toFeIncoming, toDbIncoming } from "../lib/mappers.js";
import { validate, incomingSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET ALL INCOMING
router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:incoming";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("incoming").select("*").order("created_at", { ascending: false });
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
router.post("/", authenticateToken, validate(incomingSchema), async (req, res) => {
  const i = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbIncoming(i);
      const { data, error } = await supabaseClient.from("incoming").insert([dbObj]).select().single();
      if (error) throw error;

      // 1. Tovar miqdorini yangilash
      const { data: prod } = await supabaseClient.from("products").select("quantity").eq("id", i.productId).single();
      if (prod) {
        await supabaseClient.from("products").update({ quantity: prod.quantity + i.qty }).eq("id", i.productId);
      }

      // 2. Supplier qarzini yangilash: qarz = qarz + (qty * buyPrice)
      if (i.supplierId) {
        const { data: supp } = await supabaseClient.from("suppliers").select("debt").eq("id", i.supplierId).single();
        if (supp) {
          await supabaseClient.from("suppliers").update({ debt: (supp.debt || 0) + (i.qty * i.buyPrice) }).eq("id", i.supplierId);
        }
      }

      await Promise.all([
        clearCached("cache:incoming"),
        clearCached("cache:products"),
        clearCached("cache:suppliers")
      ]);

      res.json(toFeIncoming(data));
    } else {
      const db = readLocalDb();
      
      // 1. Tovar miqdorini yangilash
      db.products = db.products.map(p => p.id === i.productId ? { ...p, quantity: (p.quantity || 0) + i.qty } : p);
      
      // 2. Supplier qarzini yangilash
      if (i.supplierId) {
        db.suppliers = db.suppliers.map(s => s.id === i.supplierId ? { ...s, debt: (s.debt || 0) + (i.qty * i.buyPrice) } : s);
      }
      
      db.incoming.unshift(i);
      writeLocalDb(db);
      res.json(i);
    }
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
      // 1. Eski ma'lumotlarni olish
      const { data: oldInc, error: selectErr } = await supabaseClient.from("incoming").select("*").eq("id", id).single();
      if (selectErr || !oldInc) return res.status(404).json({ error: "Kirim topilmadi" });

      const oldFe = toFeIncoming(oldInc);

      // 2. Kirimni tahrirlash
      const dbObj = toDbIncoming(updates);
      delete dbObj.id;
      const { data: updatedInc, error: updateErr } = await supabaseClient.from("incoming").update(dbObj).eq("id", id).select().single();
      if (updateErr) throw updateErr;

      const newFe = toFeIncoming(updatedInc);

      // 3. Tovar zaxirasini to'g'rilash
      if (oldFe.productId === newFe.productId) {
        // Tovar o'zgarmagan, miqdor o'zgargan bo'lishi mumkin
        const qtyDiff = newFe.qty - oldFe.qty;
        if (qtyDiff !== 0) {
          const { data: prod } = await supabaseClient.from("products").select("quantity").eq("id", newFe.productId).single();
          if (prod) {
            await supabaseClient.from("products").update({ quantity: Math.max(0, prod.quantity + qtyDiff) }).eq("id", newFe.productId);
          }
        }
      } else {
        // Tovar o'zgargan
        // Eski tovardan miqdorni ayiramiz
        const { data: oldProd } = await supabaseClient.from("products").select("quantity").eq("id", oldFe.productId).single();
        if (oldProd) {
          await supabaseClient.from("products").update({ quantity: Math.max(0, oldProd.quantity - oldFe.qty) }).eq("id", oldFe.productId);
        }
        // Yangi tovarga miqdorni qo'shamiz
        const { data: newProd } = await supabaseClient.from("products").select("quantity").eq("id", newFe.productId).single();
        if (newProd) {
          await supabaseClient.from("products").update({ quantity: (newProd.quantity || 0) + newFe.qty }).eq("id", newFe.productId);
        }
      }

      // 4. Supplier qarzini to'g'rilash
      const oldCost = oldFe.qty * oldFe.buyPrice;
      const newCost = newFe.qty * newFe.buyPrice;

      if (oldFe.supplierId === newFe.supplierId) {
        const costDiff = newCost - oldCost;
        if (costDiff !== 0 && newFe.supplierId) {
          const { data: supp } = await supabaseClient.from("suppliers").select("debt").eq("id", newFe.supplierId).single();
          if (supp) {
            await supabaseClient.from("suppliers").update({ debt: Math.max(0, (supp.debt || 0) + costDiff) }).eq("id", newFe.supplierId);
          }
        }
      } else {
        // Supplier o'zgargan
        // Eski supplierdan qarzni ayiramiz
        if (oldFe.supplierId) {
          const { data: oldSupp } = await supabaseClient.from("suppliers").select("debt").eq("id", oldFe.supplierId).single();
          if (oldSupp) {
            await supabaseClient.from("suppliers").update({ debt: Math.max(0, (oldSupp.debt || 0) - oldCost) }).eq("id", oldFe.supplierId);
          }
        }
        // Yangi supplierga qarz qo'shamiz
        if (newFe.supplierId) {
          const { data: newSupp } = await supabaseClient.from("suppliers").select("debt").eq("id", newFe.supplierId).single();
          if (newSupp) {
            await supabaseClient.from("suppliers").update({ debt: (newSupp.debt || 0) + newCost }).eq("id", newFe.supplierId);
          }
        }
      }

      await Promise.all([
        clearCached("cache:incoming"),
        clearCached("cache:products"),
        clearCached("cache:suppliers")
      ]);

      res.json(newFe);
    } else {
      const db = readLocalDb();
      const oldIdx = db.incoming.findIndex(x => x.id === id);
      if (oldIdx === -1) return res.status(404).json({ error: "Kirim topilmadi" });

      const oldFe = db.incoming[oldIdx];
      const newFe = { ...oldFe, ...updates };

      // 1. Tovar zaxirasini to'g'rilash
      if (oldFe.productId === newFe.productId) {
        const qtyDiff = newFe.qty - oldFe.qty;
        db.products = db.products.map(p => p.id === newFe.productId ? { ...p, quantity: Math.max(0, (p.quantity || 0) + qtyDiff) } : p);
      } else {
        db.products = db.products.map(p => {
          if (p.id === oldFe.productId) return { ...p, quantity: Math.max(0, (p.quantity || 0) - oldFe.qty) };
          if (p.id === newFe.productId) return { ...p, quantity: (p.quantity || 0) + newFe.qty };
          return p;
        });
      }

      // 2. Supplier qarzini to'g'rilash
      const oldCost = oldFe.qty * oldFe.buyPrice;
      const newCost = newFe.qty * newFe.buyPrice;

      if (oldFe.supplierId === newFe.supplierId) {
        const costDiff = newCost - oldCost;
        if (costDiff !== 0 && newFe.supplierId) {
          db.suppliers = db.suppliers.map(s => s.id === newFe.supplierId ? { ...s, debt: Math.max(0, (s.debt || 0) + costDiff) } : s);
        }
      } else {
        db.suppliers = db.suppliers.map(s => {
          if (s.id === oldFe.supplierId) return { ...s, debt: Math.max(0, (s.debt || 0) - oldCost) };
          if (s.id === newFe.supplierId) return { ...s, debt: (s.debt || 0) + newCost };
          return s;
        });
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

      // 1. Tovar miqdorini kamaytirish
      const { data: prod } = await supabaseClient.from("products").select("quantity").eq("id", feInc.productId).single();
      if (prod) {
        await supabaseClient.from("products").update({ quantity: Math.max(0, prod.quantity - feInc.qty) }).eq("id", feInc.productId);
      }

      // 2. Supplier qarzini kamaytirish
      if (feInc.supplierId) {
        const { data: supp } = await supabaseClient.from("suppliers").select("debt").eq("id", feInc.supplierId).single();
        if (supp) {
          await supabaseClient.from("suppliers").update({ debt: Math.max(0, (supp.debt || 0) - (feInc.qty * feInc.buyPrice)) }).eq("id", feInc.supplierId);
        }
      }

      await supabaseClient.from("incoming").delete().eq("id", id);

      await Promise.all([
        clearCached("cache:incoming"),
        clearCached("cache:products"),
        clearCached("cache:suppliers")
      ]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      const inc = db.incoming.find(x => x.id === id);
      if (!inc) return res.status(404).json({ error: "Kirim topilmadi" });

      // 1. Tovar miqdorini kamaytirish
      db.products = db.products.map(p => p.id === inc.productId ? { ...p, quantity: Math.max(0, (p.quantity || 0) - inc.qty) } : p);
      
      // 2. Supplier qarzini kamaytirish
      if (inc.supplierId) {
        db.suppliers = db.suppliers.map(s => s.id === inc.supplierId ? { ...s, debt: Math.max(0, (s.debt || 0) - (inc.qty * inc.buyPrice)) } : s);
      }

      db.incoming = db.incoming.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
