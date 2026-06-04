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
import { toFeAuditLog, toDbAuditLog } from "../lib/mappers.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:audit_logs";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("audit_logs")
        .select("*")
        .order("ts", { ascending: false })
        .limit(2000);
      if (error) throw error;

      const mapped = (data || []).map(toFeAuditLog);
      await setCached(cacheKey, mapped);
      res.json(mapped);
    } else {
      const db = readLocalDb();
      res.json(db.audit_logs);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const log = req.body;
  try {
    if (isSupabaseConfigured) {
      const dbObj = toDbAuditLog(log);
      const { data, error } = await supabaseClient
        .from("audit_logs")
        .insert([dbObj])
        .select()
        .single();
      if (error) throw error;

      await clearCached("cache:audit_logs");
      res.json(toFeAuditLog(data));
    } else {
      const db = readLocalDb();
      db.audit_logs.unshift(log);
      if (db.audit_logs.length > 2000) db.audit_logs = db.audit_logs.slice(0, 2000);
      writeLocalDb(db);
      res.json(log);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/", authenticateToken, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      await supabaseClient.from("audit_logs").delete().neq("id", "");
      await clearCached("cache:audit_logs");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.audit_logs = [];
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
