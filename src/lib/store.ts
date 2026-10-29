import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Product,
  Customer,
  Supplier,
  Employee,
  Sale,
  Expense,
  IncomingStock,
  AuditEntry,
  AppUser,
  SessionUser,
  DebtPayment,
  UsedBatteryEntry,
} from "./types";
import type { Warehouse, Role } from "./constants";
import { DEFAULT_CATEGORIES, DEFAULT_BRANCHES, ALL_PERMISSIONS, fetchCbuRate } from "./constants";
import {
  apiLogin,
  apiLogout,
  apiGetMe,
  getToken,
  productsApi,
  customersApi,
  suppliersApi,
  employeesApi,
  salesApi,
  expensesApi,
  incomingApi,
  debtPaymentsApi,
  usersApi,
  categoriesApi,
  incomingCategoriesApi,
  vehicleBrandsApi,
  branchesApi,
  auditApi,
  usedBatteriesApi,
} from "./api";
import { DEFAULT_INCOMING_CATEGORIES } from "./constants";
import { syncApi, formatApiError } from "./api-sync";
import { toast } from "sonner";

let sessionRestorePromise: Promise<void> | null = null;

type State = {
  user: SessionUser | null;
  appUsers: AppUser[];
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  addAppUser: (u: Omit<AppUser, "id">) => void;
  updateAppUser: (id: string, u: Partial<AppUser>) => void;
  deleteAppUser: (id: string) => void;
  updateProfile: (data: { name: string; email?: string }) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;

  theme: "light" | "dark";
  toggleTheme: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  warehouse: Warehouse;
  setWarehouse: (w: Warehouse) => void;
  vehicleFilter: string;
  setVehicleFilter: (v: string) => void;
  usdRate: number;
  usdRateMode: "manual" | "cbu";
  cbuRate: number | null;
  setUsdRate: (rate: number) => void;
  setUsdRateMode: (mode: "manual" | "cbu") => void;
  fetchLiveUsdRate: () => Promise<number | null>;

  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  sales: Sale[];
  expenses: Expense[];
  incoming: IncomingStock[];
  categories: string[];
  incomingCategories: string[];
  vehicleBrands: string[];
  debtPayments: DebtPayment[];
  addDebtPayment: (p: DebtPayment) => void;

  usedBatteries: UsedBatteryEntry[];
  addUsedBattery: (b: UsedBatteryEntry) => void;
  updateUsedBattery: (id: string, b: Partial<UsedBatteryEntry>) => void;
  deleteUsedBattery: (id: string) => void;

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
  updateSale: (id: string, updates: Partial<Sale>) => void;
  deleteSale: (id: string) => void;

  addExpense: (e: Expense) => void;
  updateExpense: (id: string, e: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  addIncoming: (i: IncomingStock) => void;
  updateIncoming: (id: string, updates: Partial<IncomingStock>) => void;
  deleteIncoming: (id: string) => void;
  applyIncomingToProducts: (ids: string[]) => void;

  addCategory: (c: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (c: string) => void;

  addIncomingCategory: (c: string) => void;
  updateIncomingCategory: (oldName: string, newName: string) => void;
  deleteIncomingCategory: (c: string) => void;

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
    (set, get) => {
      const resync = () => {
        void get().loadFromBackend();
      };

      return {
        user: null,
        appUsers: [],
        _loading: false,
        _initialized: false,

        // ─── AUTH: Backend JWT bilan ───
        login: async (email, password) => {
          try {
            const data = await apiLogin(email, password);
            const perms =
              data.user.role === "Admin" ? ALL_PERMISSIONS : data.user.permissions || [];
            set({ user: { ...data.user, permissions: perms } });
            get().logAudit({
              action: "login",
              entity: "session",
              summary: `${data.user.name} tizimga kirdi`,
            });
            // Login muvaffaqiyatli bo'lgandan so'ng barcha ma'lumotlarni yuklash
            await get().loadFromBackend();
            return true;
          } catch {
            return false;
          }
        },
        logout: () => {
          get().logAudit({
            action: "logout",
            entity: "session",
            summary: `${get().user?.name || ""} tizimdan chiqdi`,
          });
          apiLogout();
          set({ user: null });
        },

        // Sahifa yangilanganda sessiyani tiklash
        restoreSession: async () => {
          const token = getToken();
          if (!token) return;
          if (!sessionRestorePromise) {
            sessionRestorePromise = (async () => {
              try {
                const data = await apiGetMe();
                const perms =
                  data.user.role === "Admin" ? ALL_PERMISSIONS : data.user.permissions || [];
                set({ user: { ...data.user, permissions: perms } });
                await get().loadFromBackend();
              } catch (err: unknown) {
                const status =
                  typeof err === "object" && err !== null && "status" in err
                    ? Number((err as { status?: number }).status)
                    : undefined;
                if (status === 401 || status === 403) {
                  apiLogout();
                  set({ user: null });
                }
              }
            })();
          }
          try {
            await sessionRestorePromise;
          } finally {
            sessionRestorePromise = null;
          }
        },

        // ─── BACKENDDAN MA'LUMOTLARNI YUKLASH ───
        loadFromBackend: async () => {
          if (get()._loading) return;
          set({ _loading: true });
          try {
            const [
              products,
              customers,
              suppliers,
              employees,
              sales,
              expenses,
              incoming,
              debtPayments,
              categories,
              incomingCategories,
              vehicleBrands,
              branches,
              auditLog,
              appUsers,
              usedBatteries,
            ] = await Promise.all([
              productsApi
                .getAll()
                .then((items) => (Array.isArray(items) ? items : []))
                .catch(() => (Array.isArray(get().products) ? get().products : [])),
              customersApi.getAll().catch(() => get().customers),
              suppliersApi.getAll().catch(() => get().suppliers),
              employeesApi.getAll().catch(() => get().employees),
              salesApi.getAll().catch(() => get().sales),
              expensesApi.getAll().catch(() => get().expenses),
              incomingApi.getAll().catch(() => get().incoming),
              debtPaymentsApi.getAll().catch(() => get().debtPayments),
              categoriesApi.getAll().catch(() => get().categories),
              incomingCategoriesApi.getAll().catch(() => get().incomingCategories),
              vehicleBrandsApi.getAll().catch(() => get().vehicleBrands),
              branchesApi.getAll().catch(() => get().branches),
              auditApi.getAll().catch(() => get().auditLog),
              usersApi.getAll().catch(() => get().appUsers),
              usedBatteriesApi.getAll().catch(() => get().usedBatteries),
            ]);
            set({
              products,
              customers,
              suppliers,
              employees,
              sales,
              expenses,
              incoming,
              debtPayments,
              categories: (categories || [])
                .slice()
                .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
              incomingCategories: (Array.isArray(incomingCategories) ? incomingCategories : [])
                .slice()
                .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
              vehicleBrands: (vehicleBrands || [])
                .slice()
                .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
              branches,
              auditLog,
              appUsers,
              usedBatteries,
              _loading: false,
              _initialized: true,
            });
            void get().fetchLiveUsdRate();
          } catch (err) {
            set({ _loading: false });
            toast.error(err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi");
          }
        },

        addAppUser: (u) => {
          const id = `usr_${Math.random().toString(36).slice(2, 9)}`;
          const newUser = { ...u, id };
          set({ appUsers: [newUser, ...get().appUsers] });
          syncApi(usersApi.create(newUser), { onFail: resync });
          get().logAudit({
            action: "create",
            entity: "user",
            entityId: id,
            summary: `Yangi foydalanuvchi: ${u.name} (${u.role})`,
          });
        },
        updateAppUser: (id, u) => {
          const prev = get().appUsers.find((x) => x.id === id);
          set({ appUsers: get().appUsers.map((x) => (x.id === id ? { ...x, ...u } : x)) });
          syncApi(usersApi.update(id, u), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "user",
            entityId: id,
            summary: `Foydalanuvchi yangilandi: ${prev?.name}`,
          });
        },
        deleteAppUser: (id) => {
          const prev = get().appUsers.find((x) => x.id === id);
          set({ appUsers: get().appUsers.filter((x) => x.id !== id) });
          syncApi(usersApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "user",
            entityId: id,
            summary: `Foydalanuvchi o'chirildi: ${prev?.name}`,
          });
        },
        updateProfile: (data) => {
          const u = get().user;
          if (!u) return;
          const name = data.name;
          const email = (data.email || u.email).trim().toLowerCase();
          set({ user: { ...u, name, email } });
          set({
            appUsers: get().appUsers.map((x) => (x.id === u.id ? { ...x, name, email } : x)),
          });
          syncApi(usersApi.update(u.id, { name, email }), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "profile",
            summary: `Profil yangilandi: ${name} (${email})`,
          });
        },
        changePassword: async (currentPassword, newPassword) => {
          const u = get().user;
          if (!u) return false;
          try {
            await usersApi.update(u.id, { password: newPassword, oldPassword: currentPassword });
            get().logAudit({
              action: "update",
              entity: "security",
              summary: `Parol o'zgartirildi`,
            });
            return true;
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Parol o'zgartirilmadi");
            return false;
          }
        },

        theme: "light",
        toggleTheme: () => {
          const next = get().theme === "light" ? "dark" : "light";
          set({ theme: next });
          if (typeof document !== "undefined")
            document.documentElement.classList.toggle("dark", next === "dark");
        },
        sidebarOpen: true,
        toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
        warehouse: "Asosiy ombor",
        setWarehouse: (w) => set({ warehouse: w }),
        vehicleFilter: "all",
        setVehicleFilter: (v) => set({ vehicleFilter: v }),
        usdRate: 12835,
        usdRateMode: "manual" as "manual" | "cbu",
        cbuRate: null as number | null,
        setUsdRate: (rate: number) =>
          set({ usdRate: rate > 0 ? rate : 12835, usdRateMode: "manual" }),
        setUsdRateMode: (mode: "manual" | "cbu") => {
          if (mode === "cbu") {
            const cbu = get().cbuRate;
            if (cbu && cbu > 0) {
              set({ usdRateMode: "cbu", usdRate: cbu });
            } else {
              set({ usdRateMode: "cbu" });
              void get().fetchLiveUsdRate();
            }
          } else {
            set({ usdRateMode: "manual" });
          }
        },
        fetchLiveUsdRate: async () => {
          const liveRate = await fetchCbuRate();
          if (liveRate && liveRate > 0) {
            set((state) => ({
              cbuRate: liveRate,
              usdRate: state.usdRateMode === "cbu" ? liveRate : state.usdRate,
            }));
            return liveRate;
          }
          return null;
        },

        products: [],
        customers: [],
        suppliers: [],
        employees: [],
        sales: [],
        expenses: [],
        incoming: [],
        categories: [...DEFAULT_CATEGORIES],
        incomingCategories: [...DEFAULT_INCOMING_CATEGORIES],
        vehicleBrands: [],
        debtPayments: [],
        usedBatteries: [
          {
            id: "ub_1",
            date: "2026-09-25T10:15:00.000Z",
            type: "kirim",
            customerName: "Alijon Valiyev",
            batteryType: "60 Ah",
            weightKg: 15,
            totalAmount: 180000,
            note: "Yangi 60A akkumulyator sotib olganda topshirildi",
          },
          {
            id: "ub_2",
            date: "2026-09-26T14:30:00.000Z",
            type: "kirim",
            customerName: "Sardor Rahimov",
            batteryType: "75 Ah",
            weightKg: 18,
            totalAmount: 220000,
            note: "75Ah eski akkumulyator topshirildi",
          },
          {
            id: "ub_3",
            date: "2026-09-28T09:00:00.000Z",
            type: "chiqim",
            factoryName: "Jizzax Akkumulyator Zavodi",
            weightKg: 250,
            pricePerKg: 12500,
            totalAmount: 3125000,
            paymentMethod: "O'tkazma",
            status: "To'langan",
            note: "Zavodga 250kg lom topshirildi",
          },
        ],
        addUsedBattery: (b) => {
          set({ usedBatteries: [b, ...(get().usedBatteries || [])] });
          syncApi(usedBatteriesApi.create(b), { onFail: resync });
          get().logAudit({
            action: "create",
            entity: "used_battery",
            entityId: b.id,
            summary: `Eski akkumulyator ${b.type === "kirim" ? "qabul qilindi" : "zavodga topshirildi"}: ${b.weightKg} kg`,
          });
        },
        updateUsedBattery: (id, b) => {
          set({
            usedBatteries: (get().usedBatteries || []).map((x) =>
              x.id === id ? { ...x, ...b } : x,
            ),
          });
          syncApi(usedBatteriesApi.update(id, b), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "used_battery",
            entityId: id,
            summary: `Eski akkumulyator yozuvi yangilandi`,
          });
        },
        deleteUsedBattery: (id) => {
          set({
            usedBatteries: (get().usedBatteries || []).filter((x) => x.id !== id),
          });
          syncApi(usedBatteriesApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "used_battery",
            entityId: id,
            summary: `Eski akkumulyator yozuvi o'chirildi`,
          });
        },

        // ─── TOVARLAR (OPTIMISTIC + BACKEND) ───
        addProduct: (p) => {
          set({ products: [p, ...get().products] });
          syncApi(productsApi.create(p), {
            onFail: resync,
            onSuccess: (savedProduct: Product) => {
              set({
                products: get().products.map((product) =>
                  product.id === savedProduct.id ? savedProduct : product,
                ),
              });
            },
          });
          get().logAudit({
            action: "create",
            entity: "product",
            entityId: p.id,
            summary: `Tovar qo'shildi: ${p.name}`,
          });
        },
        updateProduct: (id, p) => {
          const prev = get().products.find((x) => x.id === id);
          set({ products: get().products.map((x) => (x.id === id ? { ...x, ...p } : x)) });
          syncApi(productsApi.update(id, p), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "product",
            entityId: id,
            summary: `Tovar yangilandi: ${prev?.name}`,
          });
        },
        deleteProduct: (id) => {
          const prev = get().products.find((x) => x.id === id);
          set({ products: get().products.filter((x) => x.id !== id) });
          syncApi(productsApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "product",
            entityId: id,
            summary: `Tovar o'chirildi: ${prev?.name}`,
          });
        },

        // ─── MIJOZLAR ───
        addCustomer: (c) => {
          set({ customers: [c, ...get().customers] });
          syncApi(customersApi.create(c), { onFail: resync });
          get().logAudit({
            action: "create",
            entity: "customer",
            entityId: c.id,
            summary: `Mijoz qo'shildi: ${c.name}`,
          });
        },
        updateCustomer: (id, c) => {
          set({ customers: get().customers.map((x) => (x.id === id ? { ...x, ...c } : x)) });
          syncApi(customersApi.update(id, c), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "customer",
            entityId: id,
            summary: `Mijoz yangilandi`,
          });
        },
        deleteCustomer: (id) => {
          const prev = get().customers.find((x) => x.id === id);
          set({ customers: get().customers.filter((x) => x.id !== id) });
          syncApi(customersApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "customer",
            entityId: id,
            summary: `Mijoz o'chirildi: ${prev?.name}`,
          });
        },

        // ─── YETKAZIB BERUVCHILAR ───
        addSupplier: (s) => {
          set({ suppliers: [s, ...get().suppliers] });
          syncApi(suppliersApi.create(s), { onFail: resync });
          get().logAudit({
            action: "create",
            entity: "supplier",
            entityId: s.id,
            summary: `Yetkazib beruvchi: ${s.name}`,
          });
        },
        updateSupplier: (id, s) => {
          set({ suppliers: get().suppliers.map((x) => (x.id === id ? { ...x, ...s } : x)) });
          syncApi(suppliersApi.update(id, s), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "supplier",
            entityId: id,
            summary: `Yetkazib beruvchi yangilandi`,
          });
        },
        deleteSupplier: (id) => {
          const prev = get().suppliers.find((x) => x.id === id);
          set({ suppliers: get().suppliers.filter((x) => x.id !== id) });
          syncApi(suppliersApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "supplier",
            entityId: id,
            summary: `Yetkazib beruvchi o'chirildi: ${prev?.name}`,
          });
        },

        // ─── XODIMLAR ───
        addEmployee: (e) => {
          set({ employees: [e, ...get().employees] });
          syncApi(employeesApi.create(e), { onFail: resync });
          get().logAudit({
            action: "create",
            entity: "employee",
            entityId: e.id,
            summary: `Xodim: ${e.name} (${e.role})`,
          });
        },
        updateEmployee: (id, e) => {
          set({ employees: get().employees.map((x) => (x.id === id ? { ...x, ...e } : x)) });
          syncApi(employeesApi.update(id, e), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "employee",
            entityId: id,
            summary: `Xodim yangilandi`,
          });
        },
        deleteEmployee: (id) => {
          const prev = get().employees.find((x) => x.id === id);
          set({ employees: get().employees.filter((x) => x.id !== id) });
          syncApi(employeesApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "employee",
            entityId: id,
            summary: `Xodim o'chirildi: ${prev?.name}`,
          });
        },

        // ─── SOTUVLAR ───
        addSale: (s) => {
          const products = get().products.map((p) => {
            const item = s.items.find((i) => i.productId === p.id);
            return item ? { ...p, quantity: Math.max(0, p.quantity - item.qty) } : p;
          });
          const customers = get().customers.map((c) => {
            if (c.id !== s.customerId) return c;
            const debtDelta = s.paymentType === "Qarz" ? Math.max(0, s.total - (s.paid || 0)) : 0;
            return { ...c, debt: c.debt + debtDelta, totalPurchases: c.totalPurchases + s.total };
          });
          set({ sales: [s, ...get().sales], products, customers });
          syncApi(salesApi.create(s), { onFail: resync });
          get().logAudit({
            action: "create",
            entity: "sale",
            entityId: s.id,
            summary: `Sotuv: ${s.total.toLocaleString()} so'm (${s.paymentType})`,
          });
        },
        updateSale: (id, updates) => {
          const oldSale = get().sales.find((x) => x.id === id);
          if (!oldSale) return;

          const newSale = { ...oldSale, ...updates };

          // 1. Tovar zaxiralarini to'g'rilash (optimistik)
          let products = get().products;
          // Eski zaxiralarni tiklash
          products = products.map((p) => {
            const oldItem = oldSale.items.find((oi) => oi.productId === p.id);
            return oldItem ? { ...p, quantity: p.quantity + oldItem.qty } : p;
          });
          // Yangi zaxiralarni chegirish
          const activeItems = newSale.items;
          products = products.map((p) => {
            const newItem = activeItems.find((ni) => ni.productId === p.id);
            return newItem ? { ...p, quantity: Math.max(0, p.quantity - newItem.qty) } : p;
          });

          // 2. Mijoz qarzini va xaridini to'g'rilash
          let customers = get().customers;
          // Eski hisoblarni bekor qilish
          if (oldSale.customerId) {
            customers = customers.map((c) => {
              if (c.id !== oldSale.customerId) return c;
              const oldDebtDelta = oldSale.paymentType === "Qarz" ? oldSale.total : 0;
              return {
                ...c,
                debt: Math.max(0, c.debt - oldDebtDelta),
                totalPurchases: Math.max(0, c.totalPurchases - oldSale.total),
              };
            });
          }
          // Yangi hisoblarni qo'shish
          if (newSale.customerId) {
            customers = customers.map((c) => {
              if (c.id !== newSale.customerId) return c;
              const newDebtDelta = newSale.paymentType === "Qarz" ? newSale.total : 0;
              return {
                ...c,
                debt: c.debt + newDebtDelta,
                totalPurchases: c.totalPurchases + newSale.total,
              };
            });
          }

          set({
            sales: get().sales.map((x) => (x.id === id ? newSale : x)),
            products,
            customers,
          });

          syncApi(salesApi.update(id, updates), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "sale",
            entityId: id,
            summary: `Sotuv yangilandi: ${newSale.total.toLocaleString()} so'm`,
          });
        },
        deleteSale: (id) => {
          const s = get().sales.find((x) => x.id === id);
          if (!s) return;
          const products = get().products.map((p) => {
            const item = s.items.find((i) => i.productId === p.id);
            return item ? { ...p, quantity: p.quantity + item.qty } : p;
          });
          const customers = get().customers.map((c) => {
            if (c.id !== s.customerId) return c;
            const debtDelta = s.paymentType === "Qarz" ? Math.max(0, s.total - (s.paid || 0)) : 0;
            return {
              ...c,
              debt: Math.max(0, c.debt - debtDelta),
              totalPurchases: Math.max(0, c.totalPurchases - s.total),
            };
          });
          set({ sales: get().sales.filter((x) => x.id !== id), products, customers });
          syncApi(salesApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "sale",
            entityId: id,
            summary: `Sotuv bekor qilindi: ${s.total.toLocaleString()} so'm`,
          });
        },

        // ─── XARAJATLAR ───
        addExpense: (e) => {
          set({ expenses: [e, ...get().expenses] });
          syncApi(expensesApi.create(e), { onFail: resync });
          get().logAudit({
            action: "create",
            entity: "expense",
            entityId: e.id,
            summary: `Xarajat: ${e.category} — ${e.amount.toLocaleString()} so'm`,
          });
        },
        updateExpense: (id, e) => {
          set({ expenses: get().expenses.map((x) => (x.id === id ? { ...x, ...e } : x)) });
          syncApi(expensesApi.update(id, e), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "expense",
            entityId: id,
            summary: `Xarajat yangilandi`,
          });
        },
        deleteExpense: (id) => {
          const prev = get().expenses.find((x) => x.id === id);
          set({ expenses: get().expenses.filter((x) => x.id !== id) });
          syncApi(expensesApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "expense",
            entityId: id,
            summary: `Xarajat o'chirildi: ${prev?.category}`,
          });
        },

        // ─── KIRIMLAR ───
        addIncoming: (i) => {
          const itemStatus = i.status || "pending";
          const fullItem: IncomingStock = { ...i, status: itemStatus };

          let products = get().products;
          // Faqat 'applied' bo'lsa darhol tovar bazasiga qo'shiladi, 'pending' bo'lsa qo'shilmay turadi
          if (itemStatus === "applied") {
            products = products.map((p) =>
              p.id === fullItem.productId ? { ...p, quantity: p.quantity + fullItem.qty } : p,
            );
          }

          set({ incoming: [fullItem, ...get().incoming], products });
          syncApi(incomingApi.create(fullItem), { onFail: resync });

          const prod = get().products.find((p) => p.id === fullItem.productId);
          get().logAudit({
            action: "create",
            entity: "incoming",
            entityId: fullItem.id,
            summary:
              itemStatus === "pending"
                ? `Kirim qoralama (kutilmoqda): ${prod?.name || ""} +${fullItem.qty} dona`
                : `Kirim: ${prod?.name || ""} +${fullItem.qty} dona`,
          });
        },
        updateIncoming: (id, updates) => {
          const oldInc = get().incoming.find((x) => x.id === id);
          if (!oldInc) return;

          const newInc = { ...oldInc, ...updates };

          let products = get().products;
          const oldIsApplied = oldInc.status !== "pending";
          const newIsApplied = newInc.status !== "pending";

          if (oldIsApplied && newIsApplied) {
            if (oldInc.productId === newInc.productId) {
              const qtyDiff = newInc.qty - oldInc.qty;
              products = products.map((p) =>
                p.id === newInc.productId
                  ? { ...p, quantity: Math.max(0, p.quantity + qtyDiff) }
                  : p,
              );
            } else {
              products = products.map((p) => {
                if (p.id === oldInc.productId)
                  return { ...p, quantity: Math.max(0, p.quantity - oldInc.qty) };
                if (p.id === newInc.productId) return { ...p, quantity: p.quantity + newInc.qty };
                return p;
              });
            }
          } else if (!oldIsApplied && newIsApplied) {
            products = products.map((p) =>
              p.id === newInc.productId ? { ...p, quantity: p.quantity + newInc.qty } : p,
            );
          } else if (oldIsApplied && !newIsApplied) {
            products = products.map((p) =>
              p.id === oldInc.productId
                ? { ...p, quantity: Math.max(0, p.quantity - oldInc.qty) }
                : p,
            );
          }

          set({
            incoming: get().incoming.map((x) => (x.id === id ? newInc : x)),
            products,
          });

          syncApi(incomingApi.update(id, updates), { onFail: resync });
          get().logAudit({
            action: "update",
            entity: "incoming",
            entityId: id,
            summary: `Kirim tahrirlandi`,
          });
        },
        deleteIncoming: (id) => {
          const inc = get().incoming.find((x) => x.id === id);
          if (!inc) return;

          let products = get().products;
          if (inc.status !== "pending") {
            products = products.map((p) =>
              p.id === inc.productId ? { ...p, quantity: Math.max(0, p.quantity - inc.qty) } : p,
            );
          }

          set({ incoming: get().incoming.filter((x) => x.id !== id), products });
          syncApi(incomingApi.delete(id), { onFail: resync });
          get().logAudit({
            action: "delete",
            entity: "incoming",
            entityId: id,
            summary: `Kirim bekor qilindi`,
          });
        },
        applyIncomingToProducts: (ids) => {
          if (!ids || ids.length === 0) return;
          const idSet = new Set(ids);
          const currentIncoming = get().incoming;
          const currentProducts = get().products;

          const toApply = currentIncoming.filter(
            (inc) => idSet.has(inc.id) && inc.status === "pending",
          );
          if (toApply.length === 0) return;

          const qtyDeltas: Record<string, number> = {};
          const priceUpdates: Record<
            string,
            { buyPrice: number; buyPriceUsd?: number; currency?: "UZS" | "USD" }
          > = {};

          toApply.forEach((inc) => {
            qtyDeltas[inc.productId] = (qtyDeltas[inc.productId] || 0) + inc.qty;
            if (inc.buyPrice > 0) {
              priceUpdates[inc.productId] = {
                buyPrice: inc.buyPrice,
                buyPriceUsd: inc.buyPriceUsd,
                currency: inc.currency,
              };
            }
          });

          const updatedProducts = currentProducts.map((p) => {
            const addQty = qtyDeltas[p.id];
            const priceInfo = priceUpdates[p.id];
            if (addQty !== undefined || priceInfo !== undefined) {
              return {
                ...p,
                quantity: (p.quantity || 0) + (addQty || 0),
                ...(priceInfo
                  ? {
                      buyPrice: priceInfo.buyPrice,
                      ...(priceInfo.buyPriceUsd !== undefined
                        ? { buyPriceUsd: priceInfo.buyPriceUsd }
                        : {}),
                      ...(priceInfo.currency ? { currency: priceInfo.currency } : {}),
                    }
                  : {}),
              };
            }
            return p;
          });

          const updatedIncoming = currentIncoming.map((inc) => {
            if (idSet.has(inc.id) && inc.status === "pending") {
              return { ...inc, status: "applied" as const };
            }
            return inc;
          });

          set({ products: updatedProducts, incoming: updatedIncoming });
          syncApi(incomingApi.applyBatch(ids), { onFail: resync });

          toApply.forEach((inc) => {
            const p = updatedProducts.find((x) => x.id === inc.productId);
            get().logAudit({
              action: "update",
              entity: "incoming",
              entityId: inc.id,
              summary: `Tovar bazasiga qo'shildi: ${p?.name || ""} (+${inc.qty} dona)`,
            });
          });
        },

        // ─── QARZ TO'LOVLARI ───
        addDebtPayment: (p) => {
          const customers = get().customers.map((c) => {
            if (p.type === "customer" && c.id === p.targetId) {
              return { ...c, debt: Math.max(0, c.debt - p.amount) };
            }
            return c;
          });
          const suppliers = get().suppliers.map((s) => {
            if (p.type === "supplier" && s.id === p.targetId) {
              return { ...s, debt: Math.max(0, s.debt - p.amount) };
            }
            return s;
          });
          set({ debtPayments: [p, ...get().debtPayments], customers, suppliers });

          // Backend'da qarz yangilanganidan keyin, frontend ma'lumotlarini ham yangilash
          debtPaymentsApi
            .create(p)
            .then(() => {
              // Customers va suppliers'ni backend'dan qayta yuklash
              Promise.all([customersApi.getAll(), suppliersApi.getAll()])
                .then(([updatedCustomers, updatedSuppliers]) => {
                  set({ customers: updatedCustomers, suppliers: updatedSuppliers });
                })
                .catch(resync);
            })
            .catch((err) => {
              toast.error(formatApiError(err));
              resync();
            });

          get().logAudit({
            action: "create",
            entity: "debt_payment",
            entityId: p.id,
            summary: `Qarz to'lovi: ${p.targetName} — ${p.amount.toLocaleString()} so'm (${p.paymentMethod})`,
          });
        },

        // ─── KATEGORIYALAR ───
        addCategory: (c) => {
          const name = c.trim();
          if (!name || get().categories.includes(name)) return;
          const next = [...get().categories, name].sort((a, b) =>
            a.localeCompare(b, "uz", { sensitivity: "base" }),
          );
          set({ categories: next });
          syncApi(categoriesApi.create(name), { onFail: resync });
        },
        updateCategory: (oldName, newName) => {
          const n = newName.trim();
          if (!n) return;
          const next = get()
            .categories.map((c) => (c === oldName ? n : c))
            .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" }));
          set({
            categories: next,
            products: get().products.map((p) =>
              p.category === oldName ? { ...p, category: n } : p,
            ),
          });
          syncApi(categoriesApi.update(oldName, n), { onFail: resync });
        },
        deleteCategory: (c) => {
          set({ categories: get().categories.filter((x) => x !== c) });
          syncApi(categoriesApi.delete(c), { onFail: resync });
        },

        // ─── KIRIM KATEGORIYALARI ───
        addIncomingCategory: (c) => {
          const name = c.trim();
          if (!name || get().incomingCategories.includes(name)) return;
          const next = [...get().incomingCategories, name].sort((a, b) =>
            a.localeCompare(b, "uz", { sensitivity: "base" }),
          );
          set({ incomingCategories: next });
          syncApi(incomingCategoriesApi.create(name), { onFail: resync });
        },
        updateIncomingCategory: (oldName, newName) => {
          const n = newName.trim();
          if (!n) return;
          const next = get()
            .incomingCategories.map((c) => (c === oldName ? n : c))
            .sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" }));
          set({ incomingCategories: next });
          syncApi(incomingCategoriesApi.update(oldName, n), { onFail: resync });
        },
        deleteIncomingCategory: (c) => {
          set({ incomingCategories: get().incomingCategories.filter((x) => x !== c) });
          syncApi(incomingCategoriesApi.delete(c), { onFail: resync });
        },

        // ─── MASHINA BRENDLARI ───
        addVehicleBrand: (b) => {
          const n = b.trim();
          if (!n || get().vehicleBrands.includes(n)) return;
          set({ vehicleBrands: [...get().vehicleBrands, n] });
          syncApi(vehicleBrandsApi.create(n), { onFail: resync });
        },
        updateVehicleBrand: (oldName, newName) => {
          const n = newName.trim();
          if (!n) return;
          set({
            vehicleBrands: get().vehicleBrands.map((b) => (b === oldName ? n : b)),
            products: get().products.map((p) => {
              const hasInVehicles = p.vehicles && p.vehicles.includes(oldName);
              const hasInVehicleStr = p.vehicle && p.vehicle.includes(oldName);
              if (!hasInVehicles && !hasInVehicleStr && p.vehicle !== oldName) return p;

              const nextVehicles = (p.vehicles || (p.vehicle ? p.vehicle.split(/,\s*/) : [])).map(
                (v) => (v === oldName ? n : v),
              );
              return {
                ...p,
                vehicles: nextVehicles,
                vehicle: nextVehicles.join(", "),
              };
            }),
            customers: get().customers.map((c) =>
              c.vehicle === oldName ? { ...c, vehicle: n } : c,
            ),
          });
          syncApi(vehicleBrandsApi.update(oldName, n), { onFail: resync });
        },
        deleteVehicleBrand: (b) => {
          set({
            vehicleBrands: get().vehicleBrands.filter((x) => x !== b),
            products: get().products.map((p) => {
              const hasInVehicles = p.vehicles && p.vehicles.includes(b);
              const hasInVehicleStr = p.vehicle && p.vehicle.includes(b);
              if (!hasInVehicles && !hasInVehicleStr) return p;

              const nextVehicles = (
                p.vehicles || (p.vehicle ? p.vehicle.split(/,\s*/) : [])
              ).filter((v) => v !== b);
              return {
                ...p,
                vehicles: nextVehicles,
                vehicle: nextVehicles.join(", "),
              };
            }),
          });
          syncApi(vehicleBrandsApi.delete(b), { onFail: resync });
        },

        // ─── FILIALLAR ───
        branches: [...DEFAULT_BRANCHES],
        addBranch: (b) => {
          const n = b.trim();
          if (!n || get().branches.includes(n)) return;
          set({ branches: [...get().branches, n] });
          syncApi(branchesApi.create(n), { onFail: resync });
        },
        updateBranch: (oldName, newName) => {
          const n = newName.trim();
          if (!n) return;
          set({ branches: get().branches.map((x) => (x === oldName ? n : x)) });
          if (get().warehouse === oldName) set({ warehouse: n });
          syncApi(branchesApi.update(oldName, n), { onFail: resync });
        },
        deleteBranch: (b) => {
          if (get().branches.length <= 1) return;
          set({ branches: get().branches.filter((x) => x !== b) });
          if (get().warehouse === b) set({ warehouse: get().branches[0] });
          syncApi(branchesApi.delete(b), { onFail: resync });
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
          syncApi(auditApi.log(entry), { silent: true });
        },
        clearAudit: () => {
          set({ auditLog: [] });
          syncApi(auditApi.clear(), { onFail: resync });
        },

        resetData: () => {
          set({
            products: [],
            customers: [],
            suppliers: [],
            employees: [],
            sales: [],
            expenses: [],
            incoming: [],
            categories: [...DEFAULT_CATEGORIES],
            vehicleBrands: [],
            branches: [...DEFAULT_BRANCHES],
            auditLog: [],
            debtPayments: [],
          });
        },
      };
    },
    {
      name: "autoerp-pro-v2",
      // Version 8: Biznes ma'lumotlari localStorage keshdan olib tashlandi.
      // Faqat UI sozlamalari va sessiya saqlanadi.
      // Barcha biznes ma'lumotlari har doim Supabase backendidan yuklanadi.
      version: 8,
      partialize: (s) => ({
        // Faqat UI sozlamalari va autentifikatsiya sessiyasi
        user: s.user,
        theme: s.theme,
        warehouse: s.warehouse,
        vehicleFilter: s.vehicleFilter,
        sidebarOpen: s.sidebarOpen,
        usdRate: s.usdRate,
        usdRateMode: s.usdRateMode,
        cbuRate: s.cbuRate,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
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
    },
  ),
);
