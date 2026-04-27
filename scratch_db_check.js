const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDb() {
  console.log('Attempting to insert admin user...');
  const { data: insertData, error: insertError } = await supabase.from('users').upsert([
    { username: 'admin', password_hash: 'admin123', role: 'admin' }
  ], { onConflict: 'username' });

  if (insertError) {
    console.error('Error inserting:', insertError);
  } else {
    console.log('Insert success');
  }

  console.log('Querying users table...');
  const { data, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users found:', data);
  }
}

checkDb();
