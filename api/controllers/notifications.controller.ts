import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { logAction } from '../utils/audit';

// GET bildirishnomalarni olish (user_id bo'yicha)
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// PUT bildirishnomani o'qilgan deb belgilash
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// PUT barcha bildirishnomalarni o'qilgan deb belgilash
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    res.json({ message: 'Barcha bildirishnomalar o\'qilgan deb belgilandi', count: data?.length || 0 });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// Zaxira kamayganini tekshirish va bildirishnoma jo'natish (background funksiya)
export const checkLowStockAndNotify = async (productId: string, warehouseId: string): Promise<void> => {
  try {
    // 1. Mahsulot va uning minimal miqdorini olamiz
    const { data: product } = await supabase
      .from('products')
      .select('name, min_qty')
      .eq('id', productId)
      .single();

    // 2. Ombordagi joriy miqdorini olamiz
    const { data: inv } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .single();

    if (product && inv) {
      const minQty = product.min_qty || 5;
      if (inv.quantity <= minQty) {
        const message = `"${product.name}" mahsuloti zaxirasi kam qoldi. Omborda joriy miqdor: ${inv.quantity} ta (Minimal miqdor: ${minQty} ta).`;

        // 3. Xuddi shu matnli o'qilmagan bildirishnoma borligini tekshiramiz
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('message', message)
          .eq('is_read', false)
          .limit(1);

        if (!existing || existing.length === 0) {
          // 4. Barcha ADMIN va WAREHOUSE_KEEPER foydalanuvchilarni olamiz
          const { data: users } = await supabase
            .from('users')
            .select('id, role')
            .or('role.eq.ADMIN,role.eq.WAREHOUSE_KEEPER');

          if (users && users.length > 0) {
            const notificationsToInsert = users.map(user => ({
              user_id: user.id,
              title: 'Zaxira Ogohlantirishi',
              message,
              is_read: false
            }));

            const { error: insErr } = await supabase
              .from('notifications')
              .insert(notificationsToInsert);

            if (insErr) {
              console.error('❌ Bildirishnoma yaratishda xato:', insErr.message);
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error('❌ checkLowStockAndNotify kutilmagan xato:', err.message);
  }
};
