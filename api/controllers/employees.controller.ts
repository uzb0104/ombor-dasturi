import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createEmployeeSchema, updateEmployeeSchema, paySalarySchema } from '../utils/validation';
import { logAction } from '../utils/audit';

// GET barcha xodimlar (pagination bilan)
export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    let query = supabase
      .from('employees')
      .select(`
        *,
        salary_payments(amount, type, date)
      `, { count: 'exact' });

    if (page !== null && limit !== null) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order('hire_date', { ascending: false });

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

// POST yangi xodim yaratish (audit log bilan)
export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { name, phone, role, salary, hire_date, status } = parsed.data;

    const { data, error } = await supabase
      .from('employees')
      .insert([{ name, phone, role, salary, hire_date, status }])
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'CREATE', 'Employee', { id: data.id, name: data.name, role: data.role });
    }

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// PUT xodim ma'lumotlarini yangilash (audit log bilan)
export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const updateData = parsed.data;

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'UPDATE', 'Employee', { id, updateData });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// DELETE xodimni o'chirish (audit log bilan)
export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: emp } = await supabase
      .from('employees')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'DELETE', 'Employee', { id, name: emp?.name });
    }

    res.json({ message: 'Xodim o\'chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// POST xodimga oylik yoki avans to'lash (audit log bilan)
export const paySalaryOrAdvance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = paySalarySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { amount, type, note } = parsed.data; // type: 'AVANS' yoki 'OYLIK'

    const { data, error } = await supabase
      .from('salary_payments')
      .insert([{ employee_id: id, amount, type, note }])
      .select()
      .single();

    if (error) throw error;

    // Xarajatlarga ham qo'shib qo'yamiz (Expenses)
    await supabase.from('expenses').insert([{
      category: 'Ish haqi',
      amount,
      note: `Xodimga to'lov: ${type} - ${note || ''}`
    }]);

    // Audit log yozish
    if ((req as any).user?.id) {
      const { data: emp } = await supabase.from('employees').select('name').eq('id', id).single();
      await logAction((req as any).user.id, 'UPDATE', 'EmployeeSalaryPayment', { 
        id, 
        name: emp?.name,
        amount, 
        type, 
        note 
      });
    }

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
