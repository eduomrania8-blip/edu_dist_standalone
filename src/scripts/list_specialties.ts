import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function listSpecialties() {
  const { data, error } = await supabase
    .from('supervisors')
    .select('specialty');
  
  if (error) {
    console.error(error);
    return;
  }

  const unique = Array.from(new Set(data.map(s => s.specialty)));
  console.log('Unique Specialties in DB:', unique);
}

listSpecialties();
