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
import { toFeSale, toDbSale } from "../lib/mappers.js";
import { validate, saleSchema } from "../lib/validators.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";

const router = express.Router();

// GET ALL SALES
router.get("/", authenticateToken, requirePermission("/sales"), async (req, res) => {
  const cacheKey = "cache:sales";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      try {
        const { data: sales, error: err1 } = await supabaseClient
          .from("sales")
          .select("*")
          .order("created_at", { ascending: false });
        if (err1) throw err1;

        const { data: items, error: err2 } = await supabaseClient.from("sale_items").select("*");
        if (err2) throw err2;

        const itemsBySale = new Map();
        for (const item of items || []) {
          const saleItems = itemsBySale.get(item.sale_id) || [];
          saleItems.push(item);
          itemsBySale.set(item.sale_id, saleItems);
        }
        const fullSales = (sales || []).map((sale) =>
          toFeSale(sale, itemsBySale.get(sale.id) || []),
        );

        await setCached(cacheKey, fullSales);
        return res.json(fullSales);
      } catch (supabaseError) {
        console.warn(
          "⚠️ Supabase sales xatosi, mahalliy DB ga qaytilmoqda:",
          supabaseError.message,
        );
      }
    } else {
      const db = readLocalDb();
      const localSales = db.sales || [];
      await setCached(cacheKey, localSales);
      return res.json(localSales);
    }

    const db = readLocalDb();
    const localSales = db.sales || [];
    await setCached(cacheKey, localSales);
    return res.json(localSales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST NEW SALE
router.post(
  "/",
  authenticateToken,
  requirePermission("/sales"),
  validate(saleSchema),
  async (req, res) => {
    const sale = req.body; // { id, date, customerId, sellerId, items: [...], discount, paymentType, total, profit }
    sale.id ||= `sale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { items, ...saleMeta } = sale;

    try {
      if (isSupabaseConfigured) {
        const dbSaleMeta = toDbSale(saleMeta);
        const { error: transactionError } = await supabaseClient.rpc("create_sale_atomic", {
          p_sale: dbSaleMeta,
          p_items: items,
        });
        if (transactionError) throw transactionError;
        const { data: createdSale, error: saleError } = await supabaseClient
          .from("sales")
          .select("*")
          .eq("id", sale.id)
          .single();
        if (saleError) throw saleError;
        const { data: createdItems, error: itemError } = await supabaseClient
          .from("sale_items")
          .select("*")
          .eq("sale_id", sale.id);
        if (itemError) throw itemError;

        await Promise.all([
          clearCached("cache:sales"),
          clearCached("cache:products"),
          clearCached("cache:customers"),
        ]);

        res.json(toFeSale(createdSale, createdItems || []));
      } else {
        const db = readLocalDb();

        // Tovar omborini kamaytirish
        db.products = db.products.map((p) => {
          const item = items.find((i) => i.productId === p.id);
          return item ? { ...p, quantity: Math.max(0, (p.quantity || 0) - item.qty) } : p;
        });

        // Mijoz xarid summasi va qarzini yangilash
        if (sale.customerId) {
          db.customers = db.customers.map((c) => {
            if (c.id !== sale.customerId) return c;
            const debtDelta =
              sale.paymentType === "Qarz" ? Math.max(0, sale.total - (sale.paid || 0)) : 0;
            return {
              ...c,
              debt: (c.debt || 0) + debtDelta,
              totalPurchases: (c.totalPurchases || 0) + sale.total,
            };
          });
        }

        if (!db.sales) db.sales = [];
        db.sales.unshift(sale);
        writeLocalDb(db);
        res.json(sale);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT EDIT SALE
router.put("/:id", authenticateToken, validate(saleSchema.partial()), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { items: newItems, ...newMeta } = updates;

  try {
    if (isSupabaseConfigured) {
      // 1. Eski sotuv va uning tovarlarini olish
      const { data: oldSale, error: errOldSale } = await supabaseClient
        .from("sales")
        .select("*")
        .eq("id", id)
        .single();
      if (errOldSale || !oldSale) return res.status(404).json({ error: "Sotuv topilmadi" });

      const { data: oldItems, error: errOldItems } = await supabaseClient
        .from("sale_items")
        .select("*")
        .eq("sale_id", id);
      if (errOldItems) throw errOldItems;

      // 2. Eski tovar zaxiralarini atomik tiklash
      if (oldItems && oldItems.length > 0) {
        for (const oi of oldItems) {
          await supabaseClient.rpc("increment_product_qty", { p_id: oi.product_id, p_qty: oi.qty });
        }
      }

      // 3. Eski mijoz hisob-kitoblarini atomik tiklash
      if (oldSale.customer_id) {
        const oldDebtDelta =
          oldSale.payment_type === "Qarz" ? Math.max(0, oldSale.total - (oldSale.paid || 0)) : 0;
        await supabaseClient.rpc("decrement_customer_debt", {
          c_id: oldSale.customer_id,
          delta_debt: oldDebtDelta,
          delta_purchases: oldSale.total,
        });
      }

      // 4. Sotuv metama'lumotlarini yangilash
      const dbSaleMeta = toDbSale(newMeta);
      delete dbSaleMeta.id;
      const { data: updatedSale, error: errUpdate } = await supabaseClient
        .from("sales")
        .update(dbSaleMeta)
        .eq("id", id)
        .select()
        .single();
      if (errUpdate) throw errUpdate;

      // 5. Eski sale_items ni o'chirib, yangilarini yozish (agar yangilari yuborilgan bo'lsa)
      let finalItems = oldItems;
      if (newItems && newItems.length > 0) {
        await supabaseClient.from("sale_items").delete().eq("sale_id", id);

        const itemsToInsert = newItems.map((i) => ({
          sale_id: id,
          product_id: i.productId,
          qty: i.qty,
          price: i.price,
          buy_price: i.buyPrice,
        }));
        const { error: errInsertItems } = await supabaseClient
          .from("sale_items")
          .insert(itemsToInsert);
        if (errInsertItems) throw errInsertItems;
        finalItems = itemsToInsert;
      }

      // 6. Yangi tovar zaxiralarini atomik chegirish
      const activeItems =
        newItems && newItems.length > 0
          ? newItems
          : oldItems.map((oi) => ({ productId: oi.product_id, qty: oi.qty }));
      for (const ni of activeItems) {
        await supabaseClient.rpc("decrement_product_qty", { p_id: ni.productId, p_qty: ni.qty });
      }

      // 7. Yangi mijoz hisob-kitoblarini atomik qo'llash
      const activeCustomerId =
        newMeta.customerId !== undefined ? newMeta.customerId : oldSale.customer_id;
      const activePaymentType =
        newMeta.paymentType !== undefined ? newMeta.paymentType : oldSale.payment_type;
      const activeTotal = newMeta.total !== undefined ? newMeta.total : oldSale.total;
      const activePaid = newMeta.paid !== undefined ? newMeta.paid : oldSale.paid || 0;

      if (activeCustomerId) {
        const newDebtDelta =
          activePaymentType === "Qarz" ? Math.max(0, activeTotal - activePaid) : 0;
        await supabaseClient.rpc("increment_customer_debt", {
          c_id: activeCustomerId,
          delta_debt: newDebtDelta,
          delta_purchases: activeTotal,
        });
      }

      await Promise.all([
        clearCached("cache:sales"),
        clearCached("cache:products"),
        clearCached("cache:customers"),
      ]);

      res.json(toFeSale(updatedSale, finalItems));
    } else {
      const db = readLocalDb();
      const oldIdx = db.sales.findIndex((x) => x.id === id);
      if (oldIdx === -1) return res.status(404).json({ error: "Sotuv topilmadi" });

      const oldSale = db.sales[oldIdx];
      const newSale = { ...oldSale, ...updates };

      // 1. Eski tovar zaxiralarini qayta tiklash
      db.products = db.products.map((p) => {
        const oldItem = oldSale.items.find((oi) => oi.productId === p.id);
        return oldItem ? { ...p, quantity: (p.quantity || 0) + oldItem.qty } : p;
      });

      // 2. Eski mijoz hisob-kitoblarini ayirish
      if (oldSale.customerId) {
        db.customers = db.customers.map((c) => {
          if (c.id !== oldSale.customerId) return c;
          const oldDebtDelta =
            oldSale.paymentType === "Qarz" ? Math.max(0, oldSale.total - (oldSale.paid || 0)) : 0;
          return {
            ...c,
            debt: Math.max(0, (c.debt || 0) - oldDebtDelta),
            totalPurchases: Math.max(0, (c.totalPurchases || 0) - oldSale.total),
          };
        });
      }

      // 3. Yangi tovar zaxiralarini chegirish
      db.products = db.products.map((p) => {
        const newItem = newSale.items.find((ni) => ni.productId === p.id);
        return newItem ? { ...p, quantity: Math.max(0, (p.quantity || 0) - newItem.qty) } : p;
      });

      // 4. Yangi mijoz hisob-kitoblarini qo'shish
      if (newSale.customerId) {
        db.customers = db.customers.map((c) => {
          if (c.id !== newSale.customerId) return c;
          const newDebtDelta =
            newSale.paymentType === "Qarz" ? Math.max(0, newSale.total - (newSale.paid || 0)) : 0;
          return {
            ...c,
            debt: (c.debt || 0) + newDebtDelta,
            totalPurchases: (c.totalPurchases || 0) + newSale.total,
          };
        });
      }

      db.sales[oldIdx] = newSale;
      writeLocalDb(db);
      res.json(newSale);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE SALE
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { data: sale } = await supabaseClient.from("sales").select("*").eq("id", id).single();
      if (!sale) return res.status(404).json({ error: "Sotuv topilmadi" });

      const { data: items } = await supabaseClient.from("sale_items").select("*").eq("sale_id", id);

      // Tovar miqdorini atomik tiklash
      if (items) {
        for (const i of items) {
          await supabaseClient.rpc("increment_product_qty", { p_id: i.product_id, p_qty: i.qty });
        }
      }

      // Mijoz hisobini atomik tiklash
      if (sale.customer_id) {
        const debtDelta =
          sale.payment_type === "Qarz" ? Math.max(0, sale.total - (sale.paid || 0)) : 0;
        await supabaseClient.rpc("decrement_customer_debt", {
          c_id: sale.customer_id,
          delta_debt: debtDelta,
          delta_purchases: sale.total,
        });
      }

      await supabaseClient.from("sales").delete().eq("id", id);

      await Promise.all([
        clearCached("cache:sales"),
        clearCached("cache:products"),
        clearCached("cache:customers"),
      ]);

      res.json({ success: true });
    } else {
      const db = readLocalDb();
      const s = db.sales.find((x) => x.id === id);
      if (!s) return res.status(404).json({ error: "Sotuv topilmadi" });

      // Tovar miqdorini tiklash
      db.products = db.products.map((p) => {
        const item = s.items.find((i) => i.productId === p.id);
        return item ? { ...p, quantity: p.quantity + item.qty } : p;
      });

      // Mijoz hisobini tiklash
      db.customers = db.customers.map((c) => {
        if (c.id !== s.customerId) return c;
        const debtDelta = s.paymentType === "Qarz" ? Math.max(0, s.total - (s.paid || 0)) : 0;
        return {
          ...c,
          debt: Math.max(0, c.debt - debtDelta),
          totalPurchases: Math.max(0, c.totalPurchases - s.total),
        };
      });

      db.sales = db.sales.filter((x) => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
