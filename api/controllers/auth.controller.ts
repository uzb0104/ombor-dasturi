import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../utils/supabase';
import { generateToken } from '../utils/jwt';
import { loginSchema, registerSchema } from '../utils/validation';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { email, password } = parsed.data;

    // Foydalanuvchini bazadan qidirish
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'Email yoki parol xato' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ error: 'Akkount faol emas' });
      return;
    }

    // Parolni tekshirish
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Email yoki parol xato' });
      return;
    }

    // JWT token yaratish
    const token = generateToken(user);

    // Parolni javobdan olib tashlash
    delete user.password;

    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const { name, email, password, role } = parsed.data;

    // Email bandligini tekshirish
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(400).json({ error: 'Bu email allaqachon mavjud' });
      return;
    }

    // Parolni hashlash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Yangi foydalanuvchini saqlash
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        { name, email, password: hashedPassword, role: role || 'SELLER' }
      ])
      .select()
      .single();

    if (error || !user) {
      res.status(400).json({ error: 'Foydalanuvchi yaratishda xatolik', details: error });
      return;
    }

    delete user.password;
    res.status(201).json({ user, message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, active, warehouse_id, permissions, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
