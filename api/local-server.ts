import app from './index';
import { supabase } from './utils/supabase.js';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 3000;

// Default admin foydalanuvchisini tekshirish va yaratish (Seed)
async function seedAdmin() {
  try {
    const email = 'admin@autoerp.uz';
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      console.log('🌱 Default admin topilmadi. Yaratilmoqda...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const { error } = await supabase
        .from('users')
        .insert([{
          name: 'Bosh admin',
          email,
          password: hashedPassword,
          role: 'ADMIN',
          active: true,
          permissions: ['all']
        }]);

      if (error) {
        console.error('❌ Default admin yaratishda xato:', error.message);
      } else {
        console.log('✅ Default admin muvaffaqiyatli yaratildi: admin@autoerp.uz / admin123');
      }
    } else {
      console.log('✅ Default admin bazada mavjud.');
    }
  } catch (err: any) {
    console.error('❌ Seed jarayonida xatolik:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Express backend server running on http://localhost:${PORT}`);
  await seedAdmin();
});
