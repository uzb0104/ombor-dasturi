import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { z } from 'zod';
import { logAction } from '../utils/audit';
import { checkLowStockAndNotify } from './notifications.controller';

// Zod validatsiya schemalari
const saleItemSchema = z.object({
  product_id: z.string().min(1, 'Mahsulot ID majburiy'),
  qty: z.number().int().positive('Miqdor musbat bo\'lishi kerak'),
  price: z.number().positive('Narx musbat bo\'lishi kerak'),
  buy_price: z.number().nonnegative('Olish narxi 0 dan kam bo\'lishi mumkin emas'),
});

const createSaleSchema = z.object({
  customer_id: z.string().nullable().optional(),
  warehouse_id: z.string().min(1, 'Ombor tanlanishi shart'),
  discount: z.number().nonnegative().default(0),
  payment_type: z.enum(['CASH', 'CARD', 'DEBT'], { 
    errorMap: () => ({ message: "To'lov turi CASH, CARD yoki DEBT bo'lishi kerak" }) 
  }),
  note: z.string().nullable().optional(),
  items: z.array(saleItemSchema).min(1, 'Kamida 1 ta mahsulot bo\'lishi kerak'),
});

// Barcha sotuvlarni olish - Pagination qo'shildi
export const getSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouse_id } = req.query;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    let query = supabase
      .from('sales')
      .select(`
        *,
        users (name),
        customers (name, phone),
        warehouses (name),
        sale_items (
          id, qty, price, buy_price,
          products (name, sku, vehicle_brands(name))
        )
      `, { count: 'exact' });

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    if (page !== null && limit !== null) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order('date', { ascending: false });

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

// Yangi sotuv yaratish (ATOMIC — Supabase RPC orqali) - Audit log qo'shildi
export const createSale = async (req: any, res: Response): Promise<void> => {
  try {
    // 1. Input validatsiya
    const parsed = createSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ 
        error: 'Validatsiya xatosi', 
        details: parsed.error.errors.map(e => e.message) 
      });
      return;
    }

    const { customer_id, warehouse_id, discount, payment_type, note, items } = parsed.data;
    const seller_id = req.user?.id;

    if (!seller_id) {
      res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
      return;
    }

    // 2. Atomic tranzaksiya — Supabase RPC
    const { data, error } = await supabase.rpc('create_sale_atomic', {
      p_customer_id: customer_id || null,
      p_seller_id: seller_id,
      p_warehouse_id: warehouse_id,
      p_discount: discount,
      p_payment_type: payment_type,
      p_note: note || null,
      p_items: items,
    });

    if (error) {
      if (error.message.includes('Yetarli zaxira')) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error.message.includes('topilmadi')) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }

    // Audit log yozish
    if (req.user?.id) {
      await logAction(req.user.id, 'CREATE', 'Sale', { 
        id: data.id, 
        total: data.total,
        payment_type,
        customer_id
      });
    }

    // Zaxira kamayganini tekshirish (background)
    if (items && items.length > 0) {
      for (const item of items) {
        checkLowStockAndNotify(item.product_id, warehouse_id).catch(err => 
          console.error(`Zaxira tekshirishda xato (${item.product_id}):`, err)
        );
      }
    }

    res.status(201).json(data);
  } catch (err: any) {
    console.error('❌ createSale xatosi:', err);
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Sotuvni o'chirish - Zaxirani tiklash, qarzlarni kamaytirish va audit log
export const deleteSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Sotuv ma'lumotlarini olish
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (saleErr) throw saleErr;
    if (!sale) {
      res.status(404).json({ error: 'Sotuv topilmadi' });
      return;
    }

    // 2. Ombordagi mahsulotlar miqdorini qayta tiklash
    if (sale.sale_items && sale.sale_items.length > 0) {
      for (const item of sale.sale_items) {
        const { data: inv } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('warehouse_id', sale.warehouse_id)
          .maybeSingle();

        if (inv) {
          await supabase
            .from('inventory')
            .update({ quantity: inv.quantity + item.qty })
            .eq('product_id', item.product_id)
            .eq('warehouse_id', sale.warehouse_id);
        } else {
          await supabase
            .from('inventory')
            .insert([{
              product_id: item.product_id,
              warehouse_id: sale.warehouse_id,
              quantity: item.qty
            }]);
        }
      }
    }

    // 3. Mijoz qarzini va xaridlarini kamaytirish
    if (sale.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('debt, total_purchases')
        .eq('id', sale.customer_id)
        .maybeSingle();

      if (cust) {
        let newDebt = cust.debt;
        if (sale.payment_type === 'DEBT') {
          newDebt = Math.max(0, cust.debt - sale.total);
        }
        const newPurchases = Math.max(0, cust.total_purchases - sale.total);

        await supabase
          .from('customers')
          .update({
            debt: newDebt,
            total_purchases: newPurchases
          })
          .eq('id', sale.customer_id);
      }
    }

    // 4. Sotuvni o'chirish (sale_items cascade delete bo'ladi)
    const { error: delErr } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'DELETE', 'Sale', { 
        id, 
        total: sale.total,
        customer_id: sale.customer_id
      });
    }

    res.json({ message: 'Sotuv o\'chirildi va zaxira qayta tiklandi' });
  } catch (err: any) {
    console.error('❌ deleteSale xatosi:', err);
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
