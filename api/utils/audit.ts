import { supabase } from './supabase';

/**
 * Audit loglarni bazaga yozish uchun yordamchi funksiya.
 * 
 * @param userId - Harakatni amalga oshirgan foydalanuvchining UUID'si
 * @param action - Harakat turi: CREATE, UPDATE, DELETE, vb.
 * @param entity - O'zgargan jadval/resurs nomi: Product, Sale, Customer, vb.
 * @param details - O'zgarish tafsilotlari (JSON formatida)
 */
export const logAction = async (
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | string,
  entity: string,
  details: any
) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: userId,
          action,
          entity,
          details,
        },
      ]);

    if (error) {
      console.error('⚠️ Audit log yozishda xatolik:', error.message);
    }
  } catch (err: any) {
    console.error('⚠️ Audit log yozishda kutilmagan xatolik:', err.message);
  }
};
