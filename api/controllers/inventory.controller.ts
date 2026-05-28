import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { updateInventorySchema } from '../utils/validation';
import { logAction } from '../utils/audit';
import { checkLowStockAndNotify } from './notifications.controller';

// Omborlardagi mavjud qoldiqlarni olish
export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouse_id } = req.query;
    
    let query = supabase
      .from('inventory')
      .select(`
        id,
        quantity,
        updated_at,
        products (id, name, sku, barcode, sell_price, min_qty, categories(name)),
        warehouses (id, name)
      `);

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Ombor qoldig'ini qo'lda yangilash (audit log va zaxira ogohlantirishlari bilan)
export const updateInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { product_id, warehouse_id, quantity } = parsed.data;

    const { data, error } = await supabase
      .from('inventory')
      .upsert({ product_id, warehouse_id, quantity }, { onConflict: 'product_id, warehouse_id' })
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'UPDATE', 'Inventory', { product_id, warehouse_id, quantity });
    }

    // Zaxirani tekshirish (background)
    checkLowStockAndNotify(product_id, warehouse_id).catch(err => 
      console.error('Inventory yangilanganda zaxira tekshirishda xato:', err.message)
    );

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
