import type { VehicleBrand, Category } from "./constants";

export type ProductAttributes = {
  amperage?: string; // Akkumulyator: masalan "60", "75"
  voltage?: string; // Akkumulyator: "12V"
  tireSize?: string; // Balon: "175/70 R13"
  tireSeason?: string; // "Yozgi" | "Qishki" | "Universal"
  unitBrand?: string; // mahsulot brendi (Bosch, Varta, Michelin)
};

export type Product = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  vehicle: VehicleBrand | string;
  category: Category | string;
  supplierId?: string | null;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  minQty: number;
  image?: string | null;
  description?: string | null;
  attributes?: ProductAttributes;
  branchStock?: Record<string, number>;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  vehicle: VehicleBrand | string;
  totalPurchases: number;
  debt: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  address: string;
  debt: number;
};

export type Employee = {
  id: string;
  name: string;
  phone: string;
  role: "Admin" | "Sotuvchi" | "Omborchi";
  salary: number;
  advance: number;
  hireDate: string;
  status: "Faol" | "Nofaol";
};

export type SaleItem = {
  productId: string;
  productName?: string | null;
  qty: number;
  price: number;
  buyPrice: number;
};

export type Sale = {
  id: string;
  date: string;
  customerId: string | null;
  sellerId: string | null;
  vehicle?: string;
  items: SaleItem[];
  discount: number;
  paymentType: "Naqd" | "Karta" | "Qarz" | "O'tkazma";
  total: number;
  profit: number;
  paid?: number;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
};

export type IncomingStock = {
  id: string;
  date: string;
  supplierId: string | null;
  productId: string;
  qty: number;
  buyPrice: number;
  invoice: string;
};

export type AuditEntry = {
  id: string;
  ts: string;
  userId: string;
  userName: string;
  action: "create" | "update" | "delete" | "login" | "logout";
  entity: string;
  entityId?: string;
  summary: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password?: string;
  oldPassword?: string;
  role: "Admin" | "Sotuvchi" | "Omborchi";
  permissions: string[];
  active: boolean;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Sotuvchi" | "Omborchi";
  permissions: string[];
};

export type DebtPayment = {
  id: string;
  date: string;
  type: "customer" | "supplier";
  targetId: string;
  targetName: string;
  amount: number;
  paymentMethod: "Naqd" | "Karta" | "O'tkazma";
  note?: string;
};

export type PriceHistoryEntry = {
  id: string;
  productId: string;
  productName: string;
  field: "buy_price" | "sell_price";
  oldValue: number | null;
  newValue: number;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
};
