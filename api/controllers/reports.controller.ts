import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

// Dashboard statistikasi
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouse_id } = req.query;

    // 1. Sotuvlar statistikasi
    let salesQuery = supabase.from('sales').select('total, profit, date, warehouse_id');
    if (warehouse_id) {
      salesQuery = salesQuery.eq('warehouse_id', warehouse_id);
    }
    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    let totalSales = 0;
    let totalProfit = 0;
    let monthlySales = 0;
    let monthlyProfit = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (sales) {
      for (const sale of sales) {
        const saleTotal = Number(sale.total) || 0;
        const saleProfit = Number(sale.profit) || 0;
        totalSales += saleTotal;
        totalProfit += saleProfit;

        const saleDate = new Date(sale.date);
        if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
          monthlySales += saleTotal;
          monthlyProfit += saleProfit;
        }
      }
    }

    // 2. Kam qolgan mahsulotlar (Inventory tableda quantity <= products.min_qty)
    let inventoryQuery = supabase
      .from('inventory')
      .select('quantity, products(name, min_qty)');
    if (warehouse_id) {
      inventoryQuery = inventoryQuery.eq('warehouse_id', warehouse_id);
    }
    const { data: inventory, error: invError } = await inventoryQuery;
    if (invError) throw invError;

    let lowStockCount = 0;
    if (inventory) {
      for (const item of inventory) {
        const minQty = (item.products as any)?.min_qty || 5;
        if (item.quantity <= minQty) {
          lowStockCount++;
        }
      }
    }

    // 3. Xarajatlar statistikasi
    let expensesQuery = supabase.from('expenses').select('amount, date');
    if (warehouse_id) {
      expensesQuery = expensesQuery.eq('warehouse_id', warehouse_id);
    }
    const { data: expenses, error: expError } = await expensesQuery;
    if (expError) throw expError;

    let totalExpenses = 0;
    let monthlyExpenses = 0;
    if (expenses) {
      for (const exp of expenses) {
        const amt = Number(exp.amount) || 0;
        totalExpenses += amt;

        const expDate = new Date(exp.date);
        if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
          monthlyExpenses += amt;
        }
      }
    }

    // 4. Mijozlar qarzlari (faqat umumiy do'kon uchun yoki filtrsiz)
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('debt');
    if (custError) throw custError;

    let totalCustomerDebts = 0;
    if (customers) {
      totalCustomerDebts = customers.reduce((sum, c) => sum + (Number(c.debt) || 0), 0);
    }

    // 5. Oxirgi 5 ta sotuv
    let recentSalesQuery = supabase
      .from('sales')
      .select('id, total, date, payment_type, customers(name), warehouses(name)')
      .order('date', { ascending: false })
      .limit(5);
    
    if (warehouse_id) {
      recentSalesQuery = recentSalesQuery.eq('warehouse_id', warehouse_id);
    }
    const { data: recentSales, error: recError } = await recentSalesQuery;
    if (recError) throw recError;

    res.json({
      totalSales,
      totalProfit,
      monthlySales,
      monthlyProfit,
      lowStockCount,
      totalExpenses,
      monthlyExpenses,
      totalCustomerDebts,
      recentSales
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Grafiklar uchun kunlik / oylik sotuvlar xulosasi
export const getSalesSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouse_id, days = 30 } = req.query;
    const limitDays = Number(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);

    let query = supabase
      .from('sales')
      .select('total, profit, date')
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    const { data: sales, error } = await query;
    if (error) throw error;

    // Kunlar bo'yicha guruhlash
    const summaryMap: { [key: string]: { date: string; sales: number; profit: number } } = {};

    // Dastlabki kunlarni 0 qiymat bilan to'ldiramiz
    for (let i = 0; i <= limitDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      summaryMap[dateStr] = { date: dateStr, sales: 0, profit: 0 };
    }

    if (sales) {
      for (const sale of sales) {
        const dateStr = new Date(sale.date).toISOString().split('T')[0];
        if (summaryMap[dateStr]) {
          summaryMap[dateStr].sales += Number(sale.total) || 0;
          summaryMap[dateStr].profit += Number(sale.profit) || 0;
        } else {
          summaryMap[dateStr] = {
            date: dateStr,
            sales: Number(sale.total) || 0,
            profit: Number(sale.profit) || 0
          };
        }
      }
    }

    // Array ko'rinishiga keltirib tartiblaymiz
    const result = Object.values(summaryMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Filiallar bo'yicha hisobotlar
export const getReportsByWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: warehouses, error: whError } = await supabase.from('warehouses').select('id, name');
    if (whError) throw whError;

    const { data: sales, error: salesError } = await supabase.from('sales').select('total, profit, warehouse_id');
    if (salesError) throw salesError;

    const { data: expenses, error: expError } = await supabase.from('expenses').select('amount, warehouse_id');
    if (expError) throw expError;

    const report = warehouses.map(wh => {
      const whSales = sales ? sales.filter(s => s.warehouse_id === wh.id) : [];
      const whExpenses = expenses ? expenses.filter(e => e.warehouse_id === wh.id) : [];

      const totalSales = whSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const totalProfit = whSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
      const totalExpenses = whExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      return {
        id: wh.id,
        name: wh.name,
        totalSales,
        totalProfit,
        totalExpenses,
        netProfit: totalProfit - totalExpenses
      };
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Avtomobil brendlari bo'yicha sotuv tahlili
export const getReportsByBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select('qty, price, buy_price, products(vehicle_brands(name))');
    
    if (error) throw error;

    const brandStats: { [key: string]: { name: string; qty: number; sales: number; profit: number } } = {};

    if (saleItems) {
      for (const item of saleItems) {
        const brandName = (item.products as any)?.vehicle_brands?.name || 'Noma\'lum';
        const qty = Number(item.qty) || 0;
        const totalSell = (Number(item.price) || 0) * qty;
        const totalBuy = (Number(item.buy_price) || 0) * qty;
        const profit = totalSell - totalBuy;

        if (!brandStats[brandName]) {
          brandStats[brandName] = { name: brandName, qty: 0, sales: 0, profit: 0 };
        }

        brandStats[brandName].qty += qty;
        brandStats[brandName].sales += totalSell;
        brandStats[brandName].profit += profit;
      }
    }

    const result = Object.values(brandStats).sort((a, b) => b.sales - a.sales);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Eng ko'p sotilgan mahsulotlar
export const getTopProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Number(limit);

    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select('qty, price, buy_price, products(name, sku)');
    
    if (error) throw error;

    const productStats: { [key: string]: { name: string; sku: string; qty: number; sales: number; profit: number } } = {};

    if (saleItems) {
      for (const item of saleItems) {
        const productName = (item.products as any)?.name || 'Noma\'lum mahsulot';
        const sku = (item.products as any)?.sku || '';
        const qty = Number(item.qty) || 0;
        const totalSell = (Number(item.price) || 0) * qty;
        const totalBuy = (Number(item.buy_price) || 0) * qty;
        const profit = totalSell - totalBuy;

        if (!productStats[productName]) {
          productStats[productName] = { name: productName, sku, qty: 0, sales: 0, profit: 0 };
        }

        productStats[productName].qty += qty;
        productStats[productName].sales += totalSell;
        productStats[productName].profit += profit;
      }
    }

    const result = Object.values(productStats)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limitNum);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Audit loglarini olish (tarix uchun)
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    let query = supabase
      .from('audit_logs')
      .select('*, users(name, email)', { count: 'exact' });

    if (page !== null && limit !== null) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    if (page !== null && limit !== null) {
      const total = count || 0;
      res.json({
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } else {
      res.json(data);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
