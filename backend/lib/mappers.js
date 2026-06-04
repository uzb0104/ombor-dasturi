// 1. PRODUCTS
export function toDbProduct(p) {
  if (!p) return null;
  const dbObj = {};
  if (p.id !== undefined) dbObj.id = p.id;
  if (p.name !== undefined) dbObj.name = p.name;
  if (p.sku !== undefined) dbObj.sku = p.sku || null;
  if (p.barcode !== undefined) dbObj.barcode = p.barcode || null;
  if (p.vehicle !== undefined) dbObj.vehicle = p.vehicle || null;
  if (p.category !== undefined) dbObj.category = p.category || null;
  if (p.supplierId !== undefined) dbObj.supplier_id = p.supplierId || null;
  if (p.buyPrice !== undefined) dbObj.buy_price = p.buyPrice;
  if (p.sellPrice !== undefined) dbObj.sell_price = p.sellPrice;
  if (p.quantity !== undefined) dbObj.quantity = p.quantity;
  if (p.minQty !== undefined) dbObj.min_qty = p.minQty;
  if (p.image !== undefined) dbObj.image = p.image || null;
  if (p.description !== undefined) dbObj.description = p.description || null;
  if (p.attributes !== undefined) dbObj.attributes = p.attributes;
  if (p.branchStock !== undefined) dbObj.branch_stock = p.branchStock;
  return dbObj;
}

export function toFeProduct(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    vehicle: p.vehicle,
    category: p.category,
    supplierId: p.supplier_id,
    buyPrice: Number(p.buy_price || 0),
    sellPrice: Number(p.sell_price || 0),
    quantity: Number(p.quantity || 0),
    minQty: Number(p.min_qty || 0),
    image: p.image,
    description: p.description,
    attributes: p.attributes || {},
    branchStock: p.branch_stock || {},
  };
}

// 2. CUSTOMERS
export function toDbCustomer(c) {
  if (!c) return null;
  const dbObj = {};
  if (c.id !== undefined) dbObj.id = c.id;
  if (c.name !== undefined) dbObj.name = c.name;
  if (c.phone !== undefined) dbObj.phone = c.phone;
  if (c.address !== undefined) dbObj.address = c.address;
  if (c.vehicle !== undefined) dbObj.vehicle = c.vehicle || null;
  if (c.totalPurchases !== undefined) dbObj.total_purchases = c.totalPurchases;
  if (c.debt !== undefined) dbObj.debt = c.debt;
  return dbObj;
}

export function toFeCustomer(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    vehicle: c.vehicle,
    totalPurchases: Number(c.total_purchases || 0),
    debt: Number(c.debt || 0),
  };
}

// 3. EMPLOYEES
export function toDbEmployee(e) {
  if (!e) return null;
  const dbObj = {};
  if (e.id !== undefined) dbObj.id = e.id;
  if (e.name !== undefined) dbObj.name = e.name;
  if (e.phone !== undefined) dbObj.phone = e.phone;
  if (e.role !== undefined) dbObj.role = e.role;
  if (e.salary !== undefined) dbObj.salary = e.salary;
  if (e.advance !== undefined) dbObj.advance = e.advance;
  if (e.hireDate !== undefined) dbObj.hire_date = e.hireDate;
  if (e.status !== undefined) dbObj.status = e.status;
  return dbObj;
}

export function toFeEmployee(e) {
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    phone: e.phone,
    role: e.role,
    salary: Number(e.salary || 0),
    advance: Number(e.advance || 0),
    hireDate: e.hire_date,
    status: e.status,
  };
}

// 4. INCOMING
export function toDbIncoming(i) {
  if (!i) return null;
  const dbObj = {};
  if (i.id !== undefined) dbObj.id = i.id;
  if (i.date !== undefined) dbObj.date = i.date;
  if (i.supplierId !== undefined) dbObj.supplier_id = i.supplierId || null;
  if (i.productId !== undefined) dbObj.product_id = i.productId || null;
  if (i.qty !== undefined) dbObj.qty = i.qty;
  if (i.buyPrice !== undefined) dbObj.buy_price = i.buyPrice;
  if (i.invoice !== undefined) dbObj.invoice = i.invoice;
  return dbObj;
}

export function toFeIncoming(i) {
  if (!i) return null;
  return {
    id: i.id,
    date: i.date,
    supplierId: i.supplier_id,
    productId: i.product_id,
    qty: Number(i.qty || 0),
    buyPrice: Number(i.buy_price || 0),
    invoice: i.invoice,
  };
}

// 5. SALES & SALE ITEMS
export function toDbSale(s) {
  if (!s) return null;
  const dbObj = {};
  if (s.id !== undefined) dbObj.id = s.id;
  if (s.date !== undefined) dbObj.date = s.date;
  if (s.customerId !== undefined) dbObj.customer_id = s.customerId || null;
  if (s.sellerId !== undefined) dbObj.seller_id = s.sellerId || null;
  if (s.discount !== undefined) dbObj.discount = s.discount;
  if (s.paymentType !== undefined) dbObj.payment_type = s.paymentType;
  if (s.total !== undefined) dbObj.total = s.total;
  if (s.profit !== undefined) dbObj.profit = s.profit;
  if (s.paid !== undefined) dbObj.paid = s.paid;
  return dbObj;
}

export function toFeSale(s, items = []) {
  if (!s) return null;
  return {
    id: s.id,
    date: s.date,
    customerId: s.customer_id,
    sellerId: s.seller_id,
    discount: Number(s.discount || 0),
    paymentType: s.payment_type,
    total: Number(s.total || 0),
    profit: Number(s.profit || 0),
    paid: Number(s.paid || 0),
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name || null,
      qty: Number(i.qty || 0),
      price: Number(i.price || 0),
      buyPrice: Number(i.buy_price || 0),
    })),
  };
}

// 6. DEBT PAYMENTS
export function toDbDebtPayment(p) {
  if (!p) return null;
  const dbObj = {};
  if (p.id !== undefined) dbObj.id = p.id;
  if (p.date !== undefined) dbObj.date = p.date;
  if (p.type !== undefined) dbObj.type = p.type;
  if (p.targetId !== undefined) dbObj.target_id = p.targetId;
  if (p.targetName !== undefined) dbObj.target_name = p.targetName;
  if (p.amount !== undefined) dbObj.amount = p.amount;
  if (p.paymentMethod !== undefined) dbObj.payment_method = p.paymentMethod;
  if (p.note !== undefined) dbObj.note = p.note;
  return dbObj;
}

export function toFeDebtPayment(p) {
  if (!p) return null;
  return {
    id: p.id,
    date: p.date,
    type: p.type,
    targetId: p.target_id,
    targetName: p.target_name,
    amount: Number(p.amount || 0),
    paymentMethod: p.payment_method,
    note: p.note,
  };
}

// 7. AUDIT LOGS
export function toDbAuditLog(l) {
  if (!l) return null;
  const dbObj = {};
  if (l.id !== undefined) dbObj.id = l.id;
  if (l.ts !== undefined) dbObj.ts = l.ts;
  if (l.userId !== undefined) dbObj.user_id = l.userId;
  if (l.userName !== undefined) dbObj.user_name = l.userName;
  if (l.action !== undefined) dbObj.action = l.action;
  if (l.entity !== undefined) dbObj.entity = l.entity;
  if (l.entityId !== undefined) dbObj.entity_id = l.entityId;
  if (l.summary !== undefined) dbObj.summary = l.summary;
  return dbObj;
}

export function toFeAuditLog(l) {
  if (!l) return null;
  return {
    id: l.id,
    ts: l.ts,
    userId: l.user_id,
    userName: l.user_name,
    action: l.action,
    entity: l.entity,
    entityId: l.entity_id,
    summary: l.summary,
  };
}

// 8. PRICE HISTORY
export function toFePriceHistory(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    productId: row.product_id,
    productName: row.product_name,
    field: row.field,
    oldValue: row.old_value != null ? Number(row.old_value) : null,
    newValue: Number(row.new_value || 0),
    changedById: row.changed_by_id,
    changedByName: row.changed_by_name,
    createdAt: row.created_at,
  };
}
