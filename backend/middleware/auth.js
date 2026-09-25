import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET .env faylda majburiy");
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Kirish taqiqlangan, token topilmadi" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token yaroqsiz yoki muddati o'tgan" });
    req.user = user;
    next();
  });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Bu amal uchun ruxsat yetarli emas" });
    }
    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user?.role === "Admin" || req.user?.permissions?.includes(permission)) {
      return next();
    }
    return res.status(403).json({ error: "Bu amal uchun ruxsat yetarli emas" });
  };
}
