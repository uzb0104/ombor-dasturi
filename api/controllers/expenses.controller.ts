import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createExpenseSchema, updateExpenseSchema } from '../utils/validation';
import { logAction } from '../utils/audit';

// GET barcha xarajatlar (pagination va ombor bo'yicha filter bilan)
export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouse_id } = req.query;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    let query = supabase
      .from('expenses')
      .select('*, warehouses(name)', { count: 'exact' });

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

// POST yangi xarajat yaratish (audit log)
export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { category, amount, note, warehouse_id } = parsed.data;

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ category, amount, note, warehouse_id }])
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'CREATE', 'Expense', { id: data.id, category: data.category, amount: data.amount });
    }

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// PUT xarajatni yangilash (audit log)
export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const updateData = parsed.data;

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'UPDATE', 'Expense', { id, updateData });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// DELETE xarajatni o'chirish (audit log)
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: exp } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'DELETE', 'Expense', { id, category: exp?.category, amount: exp?.amount });
    }

    res.json({ message: 'Xarajat o\'chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
