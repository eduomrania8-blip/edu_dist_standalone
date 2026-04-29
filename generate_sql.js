// Generates SQL INSERT statements from TeacherDB.xlsx
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const xlsxPath = path.join(__dirname, 'New folder', 'TeacherDB.xlsx');
const wb = xlsx.readFile(xlsxPath);

const teachersRaw = xlsx.utils.sheet_to_json(wb.Sheets['Teachers'], { defval: null });
const schoolsRaw  = xlsx.utils.sheet_to_json(wb.Sheets['Schools'],  { defval: null });

console.log(`Found ${teachersRaw.length} teachers, ${schoolsRaw.length} schools`);

function esc(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''").trim()}'`;
}

function excelDate(v) {
  if (!v) return 'NULL';
  if (typeof v === 'string' && v.includes('-')) return `'${v.slice(0, 10)}'`;
  if (typeof v === 'string' && v.includes('T')) return `'${v.slice(0, 10)}'`;
  if (typeof v === 'number') {
    const d = xlsx.SSF.parse_date_code(v);
    if (d) return `'${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}'`;
  }
  return 'NULL';
}

function parseNID(nid) {
  const s = String(nid).padStart(14, '0');
  const c = s[0] === '2' ? '19' : '20';
  const govMap = {
    '01':'القاهرة','02':'الإسكندرية','03':'بور سعيد','04':'السويس',
    '11':'دمياط','12':'الدقهلية','13':'الشرقية','14':'القليوبية',
    '15':'كفر الشيخ','16':'الغربية','17':'المنوفية','18':'البحيرة',
    '19':'الإسماعيلية','21':'الجيزة','22':'بني سويف','23':'الفيوم',
    '24':'المنيا','25':'أسيوط','26':'سوهاج','27':'قنا',
    '28':'أسوان','29':'الأقصر','31':'البحر الأحمر','33':'مطروح',
  };
  return {
    dob: `'${c}${s.slice(1,3)}-${s.slice(3,5)}-${s.slice(5,7)}'`,
    gov: govMap[s.slice(7,9)] ? `'${govMap[s.slice(7,9)]}'` : 'NULL',
  };
}

const lines = [];
lines.push('-- ===================================================');
lines.push('-- Auto-generated from TeacherDB.xlsx');
lines.push('-- Run in Supabase SQL Editor');
lines.push('-- ===================================================');
lines.push('');

// ── 1. Schools ──────────────────────────────────────────────
lines.push('-- STEP 1: Import Schools');
lines.push('INSERT INTO base_schools (school_code, school_name, stage, school_type)');
lines.push('VALUES');

const validSchools = schoolsRaw.filter(s => s.name && s.code);
validSchools.forEach((s, i) => {
  const comma = i < validSchools.length - 1 ? ',' : '';
  lines.push(`  (${esc(s.code)}, ${esc(s.name)}, ${esc(s.stageName || s.stage || 'ابتدائي')}, ${esc(s.typeName || s.type || 'حكومي')})${comma}`);
});
lines.push('ON CONFLICT (school_code) DO UPDATE SET');
lines.push('  school_name = EXCLUDED.school_name,');
lines.push('  stage = EXCLUDED.stage,');
lines.push('  school_type = EXCLUDED.school_type;');
lines.push('');

// ── 2. Teachers ─────────────────────────────────────────────
lines.push('-- STEP 2: Import Teachers');
lines.push('INSERT INTO teachers (national_id, name, phone, address, subject, teacher_code,');
lines.push('  qualification, university, grad_year, grade, contract_type, start_date,');
lines.push('  diploma, dob, gov, base_school_id, is_active)');
lines.push('SELECT');
lines.push("  t.national_id, t.name, t.phone, t.address, t.subject, t.teacher_code,");
lines.push("  t.qualification, t.university, t.grad_year, t.grade, t.contract_type, t.start_date,");
lines.push("  t.diploma, t.dob, t.gov, bs.id AS base_school_id, true");
lines.push('FROM (VALUES');

const validTeachers = teachersRaw.filter(t => {
  const nid = t.nid || t.national_id;
  return nid && t.name;
});

validTeachers.forEach((t, i) => {
  const nid = String(t.nid || t.national_id).padStart(14, '0');
  const { dob, gov } = parseNID(nid);
  const comma = i < validTeachers.length - 1 ? ',' : '';
  const gradYear = t.gradYear ? Number(t.gradYear) : null;
  lines.push(
    `  ('${nid}', ${esc(t.name)}, ${esc(t.phone)}, ${esc(t.address)}, ` +
    `${esc(t.subject)}, ${esc(t.teacherCode)}, ` +
    `${esc(t.qualification)}, ${esc(t.university)}, ` +
    `${gradYear ? gradYear : 'NULL'}, ${esc(t.grade)}, ` +
    `${esc(t.contractType || 'بالأجر')}, ${excelDate(t.startDate)}, ` +
    `${esc(t.diploma)}, ${excelDate(t.dob) !== 'NULL' ? excelDate(t.dob) : dob}, ${gov}, ` +
    `${esc(t.schoolCode)})${comma}`
  );
});

lines.push(') AS t(national_id, name, phone, address, subject, teacher_code,');
lines.push('  qualification, university, grad_year, grade, contract_type, start_date,');
lines.push('  diploma, dob, gov, school_code)');
lines.push('LEFT JOIN base_schools bs ON bs.school_code = t.school_code::text');
lines.push('ON CONFLICT (national_id) DO UPDATE SET');
lines.push('  name = EXCLUDED.name,');
lines.push('  phone = EXCLUDED.phone,');
lines.push('  subject = EXCLUDED.subject,');
lines.push('  base_school_id = EXCLUDED.base_school_id,');
lines.push('  updated_at = NOW();');
lines.push('');
lines.push('-- DONE!');
lines.push("SELECT 'Schools: ' || count(*) FROM base_schools;");
lines.push("SELECT 'Teachers: ' || count(*) FROM teachers;");

const sql = lines.join('\n');
const outPath = path.join(__dirname, 'supabase', 'migrations', '009_seed_teachers_schools.sql');
fs.writeFileSync(outPath, sql, 'utf8');

console.log(`✅ SQL file generated: ${outPath}`);
console.log(`   ${validSchools.length} schools, ${validTeachers.length} teachers`);
console.log('\n👉 Now run this file in Supabase SQL Editor!');
