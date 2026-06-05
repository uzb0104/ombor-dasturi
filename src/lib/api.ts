// ─────────────── BACKEND API CLIENT ───────────────
// Barcha REST API so'rovlarini markazlashtirgan yordamchi modul.
// JWT tokenni localStorage-da saqlaydi va har bir so'rovga Authorization header qo'shadi.

import type {
  Product,
  Customer,
  Supplier,
  Employee,
  Sale,
  Expense,
  IncomingStock,
  AppUser,
  SessionUser,
  DebtPayment,
  PriceHistoryEntry,
  AuditEntry,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

// ─── Token boshqaruvi ───
export function getToken(): string | null {
  return localStorage.getItem("autoerp_token");
}

export function setToken(token: string): void {
  localStorage.setItem("autoerp_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("autoerp_token");
}

// ─── Umumiy fetch yordamchisi ───
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── AUTH ───
export async function apiLogin(email: string, password: string) {
  const data = await request<{ token: string; user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function apiGetMe() {
  return request<{ user: SessionUser }>("/api/auth/me");
}

export function apiLogout() {
  removeToken();
}

// ─── CRUD yordamchi generator ───
function createCrudApi<T>(resource: string) {
  return {
    getAll: () => request<T[]>(`/api/${resource}`),
    create: (item: Partial<T>) =>
      request<T>(`/api/${resource}`, {
        method: "POST",
        body: JSON.stringify(item),
      }),
    update: (id: string, updates: Partial<T>) =>
      request<T>(`/api/${resource}/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/${resource}/${id}`, {
        method: "DELETE",
      }),
  };
}

// ─── RESURS API-LARI ───
export const productsApi = {
  ...createCrudApi<Product>("products"),
  importBulk: (items: unknown[]) =>
    request<{ created: number; failed: number; errors: { name?: string; error: string }[] }>(
      "/api/products/import",
      { method: "POST", body: JSON.stringify({ items }) },
    ),
  priceHistory: (productId: string) =>
    request<PriceHistoryEntry[]>(`/api/products/${productId}/price-history`),
};

export const priceHistoryApi = {
  getAll: (productId?: string) =>
    request<PriceHistoryEntry[]>(
      `/api/products/price-history${productId ? `?productId=${productId}` : ""}`,
    ),
};

export const customersApi = createCrudApi<Customer>("customers");
export const suppliersApi = createCrudApi<Supplier>("suppliers");
export const employeesApi = createCrudApi<Employee>("employees");
export const expensesApi = createCrudApi<Expense>("expenses");

export const salesApi = {
  getAll: () => request<Sale[]>("/api/sales"),
  create: (sale: Omit<Sale, "id">) =>
    request<Sale>("/api/sales", {
      method: "POST",
      body: JSON.stringify(sale),
    }),
  update: (id: string, updates: Partial<Sale>) =>
    request<Sale>(`/api/sales/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/sales/${id}`, {
      method: "DELETE",
    }),
};

export const incomingApi = {
  getAll: () => request<IncomingStock[]>("/api/incoming"),
  create: (item: Omit<IncomingStock, "id">) =>
    request<IncomingStock>("/api/incoming", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  update: (id: string, updates: Partial<IncomingStock>) =>
    request<IncomingStock>(`/api/incoming/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/incoming/${id}`, {
      method: "DELETE",
    }),
};

export const debtPaymentsApi = {
  getAll: () => request<DebtPayment[]>("/api/debt-payments"),
  create: (payment: Omit<DebtPayment, "id">) =>
    request<DebtPayment>("/api/debt-payments", {
      method: "POST",
      body: JSON.stringify(payment),
    }),
};

export const usersApi = {
  getAll: () => request<AppUser[]>("/api/users"),
  create: (user: Omit<AppUser, "id">) =>
    request<AppUser>("/api/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),
  update: (id: string, updates: Partial<AppUser>) =>
    request<AppUser>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/users/${id}`, {
      method: "DELETE",
    }),
};

export const categoriesApi = {
  getAll: () => request<string[]>("/api/categories"),
  create: (name: string) =>
    request<{ name: string }>("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (oldName: string, newName: string) =>
    request<{ name: string }>(`/api/categories/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    }),
  delete: (name: string) =>
    request<{ success: boolean }>(`/api/categories/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
};

export const vehicleBrandsApi = {
  getAll: () => request<string[]>("/api/vehicle-brands"),
  create: (name: string) =>
    request<{ name: string }>("/api/vehicle-brands", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (oldName: string, newName: string) =>
    request<{ name: string }>(`/api/vehicle-brands/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    }),
  delete: (name: string) =>
    request<{ success: boolean }>(`/api/vehicle-brands/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
};

export const branchesApi = {
  getAll: () => request<string[]>("/api/branches"),
  create: (name: string) =>
    request<{ name: string }>("/api/branches", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (oldName: string, newName: string) =>
    request<{ name: string }>(`/api/branches/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    }),
  delete: (name: string) =>
    request<{ success: boolean }>(`/api/branches/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
};

export const auditApi = {
  getAll: () => request<AuditEntry[]>("/api/audit-logs"),
  log: (entry: Omit<AuditEntry, "id" | "ts" | "userId" | "userName">) =>
    request<AuditEntry>("/api/audit-logs", {
      method: "POST",
      body: JSON.stringify(entry),
    }),
  clear: () =>
    request<{ success: boolean }>("/api/audit-logs", {
      method: "DELETE",
    }),
};
