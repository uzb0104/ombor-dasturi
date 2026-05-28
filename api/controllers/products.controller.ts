import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createProductSchema, updateProductSchema } from '../utils/validation';
import { logAction } from '../utils/audit';

const isUUID = (str: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// GET barcha mahsulotlar (inventar qoldiqlari bilan birga) - pagination qo'shildi
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;

    let query = supabase
      .from('products')
      .select(`
        *,
        vehicle_brands(name),
        categories(name),
        suppliers(name),
        inventory(warehouse_id, quantity)
      `, { count: 'exact' });

    if (page !== null && limit !== null) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data: products, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    if (page !== null && limit !== null) {
      const total = count || 0;
      res.json({
        data: products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } else {
      res.json(products);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// POST yangi mahsulot yaratish - audit log qo'shildi
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const {
      name, sku, barcode, vehicle, category, vehicle_id, category_id, supplier_id,
      buy_price, sell_price, min_qty, description
    } = parsed.data;

    let finalVehicleId = vehicle_id;
    let finalCategoryId = category_id;
    let finalSupplierId = supplier_id;

    // 1. Avtomobil brendini hal qilish
    const brandName = vehicle || 'Barchasi';
    if (!finalVehicleId || !isUUID(finalVehicleId)) {
      // Nomi bo'yicha qidiramiz
      const { data: brand } = await supabase
        .from('vehicle_brands')
        .select('id')
        .eq('name', brandName)
        .maybeSingle();

      if (brand) {
        finalVehicleId = brand.id;
      } else {
        // Yangi brend yaratamiz
        const { data: newBrand, error: brandErr } = await supabase
          .from('vehicle_brands')
          .insert([{ name: brandName }])
          .select()
          .single();
        if (brandErr) throw brandErr;
        finalVehicleId = newBrand.id;
      }
    }

    // 2. Kategoriyani hal qilish
    const catName = category || 'Boshqa';
    if (!finalCategoryId || !isUUID(finalCategoryId)) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', catName)
        .maybeSingle();

      if (cat) {
        finalCategoryId = cat.id;
      } else {
        const { data: newCat, error: catErr } = await supabase
          .from('categories')
          .insert([{ name: catName }])
          .select()
          .single();
        if (catErr) throw catErr;
        finalCategoryId = newCat.id;
      }
    }

    // 3. Yetkazib beruvchini hal qilish
    if (!finalSupplierId || !isUUID(finalSupplierId)) {
      // Agar bazada bitta ham supplier bo'lmasa, yangi bitta default yetkazib beruvchi yaratamiz
      const { data: existingSup } = await supabase
        .from('suppliers')
        .select('id')
        .limit(1);

      if (existingSup && existingSup.length > 0) {
        finalSupplierId = existingSup[0].id;
      } else {
        const { data: newSup, error: supErr } = await supabase
          .from('suppliers')
          .insert([{ name: 'Asosiy yetkazib beruvchi', phone: '+998901234567' }])
          .select()
          .single();
        if (supErr) throw supErr;
        finalSupplierId = newSup.id;
      }
    }

    // 4. Mahsulotni yaratish
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .insert([{
        name,
        sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        barcode: barcode || null,
        vehicle_id: finalVehicleId,
        category_id: finalCategoryId,
        supplier_id: finalSupplierId,
        buy_price,
        sell_price,
        min_qty: min_qty || 5,
        description
      }])
      .select()
      .single();

    if (prodErr) throw prodErr;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'CREATE', 'Product', { id: product.id, name: product.name, sku: product.sku });
    }

    res.status(201).json(product);
  } catch (err: any) {
    console.error("❌ XATO createProduct tafsiloti:", err);
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// PUT mahsulotni yangilash - audit log qo'shildi
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validatsiya xatosi', details: parsed.error.errors.map(e => e.message) });
      return;
    }
    const updateData = parsed.data;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'UPDATE', 'Product', { id, updateData });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};

// DELETE mahsulotni o'chirish - audit log qo'shildi
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Audit log uchun avval mahsulot nomini olamiz
    const { data: product } = await supabase
      .from('products')
      .select('name, sku')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log yozish
    if ((req as any).user?.id) {
      await logAction((req as any).user.id, 'DELETE', 'Product', { id, name: product?.name, sku: product?.sku });
    }

    res.json({ message: 'Mahsulot o\'chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
