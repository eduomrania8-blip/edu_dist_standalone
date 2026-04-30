import { supabaseAdmin as supabase } from './src/lib/supabaseAdmin';

async function check() {
  const { data } = await supabase.from('users').select('username, specialty, role');
  console.log(data);
  process.exit(0);
}

check();
