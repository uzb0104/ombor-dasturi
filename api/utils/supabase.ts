import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase URL yoki Service Key topilmadi!');
}

// Backend (Node.js) uchun doim Service Role Key ishlatiladi
// chunki backendda RLS (Row Level Security) ni chetlab o'tish yoki 
// o'zimizning maxsus Auth mantig'imizni ishlatish qulay.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
