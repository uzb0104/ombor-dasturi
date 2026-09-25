import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/db.js", () => ({
  isSupabaseConfigured: true,
  supabaseClient: {
    from: (table) => ({
      select: () => {
        if (table === "products") {
          return Promise.reject(new Error("products table missing"));
        }
        return Promise.resolve({ count: 2, error: null });
      },
    }),
  },
  readLocalDb: () => ({
    products: [{ id: "p1" }, { id: "p2" }],
    customers: [{ id: "c1" }],
    vehicle_brands: ["Chevrolet", "Toyota"],
  }),
}));

import authRouter from "./auth.js";

describe("auth public stats", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("falls back to the local DB when Supabase queries fail", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRouter);

    const res = await request(app).get("/api/auth/public-stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      products: 2,
      customers: 1,
      vehicleBrands: 2,
    });
  });
});
