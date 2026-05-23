import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateMockData, type Product, type Customer, type Supplier, type Employee, type Sale, type Expense, type IncomingStock } from "./mock-data";
import type { VehicleBrand, Warehouse, Role } from "./constants";
import { DEFAULT_CATEGORIES, ALL_PERMISSIONS } from "./constants";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string; // demo only
  role: Role;
  permissions: string[]; // route paths (admins ignore this and get all)
  active: boolean;
};

type SessionUser = { id: string; name: string; email: string; role: Role; permissions: string[] };

type State = {
  // auth
  user: SessionUser | null;
  appUsers: AppUser[];
  login: (email: string, password: string, remember?: boolean) => boolean;
  logout: () => void;
  addAppUser: (u: Omit<AppUser, "id">) => void;
  updateAppUser: (id: string, u: Partial<AppUser>) => void;
  deleteAppUser: (id: string) => void;

  // ui
  theme: "light" | "dark";
  toggleTheme: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  warehouse: Warehouse;
  setWarehouse: (w: Warehouse) => void;
  vehicleFilter: VehicleBrand | "all";
  setVehicleFilter: (v: VehicleBrand | "all") => void;

  // data
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  sales: Sale[];
  expenses: Expense[];
  incoming: IncomingStock[];
  categories: string[];

  // actions
  addProduct: (p: Product) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addCustomer: (c: Customer) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addEmployee: (e: Employee) => void;
  updateEmployee: (id: string, e: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  addSale: (s: Sale) => void;
  addExpense: (e: Expense) => void;
  addIncoming: (i: IncomingStock) => void;

  addCategory: (c: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (c: string) => void;

  resetData: () => void;
};

const seed = generateMockData();

const defaultAppUsers: AppUser[] = [
  { id: "u_admin", name: "Bosh admin", email: "admin@autoerp.uz", password: "admin123", role: "Admin", permissions: ALL_PERMISSIONS, active: true },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      appUsers: defaultAppUsers,
      login: (email, password) => {
        const u = get().appUsers.find(x => x.email.toLowerCase() === email.toLowerCase() && x.active);
        if (u) {
          if (u.password && u.password !== password) return false;
          const perms = u.role === "Admin" ? ALL_PERMISSIONS : u.permissions;
          set({ user: { id: u.id, name: u.name, email: u.email, role: u.role, permissions: perms } });
          return true;
        }
        // fallback: allow admin@autoerp.uz with any pwd (demo)
        if (email.toLowerCase() === "admin@autoerp.uz") {
          set({ user: { id: "u_admin", name: "Bosh admin", email, role: "Admin", permissions: ALL_PERMISSIONS } });
          return true;
        }
        return false;
      },
      logout: () => set({ user: null }),
      addAppUser: (u) => set({ appUsers: [{ ...u, id: `usr_${Math.random().toString(36).slice(2, 9)}` }, ...get().appUsers] }),
      updateAppUser: (id, u) => set({ appUsers: get().appUsers.map(x => x.id === id ? { ...x, ...u } : x) }),
      deleteAppUser: (id) => set({ appUsers: get().appUsers.filter(x => x.id !== id) }),

      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
        if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", next === "dark");
      },
      sidebarOpen: true,
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      warehouse: "Asosiy ombor",
      setWarehouse: (w) => set({ warehouse: w }),
      vehicleFilter: "all",
      setVehicleFilter: (v) => set({ vehicleFilter: v }),

      products: seed.products,
      customers: seed.customers,
      suppliers: seed.suppliers,
      employees: seed.employees,
      sales: seed.sales,
      expenses: seed.expenses,
      incoming: seed.incoming,
      categories: [...DEFAULT_CATEGORIES],

      addProduct: (p) => set({ products: [p, ...get().products] }),
      updateProduct: (id, p) => set({ products: get().products.map(x => x.id === id ? { ...x, ...p } : x) }),
      deleteProduct: (id) => set({ products: get().products.filter(x => x.id !== id) }),

      addCustomer: (c) => set({ customers: [c, ...get().customers] }),
      updateCustomer: (id, c) => set({ customers: get().customers.map(x => x.id === id ? { ...x, ...c } : x) }),
      deleteCustomer: (id) => set({ customers: get().customers.filter(x => x.id !== id) }),

      addSupplier: (s) => set({ suppliers: [s, ...get().suppliers] }),
      updateSupplier: (id, s) => set({ suppliers: get().suppliers.map(x => x.id === id ? { ...x, ...s } : x) }),
      deleteSupplier: (id) => set({ suppliers: get().suppliers.filter(x => x.id !== id) }),

      addEmployee: (e) => set({ employees: [e, ...get().employees] }),
      updateEmployee: (id, e) => set({ employees: get().employees.map(x => x.id === id ? { ...x, ...e } : x) }),
      deleteEmployee: (id) => set({ employees: get().employees.filter(x => x.id !== id) }),

      addSale: (s) => {
        const products = get().products.map(p => {
          const item = s.items.find(i => i.productId === p.id);
          return item ? { ...p, quantity: Math.max(0, p.quantity - item.qty) } : p;
        });
        // if credit sale with customer, increase customer's debt + totalPurchases
        const customers = get().customers.map(c => {
          if (c.id !== s.customerId) return c;
          const debtDelta = s.paymentType === "Qarz" ? s.total : 0;
          return { ...c, debt: c.debt + debtDelta, totalPurchases: c.totalPurchases + s.total };
        });
        set({ sales: [s, ...get().sales], products, customers });
      },
      addExpense: (e) => set({ expenses: [e, ...get().expenses] }),
      addIncoming: (i) => {
        const products = get().products.map(p => p.id === i.productId ? { ...p, quantity: p.quantity + i.qty } : p);
        set({ incoming: [i, ...get().incoming], products });
      },

      addCategory: (c) => {
        const name = c.trim();
        if (!name) return;
        if (get().categories.includes(name)) return;
        set({ categories: [...get().categories, name] });
      },
      updateCategory: (oldName, newName) => {
        const n = newName.trim();
        if (!n) return;
        set({
          categories: get().categories.map(c => c === oldName ? n : c),
          products: get().products.map(p => p.category === oldName ? { ...p, category: n } : p),
        });
      },
      deleteCategory: (c) => set({ categories: get().categories.filter(x => x !== c) }),

      resetData: () => {
        const fresh = generateMockData();
        set({ ...fresh, categories: [...DEFAULT_CATEGORIES] });
      },
    }),
    {
      name: "autoerp-pro-v1",
      version: 2,
      partialize: (s) => ({
        user: s.user, appUsers: s.appUsers, theme: s.theme, warehouse: s.warehouse, vehicleFilter: s.vehicleFilter,
        products: s.products, customers: s.customers, suppliers: s.suppliers,
        employees: s.employees, sales: s.sales, expenses: s.expenses, incoming: s.incoming,
        categories: s.categories,
      }),
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        if (!persisted.appUsers) persisted.appUsers = defaultAppUsers;
        if (!persisted.categories) persisted.categories = [...DEFAULT_CATEGORIES];
        if (persisted.user && !persisted.user.permissions) {
          persisted.user.permissions = ALL_PERMISSIONS;
        }
        return persisted;
      },
    }
  )
);
