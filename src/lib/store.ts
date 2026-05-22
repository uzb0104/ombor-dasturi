import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateMockData, type Product, type Customer, type Supplier, type Employee, type Sale, type Expense, type IncomingStock } from "./mock-data";
import type { VehicleBrand, Warehouse, Role } from "./constants";

type User = { id: string; name: string; email: string; role: Role };

type State = {
  // auth
  user: User | null;
  login: (email: string, password: string, remember?: boolean) => boolean;
  logout: () => void;

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

  resetData: () => void;
};

const seed = generateMockData();

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      login: (email, _password, _remember) => {
        const role: Role = email.includes("admin") ? "Admin" : email.includes("ombor") ? "Omborchi" : "Sotuvchi";
        set({ user: { id: "u1", name: email.split("@")[0] || "Foydalanuvchi", email, role } });
        return true;
      },
      logout: () => set({ user: null }),

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
        // decrement inventory
        const products = get().products.map(p => {
          const item = s.items.find(i => i.productId === p.id);
          return item ? { ...p, quantity: Math.max(0, p.quantity - item.qty) } : p;
        });
        set({ sales: [s, ...get().sales], products });
      },
      addExpense: (e) => set({ expenses: [e, ...get().expenses] }),
      addIncoming: (i) => {
        const products = get().products.map(p => p.id === i.productId ? { ...p, quantity: p.quantity + i.qty } : p);
        set({ incoming: [i, ...get().incoming], products });
      },

      resetData: () => {
        const fresh = generateMockData();
        set({ ...fresh });
      },
    }),
    {
      name: "autoerp-pro-v1",
      partialize: (s) => ({
        user: s.user, theme: s.theme, warehouse: s.warehouse, vehicleFilter: s.vehicleFilter,
        products: s.products, customers: s.customers, suppliers: s.suppliers,
        employees: s.employees, sales: s.sales, expenses: s.expenses, incoming: s.incoming,
      }),
    }
  )
);
