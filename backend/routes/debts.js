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
import { toFeDebtPayment, toDbDebtPayment } from "../lib/mappers.js";
import { validate, debtPaymentSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:debt_payments";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("debt_payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const mapped = (data || []).map(toFeDebtPayment);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.debt_payments);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, validate(debtPaymentSchema), async (req, res) => {
  const p = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbDebtPayment(p);
      const { data, error } = await supabaseClient
        .from("debt_payments")
        .insert([dbObj])
        .select()
        .single();
      if (error) throw error;

      if (p.type === "customer") {
        // Mijoz qarzini atomik kamaytirish (xaridlar summasi o'zgarmaydi, shuning uchun delta_purchases = 0)
        await supabaseClient.rpc("decrement_customer_debt", {
          c_id: p.targetId,
          delta_debt: p.amount,
          delta_purchases: 0,
        });
      } else if (p.type === "supplier") {
        // Yetkazib beruvchi qarzini atomik kamaytirish (delta manfiy yuboriladi)
        await supabaseClient.rpc("adjust_supplier_debt", { s_id: p.targetId, delta: -p.amount });
      }

      await Promise.all([
        clearCached("cache:debt_payments"),
        clearCached("cache:customers"),
        clearCached("cache:suppliers"),
      ]);

      res.json(toFeDebtPayment(data));
    } else {
      const db = readLocalDb();
      db.customers = db.customers.map((c) => {
        if (p.type === "customer" && c.id === p.targetId) {
          return { ...c, debt: Math.max(0, c.debt - p.amount) };
        }
        return c;
      });
      db.suppliers = db.suppliers.map((s) => {
        if (p.type === "supplier" && s.id === p.targetId) {
          return { ...s, debt: Math.max(0, s.debt - p.amount) };
        }
        return s;
      });
      db.debt_payments.unshift(p);
      writeLocalDb(db);
      res.json(p);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
