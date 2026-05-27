import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateMockData, type Product, type Customer, type Supplier, type Employee, type Sale, type Expense, type IncomingStock } from "./mock-data";
import type { Warehouse, Role } from "./constants";
import { DEFAULT_CATEGORIES, DEFAULT_VEHICLE_BRANDS, DEFAULT_BRANCHES, ALL_PERMISSIONS } from "./constants";

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

  branches: string[];
  addBranch: (b: string) => void;
  updateBranch: (oldName: string, newName: string) => void;
  deleteBranch: (b: string) => void;

  auditLog: AuditEntry[];
  logAudit: (e: Omit<AuditEntry, "id" | "ts" | "userId" | "userName">) => void;
  clearAudit: () => void;

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
          get().logAudit({ action: "login", entity: "session", summary: `${u.name} tizimga kirdi` });
          return true;
        }
        if (email.toLowerCase() === "admin@autoerp.uz") {
          set({ user: { id: "u_admin", name: "Bosh admin", email, role: "Admin", permissions: ALL_PERMISSIONS } });
          get().logAudit({ action: "login", entity: "session", summary: `Bosh admin tizimga kirdi` });
          return true;
        }
        return false;
      },
      logout: () => { get().logAudit({ action: "logout", entity: "session", summary: `${get().user?.name || ""} tizimdan chiqdi` }); set({ user: null }); },
      addAppUser: (u) => { const id = `usr_${Math.random().toString(36).slice(2, 9)}`; set({ appUsers: [{ ...u, id }, ...get().appUsers] }); get().logAudit({ action: "create", entity: "user", entityId: id, summary: `Yangi foydalanuvchi: ${u.name} (${u.role})` }); },
      updateAppUser: (id, u) => { const prev = get().appUsers.find(x => x.id === id); set({ appUsers: get().appUsers.map(x => x.id === id ? { ...x, ...u } : x) }); get().logAudit({ action: "update", entity: "user", entityId: id, summary: `Foydalanuvchi yangilandi: ${prev?.name}` }); },
      deleteAppUser: (id) => { const prev = get().appUsers.find(x => x.id === id); set({ appUsers: get().appUsers.filter(x => x.id !== id) }); get().logAudit({ action: "delete", entity: "user", entityId: id, summary: `Foydalanuvchi o'chirildi: ${prev?.name}` }); },

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

      addProduct: (p) => { set({ products: [p, ...get().products] }); get().logAudit({ action: "create", entity: "product", entityId: p.id, summary: `Tovar qo'shildi: ${p.name}` }); },
      updateProduct: (id, p) => { const prev = get().products.find(x => x.id === id); set({ products: get().products.map(x => x.id === id ? { ...x, ...p } : x) }); get().logAudit({ action: "update", entity: "product", entityId: id, summary: `Tovar yangilandi: ${prev?.name}` }); },
      deleteProduct: (id) => { const prev = get().products.find(x => x.id === id); set({ products: get().products.filter(x => x.id !== id) }); get().logAudit({ action: "delete", entity: "product", entityId: id, summary: `Tovar o'chirildi: ${prev?.name}` }); },

      addCustomer: (c) => { set({ customers: [c, ...get().customers] }); get().logAudit({ action: "create", entity: "customer", entityId: c.id, summary: `Mijoz qo'shildi: ${c.name}` }); },
      updateCustomer: (id, c) => { set({ customers: get().customers.map(x => x.id === id ? { ...x, ...c } : x) }); get().logAudit({ action: "update", entity: "customer", entityId: id, summary: `Mijoz yangilandi` }); },
      deleteCustomer: (id) => { const prev = get().customers.find(x => x.id === id); set({ customers: get().customers.filter(x => x.id !== id) }); get().logAudit({ action: "delete", entity: "customer", entityId: id, summary: `Mijoz o'chirildi: ${prev?.name}` }); },

      addSupplier: (s) => { set({ suppliers: [s, ...get().suppliers] }); get().logAudit({ action: "create", entity: "supplier", entityId: s.id, summary: `Yetkazib beruvchi: ${s.name}` }); },
      updateSupplier: (id, s) => { set({ suppliers: get().suppliers.map(x => x.id === id ? { ...x, ...s } : x) }); get().logAudit({ action: "update", entity: "supplier", entityId: id, summary: `Yetkazib beruvchi yangilandi` }); },
      deleteSupplier: (id) => { const prev = get().suppliers.find(x => x.id === id); set({ suppliers: get().suppliers.filter(x => x.id !== id) }); get().logAudit({ action: "delete", entity: "supplier", entityId: id, summary: `Yetkazib beruvchi o'chirildi: ${prev?.name}` }); },

      addEmployee: (e) => { set({ employees: [e, ...get().employees] }); get().logAudit({ action: "create", entity: "employee", entityId: e.id, summary: `Xodim: ${e.name} (${e.role})` }); },
      updateEmployee: (id, e) => { set({ employees: get().employees.map(x => x.id === id ? { ...x, ...e } : x) }); get().logAudit({ action: "update", entity: "employee", entityId: id, summary: `Xodim yangilandi` }); },
      deleteEmployee: (id) => { const prev = get().employees.find(x => x.id === id); set({ employees: get().employees.filter(x => x.id !== id) }); get().logAudit({ action: "delete", entity: "employee", entityId: id, summary: `Xodim o'chirildi: ${prev?.name}` }); },

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
        get().logAudit({ action: "create", entity: "sale", entityId: s.id, summary: `Sotuv: ${s.total.toLocaleString()} so'm (${s.paymentType})` });
      },
      deleteSale: (id) => {
        const s = get().sales.find(x => x.id === id);
        if (!s) return;
        const products = get().products.map(p => {
          const item = s.items.find(i => i.productId === p.id);
          return item ? { ...p, quantity: p.quantity + item.qty } : p;
        });
        const customers = get().customers.map(c => {
          if (c.id !== s.customerId) return c;
          const debtDelta = s.paymentType === "Qarz" ? s.total : 0;
          return { ...c, debt: Math.max(0, c.debt - debtDelta), totalPurchases: Math.max(0, c.totalPurchases - s.total) };
        });
        set({ sales: get().sales.filter(x => x.id !== id), products, customers });
        get().logAudit({ action: "delete", entity: "sale", entityId: id, summary: `Sotuv bekor qilindi: ${s.total.toLocaleString()} so'm` });
      },

      addExpense: (e) => { set({ expenses: [e, ...get().expenses] }); get().logAudit({ action: "create", entity: "expense", entityId: e.id, summary: `Xarajat: ${e.category} — ${e.amount.toLocaleString()} so'm` }); },
      updateExpense: (id, e) => { set({ expenses: get().expenses.map(x => x.id === id ? { ...x, ...e } : x) }); get().logAudit({ action: "update", entity: "expense", entityId: id, summary: `Xarajat yangilandi` }); },
      deleteExpense: (id) => { const prev = get().expenses.find(x => x.id === id); set({ expenses: get().expenses.filter(x => x.id !== id) }); get().logAudit({ action: "delete", entity: "expense", entityId: id, summary: `Xarajat o'chirildi: ${prev?.category}` }); },

      addIncoming: (i) => {
        const products = get().products.map(p => p.id === i.productId ? { ...p, quantity: p.quantity + i.qty } : p);
        set({ incoming: [i, ...get().incoming], products });
        const prod = products.find(p => p.id === i.productId);
        get().logAudit({ action: "create", entity: "incoming", entityId: i.id, summary: `Kirim: ${prod?.name || ""} +${i.qty} dona` });
      },
      deleteIncoming: (id) => {
        const inc = get().incoming.find(x => x.id === id);
        if (!inc) return;
        const products = get().products.map(p => p.id === inc.productId ? { ...p, quantity: Math.max(0, p.quantity - inc.qty) } : p);
        set({ incoming: get().incoming.filter(x => x.id !== id), products });
        get().logAudit({ action: "delete", entity: "incoming", entityId: id, summary: `Kirim bekor qilindi` });
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

      branches: [...DEFAULT_BRANCHES],
      addBranch: (b) => {
        const n = b.trim();
        if (!n || get().branches.includes(n)) return;
        set({ branches: [...get().branches, n] });
      },
      updateBranch: (oldName, newName) => {
        const n = newName.trim();
        if (!n) return;
        set({ branches: get().branches.map(x => x === oldName ? n : x) });
        if (get().warehouse === oldName) set({ warehouse: n });
      },
      deleteBranch: (b) => {
        if (get().branches.length <= 1) return;
        set({ branches: get().branches.filter(x => x !== b) });
        if (get().warehouse === b) set({ warehouse: get().branches[0] });
      },

      auditLog: [],
      logAudit: (e) => {
        const u = get().user;
        const entry: AuditEntry = {
          id: `aud_${Math.random().toString(36).slice(2, 9)}`,
          ts: new Date().toISOString(),
          userId: u?.id || "system",
          userName: u?.name || "Tizim",
          ...e,
        };
        const log = [entry, ...get().auditLog].slice(0, 2000);
        set({ auditLog: log });
      },
      clearAudit: () => set({ auditLog: [] }),

      resetData: () => {
        const fresh = generateMockData();
        set({ ...fresh, categories: [...DEFAULT_CATEGORIES], vehicleBrands: [...DEFAULT_VEHICLE_BRANDS], branches: [...DEFAULT_BRANCHES], auditLog: [] });
      },
    }),
    {
      name: "autoerp-pro-v1",
      version: 4,
      partialize: (s) => ({
        user: s.user, appUsers: s.appUsers, theme: s.theme, warehouse: s.warehouse, vehicleFilter: s.vehicleFilter,
        products: s.products, customers: s.customers, suppliers: s.suppliers,
        employees: s.employees, sales: s.sales, expenses: s.expenses, incoming: s.incoming,
        categories: s.categories, vehicleBrands: s.vehicleBrands,
        branches: s.branches, auditLog: s.auditLog,
      }),
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        if (!persisted.appUsers) persisted.appUsers = defaultAppUsers;
        if (!persisted.categories) persisted.categories = [...DEFAULT_CATEGORIES];
        if (!persisted.vehicleBrands) persisted.vehicleBrands = [...DEFAULT_VEHICLE_BRANDS];
        if (!persisted.branches) persisted.branches = [...DEFAULT_BRANCHES];
        if (!persisted.auditLog) persisted.auditLog = [];
        if (persisted.user && !persisted.user.permissions) {
          persisted.user.permissions = ALL_PERMISSIONS;
        }
        return persisted;
      },
    }
  )
);
