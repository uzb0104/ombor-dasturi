// Uzbek labels and constants
export const DEFAULT_VEHICLE_BRANDS = [
  "Shineray T30",
  "JAC",
  "FAW",
  "ISUZU",
  "Chevrolet",
  "Hyundai",
  "Kia",
  "Toyota",
  "Nexia",
  "Damas",
  "Labo",
] as const;
export const VEHICLE_BRANDS = DEFAULT_VEHICLE_BRANDS; // backward compat
export type VehicleBrand = string;

export const DEFAULT_CATEGORIES = [
  "Dvigatel",
  "Tormoz tizimi",
  "Elektr",
  "Shinalar (Balon)",
  "Akkumulyator",
  "Filtrlar",
  "Moy",
  "Kuzov qismlari",
  "Podveska",
] as const;
export const CATEGORIES = DEFAULT_CATEGORIES;
export type Category = string;

export const DEFAULT_BRANCHES = ["Asosiy ombor", "Filial 1", "Filial 2"] as const;
export const WAREHOUSES = DEFAULT_BRANCHES; // backward compat
export type Warehouse = string;

export const ROLES = ["Admin", "Sotuvchi", "Omborchi"] as const;
export type Role = (typeof ROLES)[number];

export const NAV = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: "LayoutDashboard" },
  { to: "/inventory", labelKey: "nav.inventory", icon: "Warehouse" },
  { to: "/products", labelKey: "nav.products", icon: "Package" },
  { to: "/categories", labelKey: "nav.categories", icon: "Tags" },
  { to: "/sales", labelKey: "nav.sales", icon: "ShoppingCart" },
  { to: "/incoming", labelKey: "nav.incoming", icon: "PackagePlus" },
  { to: "/customers", labelKey: "nav.customers", icon: "Users" },
  { to: "/suppliers", labelKey: "nav.suppliers", icon: "Truck" },
  { to: "/debts", labelKey: "nav.debts", icon: "Wallet" },
  { to: "/employees", labelKey: "nav.employees", icon: "UserCog" },
  { to: "/expenses", labelKey: "nav.expenses", icon: "Receipt" },
  { to: "/reports", labelKey: "nav.reports", icon: "BarChart3" },
  { to: "/audit", labelKey: "nav.audit", icon: "FileClock" },
  { to: "/barcode", labelKey: "nav.barcode", icon: "ScanBarcode" },
  { to: "/settings", labelKey: "nav.settings", icon: "Settings" },
] as const;

export const PERMISSION_MODULES = NAV.filter((n) => n.to !== "/settings").map((n) => ({
  path: n.to,
  labelKey: n.labelKey,
}));
export const ALL_PERMISSIONS = PERMISSION_MODULES.map((m) => m.path);

export const formatSom = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";

export const formatNumber = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);
