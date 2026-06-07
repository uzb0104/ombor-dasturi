import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { isSupabaseConfigured, supabaseClient, readLocalDb } from "../lib/db.js";
import { validate, loginSchema } from "../lib/validators.js";
import { authenticateToken } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// TIZIMGA KIRISH (LOGIN)
router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("app_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("active", true)
        .maybeSingle(); // maybeSingle allows us to handle no rows gracefully

      if (data) user = data;
    } else {
      const db = readLocalDb();
      user = db.app_users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
    }

    if (!user) {
      return res.status(400).json({ error: "Email yoki parol noto'g'ri" });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Email yoki parol noto'g'ri" });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user: payload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// JORIY SESSIYA USERINI OLISH
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// JAMOATCHILIK (PUBLIC) STATISTIKALARI
router.get("/public-stats", async (req, res) => {
  try {
    let productsCount = 0;
    let customersCount = 0;
    let vehicleBrandsCount = 0;

    if (isSupabaseConfigured) {
      const [prodRes, custRes, brandRes] = await Promise.all([
        supabaseClient.from("products").select("id", { count: "exact", head: true }),
        supabaseClient.from("customers").select("id", { count: "exact", head: true }),
        supabaseClient.from("vehicle_brands").select("name", { count: "exact", head: true })
      ]);
      productsCount = prodRes.count || 0;
      customersCount = custRes.count || 0;
      vehicleBrandsCount = brandRes.count || 0;
    } else {
      const db = readLocalDb();
      productsCount = (db.products || []).length;
      customersCount = (db.customers || []).length;
      vehicleBrandsCount = (db.vehicle_brands || []).length;
    }

    res.json({
      products: productsCount,
      customers: customersCount,
      vehicleBrands: vehicleBrandsCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
