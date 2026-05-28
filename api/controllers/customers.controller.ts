import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createCustomerSchema, updateCustomerSchema, payDebtSchema } from '../utils/validation';
import { logAction } from '../utils/audit';

// GET barcha mijozlar (pagination bilan)
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    let query = supabase
      .from('customers')
      .select('*, vehicle_brands(name)', { count: 'exact' });

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

// POST yangi mijoz yaratish (audit log bilan)
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { name, phone, address, vehicle_id } = parsed.data;

    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, phone, address, vehicle_id }])
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'CREATE', 'Customer', { id: data.id, name: data.name });
    }

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// PUT mijozni tahrirlash (audit log bilan)
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const updateData = parsed.data;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'UPDATE', 'Customer', { id, updateData });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// DELETE mijozni o'chirish (audit log bilan)
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // O'chirishdan oldin nomini olamiz
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'DELETE', 'Customer', { id, name: customer?.name });
    }

    res.json({ message: 'Mijoz o\'chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// GET mijozning sotuvlari tarixi
export const getCustomerSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name))')
      .eq('customer_id', id)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// POST mijoz qarzini to'lash (audit log bilan)
export const payDebt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = payDebtSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { amount, note } = parsed.data;

    // 1. Qarz to'lovini saqlash
    const { error: payError } = await supabase
      .from('debt_payments')
      .insert([{ customer_id: id, amount, note }]);

    if (payError) throw payError;

    // 2. Mijoz qarzini kamaytirish
    const { data: custData } = await supabase
      .from('customers')
      .select('name, debt')
      .eq('id', id)
      .single();

    if (custData) {
      const newDebt = Math.max(0, Number(custData.debt) - amount);
      const { data, error } = await supabase
        .from('customers')
        .update({ debt: newDebt })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;

      // Audit log yozish
      if ((req as any).user?.id) {
        await logAction((req as any).user.id, 'UPDATE', 'CustomerDebtPayment', { 
          id, 
          name: custData.name, 
          amount, 
          oldDebt: custData.debt, 
          newDebt 
        });
      }

      res.json(data);
      return;
    }

    res.status(404).json({ error: 'Mijoz topilmadi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
