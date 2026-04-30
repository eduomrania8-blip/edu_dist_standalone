const urlBase = 'https://negnyzndjixvkntpsisv.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ255em5kaml4dmtudHBzaXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDE0NzEsImV4cCI6MjA4NjQxNzQ3MX0.i5bgiSvL735z1fj4GNDYldwMLD6YPJx4ESz9HGwZrlE';

const headers = {
  'apikey': key,
  'Authorization': 'Bearer ' + key,
};

function getSubjectsForSpecialty(specialty) {
  const cleanSpec = specialty.replace(/^ال/, '').trim(); // Remove "ال" prefix
  
  if (cleanSpec === 'علوم') return ['علوم', 'علوم لغات', 'كيمياء', 'فيزياء', 'أحياء', 'كيمياء لغات', 'فيزياء لغات', 'أحياء لغات', 'علوم متكاملة'];
  if (cleanSpec === 'دراسات اجتماعية' || cleanSpec === 'دراسات') return ['دراسات اجتماعية', 'دراسات', 'تاريخ', 'جغرافيا', 'تاريخ وجغرافيا'];
  if (cleanSpec === 'لغة عربية' || cleanSpec === 'لغه عربيه' || cleanSpec === 'لغة العربية' || cleanSpec === 'لغه العربيه' || specialty === 'اللغة العربية') return ['لغة عربية', 'لغه عربيه', 'عربي', 'لغة عربية (تربية دينية)', 'تربية إسلامية', 'تربيه اسلاميه', 'تربية دينية', 'تربيه دينيه'];
  if (cleanSpec === 'رياضيات') return ['رياضيات', 'رياضيات لغات'];
  return [specialty, cleanSpec];
}

async function test() {
  try {
    const userRes = await fetch(`${urlBase}/users?username=eq.%D8%A7%D9%84%D9%84%D8%BA%D8%A9%20%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9`, { headers });
    const users = await userRes.json();
    const user = users[0];
    console.log('User:', user);

    const subjects = getSubjectsForSpecialty((user.specialty || '').trim());
    console.log('Subjects:', subjects);

    const subjectsStr = subjects.map(s => `"${s}"`).join(',');
    const teachersRes = await fetch(`${urlBase}/teachers?subject=in.(${encodeURIComponent(subjectsStr)})`, { headers });
    const teachers = await teachersRes.json();
    console.log('Teachers count:', teachers.length);
  } catch (err) {
    console.error(err);
  }
}
test();
