// ─── Direct Import Script (ESM-compatible for tsx) ───────
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const idx = l.indexOf('=');
  if (idx > 0) env[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
console.log('URL:', url?.slice(0, 30) + '...');
console.log('Key:', key?.slice(0, 20) + '...');

const supabase = createClient(url, key);

// ─── Helpers ─────────────────────────────────────────────
function excelDateToISO(v) {
  if (!v) return null;
  if (typeof v === 'string' && v.includes('-')) return v.slice(0, 10);
  if (typeof v === 'string' && v.includes('T')) return v.slice(0, 10);
  if (typeof v === 'number') {
    const d = xlsx.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  return null;
}

function parseNID(nid) {
  const s = String(nid).padStart(14, '0');
  if (s.length !== 14) return { dob: null, gov: null };
  const c = s[0] === '2' ? '19' : '20';
  const govMap = {
    '01':'القاهرة','02':'الإسكندرية','04':'السويس',
    '11':'دمياط','12':'الدقهلية','13':'الشرقية','14':'القليوبية',
    '15':'كفر الشيخ','16':'الغربية','17':'المنوفية','18':'البحيرة',
    '19':'الإسماعيلية','21':'الجيزة','22':'بني سويف','23':'الفيوم',
    '24':'المنيا','25':'أسيوط','26':'سوهاج','27':'قنا',
    '28':'أسوان','29':'الأقصر','31':'البحر الأحمر','33':'مطروح',
  };
  return {
    dob: `${c}${s.slice(1,3)}-${s.slice(3,5)}-${s.slice(5,7)}`,
    gov: govMap[s.slice(7,9)] || null,
  };
}

// ─── Main ────────────────────────────────────────────────
async function run() {
  const xlsxPath = path.join(__dirname, 'New folder', 'TeacherDB.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    console.error('❌ File not found:', xlsxPath);
    process.exit(1);
  }
  console.log('📂 Reading:', xlsxPath);
  
  const wb = xlsx.readFile(xlsxPath);
  console.log('📊 Sheets:', wb.SheetNames);
  
  const teachersRaw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  const schoolsRaw = xlsx.utils.sheet_to_json(wb.Sheets['Schools'] || wb.Sheets[wb.SheetNames[1]], { defval: null });
  
  console.log(`   ${teachersRaw.length} teachers, ${schoolsRaw.length} schools`);

  // 1) Schools
  console.log('\n🏫 Importing schools...');
  const schoolRows = schoolsRaw
    .filter(s => s.name && s.code)
    .map(s => ({
      school_code: String(s.code),
      school_name: String(s.name).trim(),
      stage: s.stageName || s.stage || 'ابتدائي',
      school_type: s.typeName || s.type || 'حكومي',
    }));

  const { error: schErr } = await supabase
    .from('base_schools')
    .upsert(schoolRows, { onConflict: 'school_code', ignoreDuplicates: false });

  if (schErr) { console.error('❌ Schools error:', schErr.message); return; }
  console.log(`✅ ${schoolRows.length} schools upserted`);

  // Build map
  const { data: allSch } = await supabase.from('base_schools').select('id, school_code');
  const sMap = {};
  (allSch || []).forEach(s => sMap[s.school_code] = s.id);
  console.log(`🗺  School map: ${Object.keys(sMap).length} entries`);

  // 2) Teachers
  console.log('\n👩‍🏫 Importing teachers...');
  const rows = [];
  let skipped = 0;
  for (const t of teachersRaw) {
    const nid = t.nid || t.national_id || t.nationalId || t.NID;
    if (!nid || !t.name) { skipped++; continue; }
    const nidStr = String(nid).padStart(14, '0');
    const { dob, gov } = parseNID(nidStr);
    const scode = t.schoolCode ? String(t.schoolCode) : null;
    rows.push({
      national_id: nidStr,
      name: String(t.name).trim(),
      phone: t.phone ? String(t.phone) : null,
      address: t.address ? String(t.address).trim() : null,
      subject: t.subject || null,
      teacher_code: t.teacherCode ? String(t.teacherCode) : null,
      qualification: t.qualification || null,
      university: t.university ? String(t.university).trim() : null,
      grad_year: t.gradYear ? Number(t.gradYear) : null,
      grade: t.grade || null,
      contract_type: t.contractType || 'بالأجر',
      start_date: excelDateToISO(t.startDate),
      diploma: t.diploma || null,
      dob: excelDateToISO(t.dob) || dob,
      gov: t.gov || gov,
      base_school_id: scode ? (sMap[scode] || null) : null,
      is_active: true,
    });
  }

  let done = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from('teachers')
      .upsert(batch, { onConflict: 'national_id', ignoreDuplicates: false });
    if (error) {
      console.error(`❌ Batch ${Math.floor(i/50)+1} error:`, error.message);
      // Try one-by-one
      for (const row of batch) {
        const { error: e2 } = await supabase.from('teachers').upsert(row, { onConflict: 'national_id' });
        if (e2) console.error(`   ⚠ Skip ${row.name}: ${e2.message}`);
        else done++;
      }
    } else {
      done += batch.length;
    }
    process.stdout.write(`\r   ${done}/${rows.length} ...`);
  }

  console.log(`\n✅ Imported ${done} teachers (skipped ${skipped})`);

  // Summary
  const { count: sc } = await supabase.from('base_schools').select('*', { count: 'exact', head: true });
  const { count: tc } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
  console.log(`\n📈 DB Summary: ${sc} schools, ${tc} teachers`);
  console.log('🎉 Done!');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
