import { z } from 'zod';

// ===================== AUTH =====================
export const loginSchema = z.object({
  email: z.string().email('Email formati noto\'g\'ri'),
  password: z.string().min(1, 'Parol majburiy'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Ism kamida 2 ta belgi bo\'lishi kerak'),
  email: z.string().email('Email formati noto\'g\'ri'),
  password: z.string().min(6, 'Parol kamida 6 ta belgi bo\'lishi kerak'),
  role: z.enum(['ADMIN', 'SELLER', 'WAREHOUSE_KEEPER']).default('SELLER'),
});

// ===================== PRODUCTS =====================
export const createProductSchema = z.object({
  name: z.string().min(1, 'Mahsulot nomi majburiy'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  vehicle: z.string().optional(),
  category: z.string().optional(),
  vehicle_id: z.string().optional(),
  category_id: z.string().optional(),
  supplier_id: z.string().optional(),
  buy_price: z.number().nonnegative('Olish narxi 0 dan kam bo\'lishi mumkin emas'),
  sell_price: z.number().positive('Sotish narxi musbat bo\'lishi kerak'),
  min_qty: z.number().int().nonnegative().default(5),
  description: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Kamida bitta maydon yangilanishi kerak' }
);

// ===================== CUSTOMERS =====================
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Mijoz ismi majburiy'),
  phone: z.string().optional(),
  address: z.string().optional(),
  vehicle_id: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const payDebtSchema = z.object({
  amount: z.number().positive('To\'lov summasi musbat bo\'lishi kerak'),
  note: z.string().optional(),
});

// ===================== SUPPLIERS =====================
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Yetkazib beruvchi nomi majburiy'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const paySupplierSchema = z.object({
  amount: z.number().positive('To\'lov summasi musbat bo\'lishi kerak'),
  note: z.string().optional(),
});

// ===================== EMPLOYEES =====================
export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Xodim ismi majburiy'),
  phone: z.string().optional(),
  role: z.string().min(1, 'Lavozim majburiy'),
  salary: z.number().nonnegative('Ish haqi 0 dan kam bo\'lishi mumkin emas'),
  hire_date: z.string().min(1, 'Ishga kirish sanasi majburiy'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const paySalarySchema = z.object({
  amount: z.number().positive('To\'lov summasi musbat bo\'lishi kerak'),
  type: z.string().min(1, 'To\'lov turi majburiy'),
  note: z.string().optional(),
});

// ===================== EXPENSES =====================
export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Xarajat toifasi majburiy'),
  amount: z.number().positive('Summa musbat bo\'lishi kerak'),
  note: z.string().optional(),
  warehouse_id: z.string().optional(),
  date: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// ===================== INVENTORY =====================
export const updateInventorySchema = z.object({
  product_id: z.string().min(1, 'Mahsulot ID majburiy'),
  warehouse_id: z.string().min(1, 'Ombor ID majburiy'),
  quantity: z.number().int().nonnegative('Miqdor 0 dan kam bo\'lishi mumkin emas'),
});

// ===================== Yordamchi funksiya =====================
/**
 * Validatsiya xatolarini standart formatda qaytaradi
 */
export function validateRequest<T>(schema: z.ZodType<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}
