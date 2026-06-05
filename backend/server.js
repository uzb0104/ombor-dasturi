import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// Import local utilities and databases
import {
  isSupabaseConfigured,
  supabaseClient,
  readLocalDb,
  writeLocalDb,
  isRedisConnected,
} from "./lib/db.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

// Import router modules
import authRouter from "./routes/auth.js";
import productsRouter from "./routes/products.js";
import customersRouter from "./routes/customers.js";
import suppliersRouter from "./routes/suppliers.js";
import employeesRouter from "./routes/employees.js";
import expensesRouter from "./routes/expenses.js";
import debtsRouter from "./routes/debts.js";
import usersRouter from "./routes/users.js";
import auditRouter from "./routes/audit.js";
import constantsRouter from "./routes/constants.js";
import incomingRouter from "./routes/incoming.js";
import salesRouter from "./routes/sales.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS sozlamalari (Faza 1: Xavfsizlik bo'yicha cheklov)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Kelajakda qo'shimcha production domenlar qo'shilishi mumkin
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Brauzer bo'lmagan so'rovlar (masalan, curl, postman yoki mobil app) yoki ruxsat etilgan origins
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("CORS siyosati tomonidan bloklandi"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

// Umumiy rate limiting (Faza 1: Xavfsizlik)
app.use("/api", apiLimiter);

// ─────────────── SEEDING DEFAULT ADMIN ───────────────
async function ensureDefaultAdmin() {
  const defaultEmail = "admin@autoerp.uz";
  const defaultPasswordHash = bcrypt.hashSync("admin123", 10);

  if (isSupabaseConfigured) {
    try {
      const { data: existing } = await supabaseClient
        .from("app_users")
        .select("id")
        .eq("email", defaultEmail)
        .maybeSingle();

      if (existing) {
        console.log("✅ Admin foydalanuvchi Supabase da mavjud");
        return;
      }

      const { error } = await supabaseClient.from("app_users").insert([
        {
          id: "u_admin",
          name: "Bosh admin",
          email: defaultEmail,
          password: defaultPasswordHash,
          role: "Admin",
          permissions: [],
          active: true,
        },
      ]);

      if (error) {
        console.error("❌ Admin seed xatosi:", error.message);
        return;
      }
      console.log("✅ Bosh admin Supabase ga qo'shildi (admin@autoerp.uz / admin123)");
    } catch (err) {
      console.error("❌ Admin seed:", err.message);
    }
  } else {
    try {
      const db = readLocalDb();
      if (!db.app_users) db.app_users = [];

      const existing = db.app_users.find(
        (u) => u.email.toLowerCase() === defaultEmail.toLowerCase(),
      );
      if (existing) {
        console.log("✅ Admin foydalanuvchi Mahalliy DB da mavjud");
        return;
      }

      db.app_users.push({
        id: "u_admin",
        name: "Bosh admin",
        email: defaultEmail,
        password: defaultPasswordHash,
        role: "Admin",
        permissions: [],
        active: true,
      });
      writeLocalDb(db);
      console.log("✅ Bosh admin Mahalliy DB ga qo'shildi (admin@autoerp.uz / admin123)");
    } catch (err) {
      console.error("❌ Mahalliy Admin seed xatosi:", err.message);
    }
  }
}

// ─────────────── HEALTH ENDPOINT ───────────────
app.get("/api/health", async (_req, res) => {
  res.json({
    ok: true,
    supabase: isSupabaseConfigured,
    redis: isRedisConnected,
    port: Number(PORT),
    mode: isSupabaseConfigured ? "supabase" : "local-json",
  });
});

// ─────────────── ROUTE MOUNTING ───────────────
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/customers", customersRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/debt-payments", debtsRouter);
app.use("/api/users", usersRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api", constantsRouter); // mount constant endpoints under root /api
app.use("/api/incoming", incomingRouter);
app.use("/api/sales", salesRouter);

// Serverni ishga tushirish (test rejimida port tinglanmaydi, faqat app eksport qilinadi)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, async () => {
    console.log(`📡 AutoERP Pro backend server port ${PORT} da muvaffaqiyatli ishga tushdi!`);
    console.log(`🔗 API manzili: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
    await ensureDefaultAdmin();
  });
} else {
  // Test rejimida ham default admin foydalanuvchi mavjudligini ta'minlash
  await ensureDefaultAdmin();
}

export default app;
