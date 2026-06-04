import { z } from "zod";

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join("; ");
        return res.status(400).json({ error: `Ma'lumotlar noto'g'ri formatda: ${errorMessages}` });
      }
      return res.status(400).json({ error: error.message });
    }
  };
}

export const loginSchema = z.object({
  email: z.string().email("Noto'g'ri email shakli"),
  password: z.string().min(4, "Parol kamida 4 ta belgidan iborat bo'lishi kerak"),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nomi kiritilishi shart"),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  buyPrice: z.number().nonnegative("Sotib olish narxi 0 dan kam bo'lmasligi kerak"),
  sellPrice: z.number().nonnegative("Sotish narxi 0 dan kam bo'lmasligi kerak"),
  quantity: z.number().nonnegative("Miqdor 0 dan kam bo'lmasligi kerak").default(0),
  minQty: z.number().nonnegative("Minimal miqdor 0 dan kam bo'lmasligi kerak").default(0),
  image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  attributes: z.record(z.any()).optional().default({}),
  branchStock: z.record(z.number()).optional().default({}),
});

export const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Mijoz ismi kiritilishi shart"),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  vehicle: z.string().nullable().optional(),
  totalPurchases: z.number().nonnegative().optional().default(0),
  debt: z.number().optional().default(0),
});

export const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Yetkazib beruvchi nomi kiritilishi shart"),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  debt: z.number().optional().default(0),
});

export const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Xodim ismi kiritilishi shart"),
  phone: z.string().optional().default(""),
  role: z.string().min(1, "Rol kiritilishi shart"),
  salary: z.number().nonnegative().default(0),
  advance: z.number().nonnegative().default(0),
  hireDate: z
    .string()
    .optional()
    .default(() => new Date().toISOString().split("T")[0]),
  status: z.enum(["Faol", "Nofaol"]).default("Faol"),
});

export const incomingSchema = z.object({
  id: z.string().optional(),
  date: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  supplierId: z.string().nullable().optional(),
  productId: z.string().min(1, "Tovar ID kiritilishi shart"),
  qty: z.number().positive("Miqdor musbat bo'lishi shart"),
  buyPrice: z.number().positive("Sotib olish narxi musbat bo'lishi shart"),
  invoice: z.string().optional().default(""),
});

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Tovar ID kiritilishi shart"),
  qty: z.number().positive("Sotuv miqdori musbat bo'lishi shart"),
  price: z.number().nonnegative("Sotuv narxi 0 dan kam bo'lmasligi kerak"),
  buyPrice: z.number().nonnegative("Asl narxi 0 dan kam bo'lmasligi kerak"),
});

export const saleSchema = z.object({
  id: z.string().optional(),
  date: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  customerId: z.string().nullable().optional(),
  sellerId: z.string().nullable().optional(),
  discount: z.number().nonnegative().default(0),
  paymentType: z.enum(["Naqd", "Karta", "Qarz", "O'tkazma"]),
  total: z.number().nonnegative("Jami summa 0 dan kam bo'lmasligi kerak"),
  profit: z.number().default(0),
  paid: z.number().nonnegative().optional().default(0),
  items: z.array(saleItemSchema).min(1, "Kamida bitta tovar sotilishi kerak"),
});

export const expenseSchema = z.object({
  id: z.string().optional(),
  date: z
    .string()
    .optional()
    .default(() => new Date().toISOString().split("T")[0]),
  category: z.string().min(1, "Kategoriya kiritilishi shart"),
  amount: z.number().positive("Xarajat miqdori musbat bo'lishi shart"),
  note: z.string().optional().default(""),
});

export const debtPaymentSchema = z.object({
  id: z.string().optional(),
  date: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  type: z.enum(["customer", "supplier"]),
  targetId: z.string().min(1, "Qarz egasi ID kiritilishi shart"),
  targetName: z.string().min(1, "Qarz egasi nomi kiritilishi shart"),
  amount: z.number().positive("To'lov miqdori musbat bo'lishi shart"),
  paymentMethod: z.enum(["Naqd", "Karta", "O'tkazma"]),
  note: z.string().optional().default(""),
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Ism kiritilishi shart"),
  email: z.string().email("Noto'g'ri email shakli"),
  password: z.string().min(4, "Parol kamida 4 belgidan iborat bo'lishi kerak").optional(),
  oldPassword: z.string().optional(),
  role: z.enum(["Admin", "Sotuvchi", "Omborchi"]).default("Sotuvchi"),
  permissions: z.array(z.string()).optional().default([]),
  active: z.boolean().default(true),
});
