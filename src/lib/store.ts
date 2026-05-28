import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./api";
import type { Product, Customer, Supplier, Employee, Sale, Expense, IncomingStock } from "./mock-data";
import type { Warehouse, Role } from "./constants";
import { DEFAULT_CATEGORIES, DEFAULT_VEHICLE_BRANDS, ALL_PERMISSIONS } from "./constants";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  permissions: string[];
  active: boolean;
};

type SessionUser = { id: string; name: string; email: string; role: Role; permissions: string[] };

type State = {
  user: SessionUser | null;
  appUsers: AppUser[];
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  initializeUser: () => Promise<void>;

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

  fetchProducts: () => Promise<void>;
  addProduct: (p: any) => Promise<void>;
  updateProduct: (id: string, p: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  fetchCustomers: () => Promise<void>;
  addCustomer: (c: any) => Promise<void>;
  updateCustomer: (id: string, c: any) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  payCustomerDebt: (id: string, amount: number, note?: string) => Promise<void>;

  fetchSuppliers: () => Promise<void>;
  addSupplier: (s: any) => Promise<void>;
  updateSupplier: (id: string, s: any) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  paySupplierDebt: (id: string, amount: number, note?: string) => Promise<void>;

  fetchEmployees: () => Promise<void>;
  addEmployee: (e: any) => Promise<void>;
  updateEmployee: (id: string, e: any) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  paySalary: (id: string, amount: number, type: 'oylik' | 'avans', note?: string) => Promise<void>;

  fetchSales: () => Promise<void>;
  addSale: (s: any) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;

  fetchExpenses: () => Promise<void>;
  addExpense: (e: any) => Promise<void>;
  updateExpense: (id: string, e: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addIncoming: (i: IncomingStock) => void;
  deleteIncoming: (id: string) => Promise<void>;

  addCategory: (c: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (c: string) => void;

  addVehicleBrand: (b: string) => void;
  updateVehicleBrand: (oldName: string, newName: string) => void;
  deleteVehicleBrand: (b: string) => void;

  addAppUser: (u: Omit<AppUser, "id">) => void;
  updateAppUser: (id: string, u: Partial<AppUser>) => void;
  deleteAppUser: (id: string) => void;

  resetData: () => void;
  fetchAllData: () => Promise<void>;
};

const defaultAppUsers: AppUser[] = [
  { id: "u_admin", name: "Bosh admin", email: "admin@autoerp.uz", password: "admin123", role: "Admin", permissions: ALL_PERMISSIONS, active: true },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      appUsers: defaultAppUsers,
      isLoading: false,
      error: null,

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

      products: [],
      customers: [],
      suppliers: [],
      employees: [],
      sales: [],
      expenses: [],
      incoming: [],
      categories: [...DEFAULT_CATEGORIES],
      vehicleBrands: [...DEFAULT_VEHICLE_BRANDS],

      // Auth logikasi
      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const res = await api.auth.login({ email, password });
          set({ user: res.user, isLoading: false });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },
      logout: () => {
        api.auth.logout();
        set({ user: null, products: [], customers: [], suppliers: [], sales: [], expenses: [], employees: [], incoming: [] });
      },
      initializeUser: async () => {
        try {
          const res = await api.auth.getMe();
          set({ user: res.user });
        } catch (err) {
          set({ user: null });
        }
      },

      // Mahsulotlar (Products)
      fetchProducts: async () => {
        try {
          set({ isLoading: true });
          const products = await api.products.getAll();
          
          // Mahsulotlardan unikal kategoriya va brendlarni ajratib olamiz
          const dbCategories = Array.from(new Set(products.map((p: any) => p.category).filter(Boolean))) as string[];
          const dbBrands = Array.from(new Set(products.map((p: any) => p.vehicle).filter(Boolean))) as string[];

          const categories = Array.from(new Set([...get().categories, ...dbCategories]));
          const vehicleBrands = Array.from(new Set([...get().vehicleBrands, ...dbBrands]));

          set({ products, categories, vehicleBrands, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      addProduct: async (p) => {
        try {
          set({ isLoading: true });
          await api.products.create(p);
          await get().fetchProducts();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      updateProduct: async (id, p) => {
        try {
          set({ isLoading: true });
          await api.products.update(id, p);
          await get().fetchProducts();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      deleteProduct: async (id) => {
        try {
          set({ isLoading: true });
          await api.products.delete(id);
          await get().fetchProducts();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // Mijozlar (Customers)
      fetchCustomers: async () => {
        try {
          set({ isLoading: true });
          const customers = await api.customers.getAll();
          set({ customers, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      addCustomer: async (c) => {
        try {
          set({ isLoading: true });
          await api.customers.create(c);
          await get().fetchCustomers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      updateCustomer: async (id, c) => {
        try {
          set({ isLoading: true });
          await api.customers.update(id, c);
          await get().fetchCustomers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      deleteCustomer: async (id) => {
        try {
          set({ isLoading: true });
          await api.customers.delete(id);
          await get().fetchCustomers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      payCustomerDebt: async (id, amount, note) => {
        try {
          set({ isLoading: true });
          await api.customers.payDebt(id, amount, note);
          await get().fetchCustomers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // Yetkazib beruvchilar (Suppliers)
      fetchSuppliers: async () => {
        try {
          set({ isLoading: true });
          const suppliers = await api.suppliers.getAll();
          set({ suppliers, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      addSupplier: async (s) => {
        try {
          set({ isLoading: true });
          await api.suppliers.create(s);
          await get().fetchSuppliers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      updateSupplier: async (id, s) => {
        try {
          set({ isLoading: true });
          await api.suppliers.update(id, s);
          await get().fetchSuppliers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      deleteSupplier: async (id) => {
        try {
          set({ isLoading: true });
          await api.suppliers.delete(id);
          await get().fetchSuppliers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      paySupplierDebt: async (id, amount, note) => {
        try {
          set({ isLoading: true });
          await api.suppliers.paySupplier(id, amount, note);
          await get().fetchSuppliers();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // Xodimlar (Employees)
      fetchEmployees: async () => {
        try {
          set({ isLoading: true });
          const employees = await api.employees.getAll();
          set({ employees, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      addEmployee: async (e) => {
        try {
          set({ isLoading: true });
          await api.employees.create(e);
          await get().fetchEmployees();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      updateEmployee: async (id, e) => {
        try {
          set({ isLoading: true });
          await api.employees.update(id, e);
          await get().fetchEmployees();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      deleteEmployee: async (id) => {
        try {
          set({ isLoading: true });
          await api.employees.delete(id);
          await get().fetchEmployees();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      paySalary: async (id, amount, type, note) => {
        try {
          set({ isLoading: true });
          await api.employees.paySalaryOrAdvance(id, amount, type, note);
          await get().fetchEmployees();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // Sotuvlar (Sales)
      fetchSales: async () => {
        try {
          set({ isLoading: true });
          const sales = await api.sales.getAll();
          set({ sales, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      addSale: async (s) => {
        try {
          set({ isLoading: true });
          await api.sales.create(s);
          await get().fetchSales();
          await get().fetchProducts();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      deleteSale: async (id) => {
        try {
          set({ isLoading: true });
          await api.sales.delete(id);
          await get().fetchSales();
          await get().fetchProducts();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // Xarajatlar (Expenses)
      fetchExpenses: async () => {
        try {
          set({ isLoading: true });
          const expenses = await api.expenses.getAll();
          set({ expenses, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      addExpense: async (e) => {
        try {
          set({ isLoading: true });
          await api.expenses.create(e);
          await get().fetchExpenses();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      updateExpense: async (id, e) => {
        try {
          set({ isLoading: true });
          await api.expenses.update(id, e);
          await get().fetchExpenses();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      deleteExpense: async (id) => {
        try {
          set({ isLoading: true });
          await api.expenses.delete(id);
          await get().fetchExpenses();
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      // Kirimlar (Incoming stock) - local state & persisted in storage
      addIncoming: (i) => {
        set({ incoming: [i, ...get().incoming] });
      },
      deleteIncoming: async (id) => {
        set({ incoming: get().incoming.filter(x => x.id !== id) });
      },

      // Kategoriyalar (Categories)
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
        });
      },
      deleteCategory: (c) => set({ categories: get().categories.filter(x => x !== c) }),

      // Avtomobil brendlari (Vehicle brands)
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
        });
      },
      deleteVehicleBrand: (b) => set({ vehicleBrands: get().vehicleBrands.filter(x => x !== b) }),

      // AppUsers
      addAppUser: (u) => set({ appUsers: [{ ...u, id: `usr_${Math.random().toString(36).slice(2, 9)}` }, ...get().appUsers] }),
      updateAppUser: (id, u) => set({ appUsers: get().appUsers.map(x => x.id === id ? { ...x, ...u } : x) }),
      deleteAppUser: (id) => set({ appUsers: get().appUsers.filter(x => x.id !== id) }),

      resetData: () => {
        set({ incoming: [], categories: [...DEFAULT_CATEGORIES], vehicleBrands: [...DEFAULT_VEHICLE_BRANDS] });
      },

      // Barcha ma'lumotlarni bir vaqtda yuklash
      fetchAllData: async () => {
        try {
          set({ isLoading: true });
          await Promise.all([
            get().fetchProducts(),
            get().fetchCustomers(),
            get().fetchSuppliers(),
            get().fetchEmployees(),
            get().fetchSales(),
            get().fetchExpenses()
          ]);
          set({ isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      }
    }),
    {
      name: "autoerp-pro-v1",
      version: 4,
      partialize: (s) => ({
        user: s.user,
        appUsers: s.appUsers,
        theme: s.theme,
        warehouse: s.warehouse,
        vehicleFilter: s.vehicleFilter,
        categories: s.categories,
        vehicleBrands: s.vehicleBrands,
        incoming: s.incoming,
      })
    }
  )
);
