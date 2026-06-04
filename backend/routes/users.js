import express from "express";
import bcrypt from "bcryptjs";
import { isSupabaseConfigured, supabaseClient, readLocalDb, writeLocalDb, getCached, setCached, clearCached } from "../lib/db.js";
import { validate, userSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  const cacheKey = "cache:users";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("app_users").select("id, name, email, role, permissions, active").order("created_at", { ascending: false });
      if (error) throw error;
      await setCached(cacheKey, data);
      res.json(data);
    } else {
      const db = readLocalDb();
      res.json(db.app_users.map(({ password, ...u }) => u));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, validate(userSchema), async (req, res) => {
  const u = req.body;
  u.password = bcrypt.hashSync(u.password || "user123", 10);
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("app_users").insert([u]).select("id, name, email, role, permissions, active").single();
      if (error) throw error;
      await clearCached("cache:users");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.app_users.unshift(u);
      writeLocalDb(db);
      const { password, ...safeUser } = u;
      res.json(safeUser);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", authenticateToken, validate(userSchema.partial()), async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  try {
    // Parolni yangilash xavfsizlik tekshiruvi (Eski parolni so'rash)
    if (updates.password) {
      if (req.user.role !== "Admin") {
        const oldPassword = req.body.oldPassword;
        if (!oldPassword) {
          return res.status(400).json({ error: "Parolni o'zgartirish uchun eski parolni kiritish shart" });
        }
        
        let existingUser = null;
        if (isSupabaseConfigured) {
          const { data, error } = await supabaseClient.from("app_users").select("password").eq("id", id).single();
          if (data) existingUser = data;
        } else {
          const db = readLocalDb();
          existingUser = db.app_users.find(x => x.id === id);
        }

        if (!existingUser || !bcrypt.compareSync(oldPassword, existingUser.password)) {
          return res.status(400).json({ error: "Eski parol noto'g'ri kiritildi" });
        }
      }
      
      updates.password = bcrypt.hashSync(updates.password, 10);
    }
    
    // DB ga yozishdan oldin vaqtinchalik maydonni o'chiramiz
    delete updates.oldPassword;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("app_users").update(updates).eq("id", id).select("id, name, email, role, permissions, active").single();
      if (error) throw error;
      await clearCached("cache:users");
      res.json(data);
    } else {
      const db = readLocalDb();
      db.app_users = db.app_users.map(x => x.id === id ? { ...x, ...updates } : x);
      writeLocalDb(db);
      const user = db.app_users.find(x => x.id === id);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabaseClient.from("app_users").delete().eq("id", id);
      if (error) throw error;
      await clearCached("cache:users");
      res.json({ success: true });
    } else {
      const db = readLocalDb();
      db.app_users = db.app_users.filter(x => x.id !== id);
      writeLocalDb(db);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
