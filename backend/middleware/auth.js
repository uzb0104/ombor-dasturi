import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET .env faylda topilmadi! Server to'g'ri ishlamasligi mumkin.");
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
