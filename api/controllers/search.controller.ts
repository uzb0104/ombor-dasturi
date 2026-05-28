import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

// GET global qidiruv (/api/search?q=xyz)
export const globalSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.json([]);
      return;
    }

    const searchTerm = `%${q}%`;

    // 1. Mahsulotlarni qidirish
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, sell_price')
      .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm}`)
      .limit(10);

    // 2. Mijozlarni qidirish
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone, debt')
      .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
      .limit(10);

    // 3. Sotuvlarni izoh (note) bo'yicha qidirish
    const { data: sales } = await supabase
      .from('sales')
      .select(`
        id, 
        total, 
        date,
        customers (name)
      `)
      .or(`note.ilike.${searchTerm}`)
      .limit(10);

    // Agar qidiruv so'zi UUID formatida bo'lsa, sotuv ID'si bo'yicha to'g'ridan-to'g'ri qidiramiz
    let uuidSale = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.trim());
    if (isUUID) {
      const { data: saleById } = await supabase
        .from('sales')
        .select(`
          id, 
          total, 
          date,
          customers (name)
        `)
        .eq('id', q.trim())
        .maybeSingle();
      if (saleById) {
        uuidSale = saleById;
      }
    }

    const results = [
      ...(products || []).map(p => ({
        id: p.id,
        type: 'product',
        title: p.name,
        subtitle: `SKU: ${p.sku || 'Noma\'lum'} | Narxi: ${Number(p.sell_price).toLocaleString()} UZS`,
        link: `/products?id=${p.id}`
      })),
      ...(customers || []).map(c => ({
        id: c.id,
        type: 'customer',
        title: c.name,
        subtitle: `Tel: ${c.phone || 'Noma\'lum'} | Qarz: ${Number(c.debt).toLocaleString()} UZS`,
        link: `/customers?id=${c.id}`
      })),
      ...(sales || []).map(s => ({
        id: s.id,
        type: 'sale',
        title: `Sotuv #${s.id.slice(0, 8)}`,
        subtitle: `Sana: ${new Date(s.date).toLocaleDateString()} | Summa: ${Number(s.total).toLocaleString()} UZS | Mijoz: ${s.customers?.name || 'Mijozsiz'}`,
        link: `/sales?id=${s.id}`
      }))
    ];

    if (uuidSale) {
      results.unshift({
        id: uuidSale.id,
        type: 'sale',
        title: `Sotuv #${uuidSale.id.slice(0, 8)}`,
        subtitle: `Sana: ${new Date(uuidSale.date).toLocaleDateString()} | Summa: ${Number(uuidSale.total).toLocaleString()} UZS | Mijoz: ${uuidSale.customers?.name || 'Mijozsiz'}`,
        link: `/sales?id=${uuidSale.id}`
      });
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', details: err.message });
  }
};
