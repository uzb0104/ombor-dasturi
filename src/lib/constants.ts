// Uzbek labels and constants
export const VEHICLE_BRANDS = [
  "Shineray T30", "JAC", "FAW", "ISUZU", "Chevrolet",
  "Hyundai", "Kia", "Toyota", "Nexia", "Damas", "Labo",
] as const;
export type VehicleBrand = (typeof VEHICLE_BRANDS)[number];

export const DEFAULT_CATEGORIES = [
  "Dvigatel", "Tormoz tizimi", "Elektr", "Shinalar", "Akkumulyator",
  "Filtrlar", "Moy", "Kuzov qismlari", "Podveska",
] as const;
export const CATEGORIES = DEFAULT_CATEGORIES; // backward compat
export type Category = string;

export const WAREHOUSES = ["Asosiy ombor", "Filial 1", "Filial 2"] as const;
export type Warehouse = (typeof WAREHOUSES)[number];

export const ROLES = ["Admin", "Sotuvchi", "Omborchi"] as const;
export type Role = (typeof ROLES)[number];

export const NAV = [
  { to: "/dashboard", label: "Boshqaruv paneli", icon: "LayoutDashboard" },
  { to: "/inventory", label: "Omborxona", icon: "Warehouse" },
  { to: "/products", label: "Tovarlar", icon: "Package" },
  { to: "/categories", label: "Kategoriyalar", icon: "Tags" },
  { to: "/sales", label: "Sotuvlar", icon: "ShoppingCart" },
  { to: "/incoming", label: "Kirimlar", icon: "PackagePlus" },
  { to: "/customers", label: "Mijozlar (CRM)", icon: "Users" },
  { to: "/suppliers", label: "Yetkazib beruvchilar", icon: "Truck" },
  { to: "/debts", label: "Qarzdorlik", icon: "Wallet" },
  { to: "/employees", label: "Xodimlar", icon: "UserCog" },
  { to: "/expenses", label: "Xarajatlar", icon: "Receipt" },
  { to: "/reports", label: "Hisobotlar", icon: "BarChart3" },
  { to: "/barcode", label: "Barkod", icon: "ScanBarcode" },
  { to: "/settings", label: "Sozlamalar", icon: "Settings" },
] as const;

// Modules user can be granted access to (settings always available to admin)
export const PERMISSION_MODULES = NAV.filter(n => n.to !== "/settings").map(n => ({ path: n.to, label: n.label }));
export const ALL_PERMISSIONS = PERMISSION_MODULES.map(m => m.path);

export const formatSom = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(n);
