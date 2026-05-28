// Backend API manzili (ishlab chiqish jarayoni uchun port 3000 yoki o'zgarishi mumkin)
const API_BASE_URL = typeof window !== 'undefined' 
  ? (window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api')
  : 'http://localhost:3000/api';

// Umumiy fetch helper funksiyasi (tokenni avtomatik qo'shadi)
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('autoerp_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Xatosi: ${response.status}`);
  }

  return response.json();
}

// Barcha API xizmatlari
export const api = {
  // 1. Auth (Avtorizatsiya)
  auth: {
    login: async (credentials: any) => {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (typeof window !== 'undefined' && data.token) {
        localStorage.setItem('autoerp_token', data.token);
      }
      return data;
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('autoerp_token');
      }
    },
    getMe: () => apiFetch('/auth/me')
  },

  // 2. Products (Mahsulotlar)
  products: {
    getAll: async (page?: number, limit?: number) => {
      const query = (page !== undefined && limit !== undefined) ? `?page=${page}&limit=${limit}` : '';
      const res = await apiFetch(`/products${query}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        vehicle: p.vehicle_brands?.name || p.vehicle || 'Noma\'lum',
        category: p.categories?.name || p.category || 'Boshqa',
        supplierId: p.supplier_id,
        buyPrice: p.buy_price,
        sellPrice: p.sell_price,
        quantity: p.inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0,
        minQty: p.min_qty,
        description: p.description,
      }));

      if (Array.isArray(res)) {
        return mapped;
      }
      return {
        ...res,
        data: mapped
      };
    },
    getOne: (id: string) => apiFetch(`/products/${id}`),
    create: (data: any) => apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`/products/${id}`, {
      method: 'DELETE'
    })
  },

  // 3. Inventory (Inventar)
  inventory: {
    getAll: (warehouseId?: string) => {
      const url = warehouseId ? `/inventory?warehouse_id=${warehouseId}` : '/inventory';
      return apiFetch(url);
    },
    update: (productId: string, warehouseId: string, quantity: number) => 
      apiFetch(`/inventory/${productId}/${warehouseId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      }),
    transfer: (data: { fromWarehouseId: string, toWarehouseId: string, productId: string, qty: number }) => 
      apiFetch('/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getLowStock: () => apiFetch('/inventory/low-stock'),
    getOutOfStock: () => apiFetch('/inventory/out-of-stock')
  },

  // 4. Sales (Sotuvlar)
  sales: {
    getAll: async (page?: number, limit?: number, warehouseId?: string) => {
      let queryParams: string[] = [];
      if (page !== undefined) queryParams.push(`page=${page}`);
      if (limit !== undefined) queryParams.push(`limit=${limit}`);
      if (warehouseId !== undefined) queryParams.push(`warehouse_id=${warehouseId}`);
      
      const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await apiFetch(`/sales${queryStr}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      const mapped = data.map((s: any) => ({
        id: s.id,
        date: s.date,
        customerId: s.customer_id,
        customerName: s.customers?.name || 'Mijozsiz',
        sellerId: s.seller_id,
        sellerName: s.users?.name || 'Noma\'lum',
        warehouseId: s.warehouse_id,
        warehouseName: s.warehouses?.name || 'Noma\'lum',
        discount: s.discount,
        paymentType: s.payment_type === 'CASH' ? 'Naqd' : s.payment_type === 'CARD' ? 'Karta' : 'Qarz',
        total: s.total,
        profit: s.profit,
        items: s.sale_items?.map((i: any) => ({
          productId: i.product_id,
          productName: i.products?.name,
          qty: i.qty,
          price: i.price,
          buyPrice: i.buy_price
        })) || []
      }));

      if (Array.isArray(res)) {
        return mapped;
      }
      return {
        ...res,
        data: mapped
      };
    },
    getOne: (id: string) => apiFetch(`/sales/${id}`),
    create: (data: any) => apiFetch('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`/sales/${id}`, {
      method: 'DELETE'
    })
  },

  // 5. Customers (Mijozlar)
  customers: {
    getAll: async (page?: number, limit?: number) => {
      const query = (page !== undefined && limit !== undefined) ? `?page=${page}&limit=${limit}` : '';
      const res = await apiFetch(`/customers${query}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        vehicleId: c.vehicle_id,
        vehicleBrand: c.vehicle_brands?.name || '',
        totalPurchases: Number(c.total_purchases || 0),
        debt: Number(c.debt || 0),
        createdAt: c.created_at
      }));

      if (Array.isArray(res)) {
        return mapped;
      }
      return {
        ...res,
        data: mapped
      };
    },
    create: (data: any) => apiFetch('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`/customers/${id}`, {
      method: 'DELETE'
    }),
    payDebt: (id: string, amount: number, note?: string) => 
      apiFetch(`/customers/${id}/pay-debt`, {
        method: 'POST',
        body: JSON.stringify({ amount, note })
      })
  },

  // 6. Suppliers (Etkazib beruvchilar)
  suppliers: {
    getAll: async (page?: number, limit?: number) => {
      const query = (page !== undefined && limit !== undefined) ? `?page=${page}&limit=${limit}` : '';
      const res = await apiFetch(`/suppliers${query}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      const mapped = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone || '',
        address: s.address || '',
        debt: Number(s.debt || 0),
        createdAt: s.created_at
      }));

      if (Array.isArray(res)) {
        return mapped;
      }
      return {
        ...res,
        data: mapped
      };
    },
    create: (data: any) => apiFetch('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`/suppliers/${id}`, {
      method: 'DELETE'
    }),
    paySupplier: (id: string, amount: number, note?: string) => 
      apiFetch(`/suppliers/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount, note })
      })
  },

  // 7. Employees (Xodimlar)
  employees: {
    getAll: async (page?: number, limit?: number) => {
      const query = (page !== undefined && limit !== undefined) ? `?page=${page}&limit=${limit}` : '';
      const res = await apiFetch(`/employees${query}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      const mapped = data.map((e: any) => ({
        id: e.id,
        name: e.name,
        phone: e.phone || '',
        role: e.role,
        salary: Number(e.salary || 0),
        hireDate: e.hire_date,
        status: e.status,
        payments: e.salary_payments || []
      }));

      if (Array.isArray(res)) {
        return mapped;
      }
      return {
        ...res,
        data: mapped
      };
    },
    create: (data: any) => apiFetch('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`/employees/${id}`, {
      method: 'DELETE'
    }),
    paySalaryOrAdvance: (id: string, amount: number, type: 'oylik' | 'avans', note?: string) => 
      apiFetch(`/employees/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount, type, note })
      })
  },

  // 8. Expenses (Xarajatlar)
  expenses: {
    getAll: async (page?: number, limit?: number, warehouseId?: string) => {
      let queryParams: string[] = [];
      if (page !== undefined) queryParams.push(`page=${page}`);
      if (limit !== undefined) queryParams.push(`limit=${limit}`);
      if (warehouseId !== undefined) queryParams.push(`warehouse_id=${warehouseId}`);
      
      const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await apiFetch(`/expenses${queryStr}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      const mapped = data.map((e: any) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        amount: Number(e.amount || 0),
        note: e.note || '',
        warehouseId: e.warehouse_id,
        warehouseName: e.warehouses?.name || 'Noma\'lum'
      }));

      if (Array.isArray(res)) {
        return mapped;
      }
      return {
        ...res,
        data: mapped
      };
    },
    create: (data: any) => apiFetch('/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => apiFetch(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: string) => apiFetch(`/expenses/${id}`, {
      method: 'DELETE'
    })
  },

  // 9. Reports (Hisobotlar)
  reports: {
    getDashboard: (warehouseId?: string) => {
      const url = warehouseId ? `/reports/dashboard?warehouse_id=${warehouseId}` : '/reports/reports/dashboard';
      // Wait, is it reports/dashboard or reports/reports/dashboard? The index.ts had app.use('/api/reports', reportsRoutes).
      // So /reports/dashboard is correct!
      return apiFetch(warehouseId ? `/reports/dashboard?warehouse_id=${warehouseId}` : '/reports/dashboard');
    },
    getSalesSummary: (days: number = 30, warehouseId?: string) => {
      let url = `/reports/sales-summary?days=${days}`;
      if (warehouseId) url += `&warehouse_id=${warehouseId}`;
      return apiFetch(url);
    },
    getByWarehouse: () => apiFetch('/reports/by-warehouse'),
    getByBrand: () => apiFetch('/reports/by-brand'),
    getTopProducts: (limit?: number) => {
      const url = limit ? `/reports/top-products?limit=${limit}` : '/reports/top-products';
      return apiFetch(url);
    },
    getAuditLogs: async (page?: number, limit?: number) => {
      const query = (page !== undefined && limit !== undefined) ? `?page=${page}&limit=${limit}` : '';
      return apiFetch(`/reports/audit-logs${query}`);
    }
  },

  // 10. Notifications (Bildirishnomalar)
  notifications: {
    getAll: () => apiFetch('/notifications'),
    read: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
    readAll: () => apiFetch('/notifications/read-all', { method: 'PUT' })
  },

  // 11. Search (Global qidiruv)
  search: {
    query: (q: string) => apiFetch(`/search?q=${encodeURIComponent(q)}`)
  }
};
