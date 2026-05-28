import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createSupplierSchema, updateSupplierSchema, paySupplierSchema } from '../utils/validation';
import { logAction } from '../utils/audit';

// GET barcha yetkazib beruvchilar (pagination bilan)
export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' });

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

// POST yangi yetkazib beruvchi yaratish (audit log)
export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createSupplierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { name, phone, address } = parsed.data;

    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ name, phone, address }])
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'CREATE', 'Supplier', { id: data.id, name: data.name });
    }

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// PUT yetkazib beruvchini yangilash (audit log)
export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateSupplierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const updateData = parsed.data;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'UPDATE', 'Supplier', { id, updateData });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// DELETE yetkazib beruvchini o'chirish (audit log)
export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // O'chirishdan oldin ma'lumotlarni olamiz
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'DELETE', 'Supplier', { id, name: supplier?.name });
    }

    res.json({ message: 'Yetkazib beruvchi o\'chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// GET yetkazib beruvchining tovar kirimlari tarixi
export const getIncomingStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('incoming_stock')
      .select('*, products(name, sku)')
      .eq('supplier_id', id)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// POST yetkazib beruvchiga to'lov qilish (audit log)
export const paySupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = paySupplierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { amount, note } = parsed.data;

    // 1. Yetkazib beruvchiga to'lovni saqlash
    const { error: payError } = await supabase
      .from('supplier_payments')
      .insert([{ supplier_id: id, amount, note }]);

    if (payError) throw payError;

    // 2. Qarzni kamaytirish
    const { data: supData } = await supabase
      .from('suppliers')
      .select('name, debt')
      .eq('id', id)
      .single();

    if (supData) {
      const newDebt = Math.max(0, Number(supData.debt) - amount);
      const { data, error } = await supabase
        .from('suppliers')
        .update({ debt: newDebt })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;

      // Audit log yozish
      if ((req as any).user?.id) {
        await logAction((req as any).user.id, 'UPDATE', 'SupplierDebtPayment', { 
          id, 
          name: supData.name, 
          amount, 
          oldDebt: supData.debt, 
          newDebt 
        });
      }

      res.json(data);
      return;
    }

    res.status(404).json({ error: 'Yetkazib beruvchi topilmadi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
