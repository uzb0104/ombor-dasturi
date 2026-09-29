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

export const DEFAULT_CATEGORIES = ["Dvigatel", "Shinalar (Balon)", "Akkumulyator"] as const;
export const CATEGORIES = DEFAULT_CATEGORIES;
export type Category = string;

export const DEFAULT_BRANCHES = ["Asosiy ombor", "Filial 1", "Filial 2"] as const;
export const WAREHOUSES = DEFAULT_BRANCHES; // backward compat
export type Warehouse = string;

export const ROLES = ["Admin", "Sotuvchi", "Omborchi"] as const;
export type Role = (typeof ROLES)[number];

export const NAV = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: "LayoutDashboard" },
  {
    to: "/inventory",
    labelKey: "nav.inventory",
    icon: "Warehouse",
    children: [
      { to: "/products", labelKey: "nav.products", icon: "Package" },
      { to: "/categories", labelKey: "nav.categories", icon: "Tags" },
      { to: "/incoming", labelKey: "nav.incoming", icon: "PackagePlus" },
      { to: "/used-batteries", labelKey: "nav.usedBatteries", icon: "BatteryCharging" },
    ],
  },
  {
    to: "/sales",
    labelKey: "nav.sales",
    icon: "ShoppingCart",
    children: [{ to: "/debts", labelKey: "nav.debts", icon: "Wallet" }],
  },
  { to: "/customers", labelKey: "nav.customers", icon: "Users" },
  { to: "/employees", labelKey: "nav.employees", icon: "UserCog" },
  { to: "/expenses", labelKey: "nav.expenses", icon: "Receipt" },
  { to: "/reports", labelKey: "nav.reports", icon: "BarChart3" },
  { to: "/audit", labelKey: "nav.audit", icon: "FileClock" },
  { to: "/settings", labelKey: "nav.settings", icon: "Settings" },
] as const;

type NavItem = {
  to: string;
  labelKey: string;
  icon: string;
  children?: readonly { to: string; labelKey: string; icon: string }[];
};

const flatNavItems: { to: string; labelKey: string }[] = [];
(NAV as readonly NavItem[]).forEach((item) => {
  flatNavItems.push({ to: item.to, labelKey: item.labelKey });
  if (item.children) {
    item.children.forEach((child) => {
      flatNavItems.push({ to: child.to, labelKey: child.labelKey });
    });
  }
});

export const PERMISSION_MODULES = flatNavItems
  .filter((n) => n.to !== "/settings")
  .map((n) => ({
    path: n.to,
    labelKey: n.labelKey,
  }));
export const ALL_PERMISSIONS = PERMISSION_MODULES.map((m) => m.path);

export const formatSom = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";

export const formatNumber = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);
