import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateMockData, type Product, type Customer, type Supplier, type Employee, type Sale, type Expense, type IncomingStock } from "./mock-data";
import type { Warehouse, Role } from "./constants";
import { DEFAULT_CATEGORIES, DEFAULT_VEHICLE_BRANDS, ALL_PERMISSIONS } from "./constants";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  permissions: string[];
  active: boolean;
};

type SessionUser = { id: string; name: string; email: string; role: Role; permissions: string[] };

type State = {
  user: SessionUser | null;
  appUsers: AppUser[];
  login: (email: string, password: string, remember?: boolean) => boolean;
  logout: () => void;
  addAppUser: (u: Omit<AppUser, "id">) => void;
  updateAppUser: (id: string, u: Partial<AppUser>) => void;
  deleteAppUser: (id: string) => void;

  theme: "light" | "dark";
  toggleTheme: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  warehouse: Warehouse;
  setWarehouse: (w: Warehouse) => void;
  vehicleFilter: string;
  setVehicleFilter: (v: string) => void;

  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  sales: Sale[];
  expenses: Expense[];
  incoming: IncomingStock[];
  categories: string[];
  vehicleBrands: string[];

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
  deleteSale: (id: string) => void;

  addExpense: (e: Expense) => void;
  updateExpense: (id: string, e: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  addIncoming: (i: IncomingStock) => void;
  deleteIncoming: (id: string) => void;

  addCategory: (c: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (c: string) => void;

  addVehicleBrand: (b: string) => void;
  updateVehicleBrand: (oldName: string, newName: string) => void;
  deleteVehicleBrand: (b: string) => void;

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
      vehicleBrands: [...DEFAULT_VEHICLE_BRANDS],

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
        const customers = get().customers.map(c => {
          if (c.id !== s.customerId) return c;
          const debtDelta = s.paymentType === "Qarz" ? s.total : 0;
          return { ...c, debt: c.debt + debtDelta, totalPurchases: c.totalPurchases + s.total };
        });
        set({ sales: [s, ...get().sales], products, customers });
      },
      deleteSale: (id) => {
        const s = get().sales.find(x => x.id === id);
        if (!s) return;
        // restock items
        const products = get().products.map(p => {
          const item = s.items.find(i => i.productId === p.id);
          return item ? { ...p, quantity: p.quantity + item.qty } : p;
        });
        // reverse customer debt/purchases
        const customers = get().customers.map(c => {
          if (c.id !== s.customerId) return c;
          const debtDelta = s.paymentType === "Qarz" ? s.total : 0;
          return { ...c, debt: Math.max(0, c.debt - debtDelta), totalPurchases: Math.max(0, c.totalPurchases - s.total) };
        });
        set({ sales: get().sales.filter(x => x.id !== id), products, customers });
      },

      addExpense: (e) => set({ expenses: [e, ...get().expenses] }),
      updateExpense: (id, e) => set({ expenses: get().expenses.map(x => x.id === id ? { ...x, ...e } : x) }),
      deleteExpense: (id) => set({ expenses: get().expenses.filter(x => x.id !== id) }),

      addIncoming: (i) => {
        const products = get().products.map(p => p.id === i.productId ? { ...p, quantity: p.quantity + i.qty } : p);
        set({ incoming: [i, ...get().incoming], products });
      },
      deleteIncoming: (id) => {
        const inc = get().incoming.find(x => x.id === id);
        if (!inc) return;
        const products = get().products.map(p => p.id === inc.productId ? { ...p, quantity: Math.max(0, p.quantity - inc.qty) } : p);
        set({ incoming: get().incoming.filter(x => x.id !== id), products });
      },

      addCategory: (c) => {
        const name = c.trim();
        if (!name || get().categories.includes(name)) return;
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

      addVehicleBrand: (b) => {
        const n = b.trim();
        if (!n || get().vehicleBrands.includes(n)) return;
        set({ vehicleBrands: [...get().vehicleBrands, n] });
      },
      updateVehicleBrand: (oldName, newName) => {
        const n = newName.trim();
        if (!n) return;
        set({
          vehicleBrands: get().vehicleBrands.map(b => b === oldName ? n : b),
          products: get().products.map(p => p.vehicle === oldName ? { ...p, vehicle: n } : p),
          customers: get().customers.map(c => c.vehicle === oldName ? { ...c, vehicle: n } : c),
        });
      },
      deleteVehicleBrand: (b) => set({ vehicleBrands: get().vehicleBrands.filter(x => x !== b) }),

      resetData: () => {
        const fresh = generateMockData();
        set({ ...fresh, categories: [...DEFAULT_CATEGORIES], vehicleBrands: [...DEFAULT_VEHICLE_BRANDS] });
      },
    }),
    {
      name: "autoerp-pro-v1",
      version: 3,
      partialize: (s) => ({
        user: s.user, appUsers: s.appUsers, theme: s.theme, warehouse: s.warehouse, vehicleFilter: s.vehicleFilter,
        products: s.products, customers: s.customers, suppliers: s.suppliers,
        employees: s.employees, sales: s.sales, expenses: s.expenses, incoming: s.incoming,
        categories: s.categories, vehicleBrands: s.vehicleBrands,
      }),
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        if (!persisted.appUsers) persisted.appUsers = defaultAppUsers;
        if (!persisted.categories) persisted.categories = [...DEFAULT_CATEGORIES];
        if (!persisted.vehicleBrands) persisted.vehicleBrands = [...DEFAULT_VEHICLE_BRANDS];
        if (persisted.user && !persisted.user.permissions) {
          persisted.user.permissions = ALL_PERMISSIONS;
        }
        return persisted;
      },
    }
  )
);
