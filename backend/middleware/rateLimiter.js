import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Haddan tashqari ko'p so'rov yuborildi. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Kirish urinishlari ko'payib ketdi. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring.",
  },
});
