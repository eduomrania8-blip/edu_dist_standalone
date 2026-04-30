import { supabaseAdmin as supabase } from './src/lib/supabaseAdmin';

async function check() {
  const { data } = await supabase.from('teachers').select('subject');
  const distinct = new Set(data?.map(d => d?.trim()));
  console.log(Array.from(distinct).filter(Boolean));
  process.exit(0);
}

check();
