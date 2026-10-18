import express from "express";
import {
  isSupabaseConfigured,
  supabaseClient,
  readLocalDb,
  getCached,
  setCached,
} from "../lib/db.js";
import { authenticateToken } from "../middleware/auth.js";
import categoriesRouter from "./categories.js";
import incomingCategoriesRouter from "./incomingCategories.js";
import vehicleBrandsRouter from "./vehicleBrands.js";
import branchesRouter from "./branches.js";

const router = express.Router();

// Mount modular sub-routers
router.use("/categories", categoriesRouter);
router.use("/incoming-categories", incomingCategoriesRouter);
router.use("/vehicle-brands", vehicleBrandsRouter);
router.use("/branches", branchesRouter);

// ─────────────── CONSTANTS OVERALL ───────────────
router.get("/constants", authenticateToken, async (_req, res) => {
  const cacheKey = "cache:constants";
  try {
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    if (isSupabaseConfigured) {
      const { data: cats } = await supabaseClient
        .from("categories")
        .select("name")
        .order("name", { ascending: true });
      const { data: brands } = await supabaseClient
        .from("vehicle_brands")
        .select("name")
        .order("name", { ascending: true });
      const { data: branches } = await supabaseClient
        .from("branches")
        .select("name")
        .order("name", { ascending: true });

      const resData = {
        categories: (cats || [])
          .map((c) => c.name)
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
        vehicleBrands: (brands || [])
          .map((b) => b.name)
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
        branches: (branches || [])
          .map((br) => br.name)
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
      };
      await setCached(cacheKey, resData);
      res.json(resData);
    } else {
      const db = readLocalDb();
      res.json({
        categories: (db.categories || [])
          .slice()
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
        vehicleBrands: (db.vehicle_brands || [])
          .slice()
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
        branches: (db.branches || [])
          .slice()
          .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
