import { supabaseAdmin as supabase } from './src/lib/supabaseAdmin';

function getSubjectsForSpecialty(specialty: string): string[] {
  const cleanSpec = specialty.replace(/^ال/, '').trim(); // Remove "ال" prefix
  
  if (cleanSpec === 'علوم') return ['علوم', 'علوم لغات', 'كيمياء', 'فيزياء', 'أحياء', 'كيمياء لغات', 'فيزياء لغات', 'أحياء لغات', 'علوم متكاملة'];
  if (cleanSpec === 'دراسات اجتماعية' || cleanSpec === 'دراسات') return ['دراسات اجتماعية', 'دراسات', 'تاريخ', 'جغرافيا', 'تاريخ وجغرافيا'];
  if (cleanSpec === 'لغة عربية' || cleanSpec === 'لغه عربيه') return ['لغة عربية', 'لغه عربيه', 'عربي', 'لغة عربية (تربية دينية)', 'تربية إسلامية', 'تربيه اسلاميه', 'تربية دينية', 'تربيه دينيه'];
  if (cleanSpec === 'رياضيات') return ['رياضيات', 'رياضيات لغات'];
  return [specialty, cleanSpec];
}

async function check() {
  const { data: user } = await supabase.from('users').select('username, specialty, role').eq('username', 'اللغة العربية').single();
  console.log('User:', user);

  const subjects = getSubjectsForSpecialty((user?.specialty || '').trim());
  console.log('Subjects mapped:', subjects);

  const { data: teachersData, error } = await supabase
    .from('teachers')
    .select('id, name, subject')
    .in('subject', subjects);
    
  console.log('Teachers matching:', teachersData?.length);
  console.log('Error?', error);
  process.exit(0);
}

check();
