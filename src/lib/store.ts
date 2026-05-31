import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, Customer, Supplier, Employee, Sale, Expense, IncomingStock } from "./mock-data";
import type { Warehouse, Role } from "./constants";
import { DEFAULT_CATEGORIES, DEFAULT_VEHICLE_BRANDS, DEFAULT_BRANCHES, ALL_PERMISSIONS } from "./constants";
import {
  apiLogin, apiLogout, apiGetMe, getToken,
  productsApi, customersApi, suppliersApi, employeesApi,
  salesApi, expensesApi, incomingApi, debtPaymentsApi,
  usersApi, categoriesApi, vehicleBrandsApi, branchesApi, auditApi,
} from "./api";

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

export type DebtPayment = {
  id: string;
  date: string;
  type: "customer" | "supplier";
  targetId: string;
  targetName: string;
  amount: number;
  paymentMethod: "Naqd" | "Karta";
  note?: string;
};

type State = {
  user: SessionUser | null;
  appUsers: AppUser[];
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  addAppUser: (u: Omit<AppUser, "id">) => void;
  updateAppUser: (id: string, u: Partial<AppUser>) => void;
  deleteAppUser: (id: string) => void;
  updateProfile: (data: { name: string }) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;

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
  debtPayments: DebtPayment[];
  addDebtPayment: (p: DebtPayment) => void;

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

  // Backend ma'lumotlarini yuklash
  _loading: boolean;
  _initialized: boolean;
  loadFromBackend: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      appUsers: [],
      _loading: false,
      _initialized: false,

      // ─── AUTH: Backend JWT bilan ───
      login: async (email, password) => {
        try {
          const data = await apiLogin(email, password);
          const perms = data.user.role === "Admin" ? ALL_PERMISSIONS : (data.user.permissions || []);
          set({ user: { ...data.user, permissions: perms } });
          get().logAudit({ action: "login", entity: "session", summary: `${data.user.name} tizimga kirdi` });
          // Login muvaffaqiyatli bo'lgandan so'ng barcha ma'lumotlarni yuklash
          await get().loadFromBackend();
          return true;
        } catch {
          return false;
        }
      },
      logout: () => {
        get().logAudit({ action: "logout", entity: "session", summary: `${get().user?.name || ""} tizimdan chiqdi` });
        apiLogout();
        set({ user: null });
      },

      // Sahifa yangilanganda sessiyani tiklash
      restoreSession: async () => {
        const token = getToken();
        if (!token) return;
        try {
          const data = await apiGetMe();
          const perms = data.user.role === "Admin" ? ALL_PERMISSIONS : (data.user.permissions || []);
          set({ user: { ...data.user, permissions: perms } });
          await get().loadFromBackend();
        } catch {
          // Token yaroqsiz — tozalaymiz
          apiLogout();
          set({ user: null });
        }
      },

      // ─── BACKENDDAN MA'LUMOTLARNI YUKLASH ───
      loadFromBackend: async () => {
        if (get()._loading) return;
        set({ _loading: true });
        try {
          const [
            products, customers, suppliers, employees,
            sales, expenses, incoming, debtPayments,
            categories, vehicleBrands, branches, auditLog,
          ] = await Promise.all([
            productsApi.getAll().catch(() => get().products),
            customersApi.getAll().catch(() => get().customers),
            suppliersApi.getAll().catch(() => get().suppliers),
            employeesApi.getAll().catch(() => get().employees),
            salesApi.getAll().catch(() => get().sales),
            expensesApi.getAll().catch(() => get().expenses),
            incomingApi.getAll().catch(() => get().incoming),
            debtPaymentsApi.getAll().catch(() => get().debtPayments),
            categoriesApi.getAll().catch(() => get().categories),
            vehicleBrandsApi.getAll().catch(() => get().vehicleBrands),
            branchesApi.getAll().catch(() => get().branches),
            auditApi.getAll().catch(() => get().auditLog),
          ]);
          set({
            products, customers, suppliers, employees,
            sales, expenses, incoming, debtPayments,
            categories, vehicleBrands, branches, auditLog,
            _loading: false, _initialized: true,
          });
        } catch {
          set({ _loading: false });
        }
      },

      addAppUser: (u) => {
        const id = `usr_${Math.random().toString(36).slice(2, 9)}`;
        const newUser = { ...u, id };
        set({ appUsers: [newUser, ...get().appUsers] });
        usersApi.create(newUser).catch(() => {});
        get().logAudit({ action: "create", entity: "user", entityId: id, summary: `Yangi foydalanuvchi: ${u.name} (${u.role})` });
      },
      updateAppUser: (id, u) => {
        const prev = get().appUsers.find(x => x.id === id);
        set({ appUsers: get().appUsers.map(x => x.id === id ? { ...x, ...u } : x) });
        usersApi.update(id, u).catch(() => {});
        get().logAudit({ action: "update", entity: "user", entityId: id, summary: `Foydalanuvchi yangilandi: ${prev?.name}` });
      },
      deleteAppUser: (id) => {
        const prev = get().appUsers.find(x => x.id === id);
        set({ appUsers: get().appUsers.filter(x => x.id !== id) });
        usersApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "user", entityId: id, summary: `Foydalanuvchi o'chirildi: ${prev?.name}` });
      },
      updateProfile: (data) => {
        const u = get().user;
        if (!u) return;
        set({ user: { ...u, name: data.name } });
        set({ appUsers: get().appUsers.map(x => x.id === u.id ? { ...x, name: data.name } : x) });
        usersApi.update(u.id, { name: data.name }).catch(() => {});
        get().logAudit({ action: "update", entity: "profile", summary: `Profil yangilandi: ${data.name}` });
      },
      changePassword: async (currentPassword, newPassword) => {
        const u = get().user;
        if (!u) return false;
        try {
          await usersApi.update(u.id, { password: newPassword });
          get().logAudit({ action: "update", entity: "security", summary: `Parol o'zgartirildi` });
          return true;
        } catch {
          return false;
        }
      },

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
      debtPayments: [],

      // ─── TOVARLAR (OPTIMISTIC + BACKEND) ───
      addProduct: (p) => {
        set({ products: [p, ...get().products] });
        productsApi.create(p).catch(() => {});
        get().logAudit({ action: "create", entity: "product", entityId: p.id, summary: `Tovar qo'shildi: ${p.name}` });
      },
      updateProduct: (id, p) => {
        const prev = get().products.find(x => x.id === id);
        set({ products: get().products.map(x => x.id === id ? { ...x, ...p } : x) });
        productsApi.update(id, p).catch(() => {});
        get().logAudit({ action: "update", entity: "product", entityId: id, summary: `Tovar yangilandi: ${prev?.name}` });
      },
      deleteProduct: (id) => {
        const prev = get().products.find(x => x.id === id);
        set({ products: get().products.filter(x => x.id !== id) });
        productsApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "product", entityId: id, summary: `Tovar o'chirildi: ${prev?.name}` });
      },

      // ─── MIJOZLAR ───
      addCustomer: (c) => {
        set({ customers: [c, ...get().customers] });
        customersApi.create(c).catch(() => {});
        get().logAudit({ action: "create", entity: "customer", entityId: c.id, summary: `Mijoz qo'shildi: ${c.name}` });
      },
      updateCustomer: (id, c) => {
        set({ customers: get().customers.map(x => x.id === id ? { ...x, ...c } : x) });
        customersApi.update(id, c).catch(() => {});
        get().logAudit({ action: "update", entity: "customer", entityId: id, summary: `Mijoz yangilandi` });
      },
      deleteCustomer: (id) => {
        const prev = get().customers.find(x => x.id === id);
        set({ customers: get().customers.filter(x => x.id !== id) });
        customersApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "customer", entityId: id, summary: `Mijoz o'chirildi: ${prev?.name}` });
      },

      // ─── YETKAZIB BERUVCHILAR ───
      addSupplier: (s) => {
        set({ suppliers: [s, ...get().suppliers] });
        suppliersApi.create(s).catch(() => {});
        get().logAudit({ action: "create", entity: "supplier", entityId: s.id, summary: `Yetkazib beruvchi: ${s.name}` });
      },
      updateSupplier: (id, s) => {
        set({ suppliers: get().suppliers.map(x => x.id === id ? { ...x, ...s } : x) });
        suppliersApi.update(id, s).catch(() => {});
        get().logAudit({ action: "update", entity: "supplier", entityId: id, summary: `Yetkazib beruvchi yangilandi` });
      },
      deleteSupplier: (id) => {
        const prev = get().suppliers.find(x => x.id === id);
        set({ suppliers: get().suppliers.filter(x => x.id !== id) });
        suppliersApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "supplier", entityId: id, summary: `Yetkazib beruvchi o'chirildi: ${prev?.name}` });
      },

      // ─── XODIMLAR ───
      addEmployee: (e) => {
        set({ employees: [e, ...get().employees] });
        employeesApi.create(e).catch(() => {});
        get().logAudit({ action: "create", entity: "employee", entityId: e.id, summary: `Xodim: ${e.name} (${e.role})` });
      },
      updateEmployee: (id, e) => {
        set({ employees: get().employees.map(x => x.id === id ? { ...x, ...e } : x) });
        employeesApi.update(id, e).catch(() => {});
        get().logAudit({ action: "update", entity: "employee", entityId: id, summary: `Xodim yangilandi` });
      },
      deleteEmployee: (id) => {
        const prev = get().employees.find(x => x.id === id);
        set({ employees: get().employees.filter(x => x.id !== id) });
        employeesApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "employee", entityId: id, summary: `Xodim o'chirildi: ${prev?.name}` });
      },

      // ─── SOTUVLAR ───
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
        salesApi.create(s).catch(() => {});
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
        salesApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "sale", entityId: id, summary: `Sotuv bekor qilindi: ${s.total.toLocaleString()} so'm` });
      },

      // ─── XARAJATLAR ───
      addExpense: (e) => {
        set({ expenses: [e, ...get().expenses] });
        expensesApi.create(e).catch(() => {});
        get().logAudit({ action: "create", entity: "expense", entityId: e.id, summary: `Xarajat: ${e.category} — ${e.amount.toLocaleString()} so'm` });
      },
      updateExpense: (id, e) => {
        set({ expenses: get().expenses.map(x => x.id === id ? { ...x, ...e } : x) });
        expensesApi.update(id, e).catch(() => {});
        get().logAudit({ action: "update", entity: "expense", entityId: id, summary: `Xarajat yangilandi` });
      },
      deleteExpense: (id) => {
        const prev = get().expenses.find(x => x.id === id);
        set({ expenses: get().expenses.filter(x => x.id !== id) });
        expensesApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "expense", entityId: id, summary: `Xarajat o'chirildi: ${prev?.category}` });
      },

      // ─── KIRIMLAR ───
      addIncoming: (i) => {
        const products = get().products.map(p => p.id === i.productId ? { ...p, quantity: p.quantity + i.qty } : p);
        set({ incoming: [i, ...get().incoming], products });
        incomingApi.create(i).catch(() => {});
        const prod = products.find(p => p.id === i.productId);
        get().logAudit({ action: "create", entity: "incoming", entityId: i.id, summary: `Kirim: ${prod?.name || ""} +${i.qty} dona` });
      },
      deleteIncoming: (id) => {
        const inc = get().incoming.find(x => x.id === id);
        if (!inc) return;
        const products = get().products.map(p => p.id === inc.productId ? { ...p, quantity: Math.max(0, p.quantity - inc.qty) } : p);
        set({ incoming: get().incoming.filter(x => x.id !== id), products });
        incomingApi.delete(id).catch(() => {});
        get().logAudit({ action: "delete", entity: "incoming", entityId: id, summary: `Kirim bekor qilindi` });
      },

      // ─── QARZ TO'LOVLARI ───
      addDebtPayment: (p) => {
        const customers = get().customers.map(c => {
          if (p.type === "customer" && c.id === p.targetId) {
            return { ...c, debt: Math.max(0, c.debt - p.amount) };
          }
          return c;
        });
        const suppliers = get().suppliers.map(s => {
          if (p.type === "supplier" && s.id === p.targetId) {
            return { ...s, debt: Math.max(0, s.debt - p.amount) };
          }
          return s;
        });
        set({ debtPayments: [p, ...get().debtPayments], customers, suppliers });
        debtPaymentsApi.create(p).catch(() => {});
        get().logAudit({
          action: "create",
          entity: "debt_payment",
          entityId: p.id,
          summary: `Qarz to'lovi: ${p.targetName} — ${p.amount.toLocaleString()} so'm (${p.paymentMethod})`
        });
      },

      // ─── KATEGORIYALAR ───
      addCategory: (c) => {
        const name = c.trim();
        if (!name || get().categories.includes(name)) return;
        set({ categories: [...get().categories, name] });
        categoriesApi.create(name).catch(() => {});
      },
      updateCategory: (oldName, newName) => {
        const n = newName.trim();
        if (!n) return;
        set({
          categories: get().categories.map(c => c === oldName ? n : c),
          products: get().products.map(p => p.category === oldName ? { ...p, category: n } : p),
        });
        categoriesApi.update(oldName, n).catch(() => {});
      },
      deleteCategory: (c) => {
        set({ categories: get().categories.filter(x => x !== c) });
        categoriesApi.delete(c).catch(() => {});
      },

      // ─── MASHINA BRENDLARI ───
      addVehicleBrand: (b) => {
        const n = b.trim();
        if (!n || get().vehicleBrands.includes(n)) return;
        set({ vehicleBrands: [...get().vehicleBrands, n] });
        vehicleBrandsApi.create(n).catch(() => {});
      },
      updateVehicleBrand: (oldName, newName) => {
        const n = newName.trim();
        if (!n) return;
        set({
          vehicleBrands: get().vehicleBrands.map(b => b === oldName ? n : b),
          products: get().products.map(p => p.vehicle === oldName ? { ...p, vehicle: n } : p),
          customers: get().customers.map(c => c.vehicle === oldName ? { ...c, vehicle: n } : c),
        });
        vehicleBrandsApi.update(oldName, n).catch(() => {});
      },
      deleteVehicleBrand: (b) => {
        set({ vehicleBrands: get().vehicleBrands.filter(x => x !== b) });
        vehicleBrandsApi.delete(b).catch(() => {});
      },

      // ─── FILIALLAR ───
      branches: [...DEFAULT_BRANCHES],
      addBranch: (b) => {
        const n = b.trim();
        if (!n || get().branches.includes(n)) return;
        set({ branches: [...get().branches, n] });
        branchesApi.create(n).catch(() => {});
      },
      updateBranch: (oldName, newName) => {
        const n = newName.trim();
        if (!n) return;
        set({ branches: get().branches.map(x => x === oldName ? n : x) });
        if (get().warehouse === oldName) set({ warehouse: n });
        branchesApi.update(oldName, n).catch(() => {});
      },
      deleteBranch: (b) => {
        if (get().branches.length <= 1) return;
        set({ branches: get().branches.filter(x => x !== b) });
        if (get().warehouse === b) set({ warehouse: get().branches[0] });
        branchesApi.delete(b).catch(() => {});
      },

      // ─── AUDIT LOG ───
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
        // Backendga ham yozamiz (fire-and-forget)
        auditApi.log(entry).catch(() => {});
      },
      clearAudit: () => {
        set({ auditLog: [] });
        auditApi.clear().catch(() => {});
      },

      resetData: () => {
        set({
          products: [], customers: [], suppliers: [], employees: [],
          sales: [], expenses: [], incoming: [],
          categories: [...DEFAULT_CATEGORIES],
          vehicleBrands: [...DEFAULT_VEHICLE_BRANDS],
          branches: [...DEFAULT_BRANCHES],
          auditLog: [], debtPayments: []
        });
      },
    }),
    {
      name: "autoerp-pro-v2",
      version: 6,
      partialize: (s) => ({
        user: s.user, theme: s.theme, warehouse: s.warehouse, vehicleFilter: s.vehicleFilter,
        sidebarOpen: s.sidebarOpen,
        // Ma'lumotlar backenddan yuklanadi, faqat kesh sifatida saqlaymiz
        products: s.products, customers: s.customers, suppliers: s.suppliers,
        employees: s.employees, sales: s.sales, expenses: s.expenses, incoming: s.incoming,
        categories: s.categories, vehicleBrands: s.vehicleBrands,
        branches: s.branches, auditLog: s.auditLog,
        debtPayments: s.debtPayments,
      }),
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        if (!persisted.categories) persisted.categories = [...DEFAULT_CATEGORIES];
        if (!persisted.vehicleBrands) persisted.vehicleBrands = [...DEFAULT_VEHICLE_BRANDS];
        if (!persisted.branches) persisted.branches = [...DEFAULT_BRANCHES];
        if (!persisted.auditLog) persisted.auditLog = [];
        if (!persisted.debtPayments) persisted.debtPayments = [];
        if (persisted.user) {
          if (!persisted.user.permissions || persisted.user.permissions.length === 0) {
            persisted.user.permissions = ALL_PERMISSIONS;
          }
          if (persisted.user.role === "Admin") {
            persisted.user.permissions = ALL_PERMISSIONS;
          }
        }
        return persisted;
      },
    }
  )
);
