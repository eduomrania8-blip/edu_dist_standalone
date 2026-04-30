import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';
import path from 'path';

function excelDateToISO(excelDate: any) {
  if (!excelDate) return null;
  if (typeof excelDate === 'string' && excelDate.includes('-')) return excelDate.slice(0, 10);
  if (typeof excelDate === 'number') {
    const date = xlsx.SSF.parse_date_code(excelDate);
    if (date) {
      const y = date.y, m = String(date.m).padStart(2,'0'), d = String(date.d).padStart(2,'0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

function parseNID(nid: any) {
  if (!nid) return { dob: null, gov: null };
  const s = String(nid).padStart(14, '0');
  if (s.length !== 14) return { dob: null, gov: null };
  const century = s[0] === '2' ? '19' : '20';
  const y = century + s.slice(1, 3);
  const m = s.slice(3, 5);
  const d = s.slice(5, 7);
  const govCode = s.slice(7, 9);
  const govMap: any = {
    '01': 'القاهرة','02': 'الإسكندرية','03': 'بور سعيد','04': 'السويس',
    '11': 'دمياط','12': 'الدقهلية','13': 'الشرقية','14': 'القليوبية',
    '15': 'كفر الشيخ','16': 'الغربية','17': 'المنوفية','18': 'البحيرة',
    '19': 'الإسماعيلية','21': 'الجيزة','22': 'بني سويف','23': 'الفيوم',
    '24': 'المنيا','25': 'أسيوط','26': 'سوهاج','27': 'قنا',
    '28': 'أسوان','29': 'الأقصر','31': 'البحر الأحمر','33': 'مطروح',
    '34': 'شمال سيناء','35': 'جنوب سيناء',
  };
  return { dob: `${y}-${m}-${d}`, gov: govMap[govCode] || null };
}

export async function GET() {
  try {
    // Try multiple possible paths
    const fs = await import('fs');
    const possiblePaths = [
      path.join(process.cwd(), 'New folder', 'TeacherDB.xlsx'),
      path.resolve('d:\\edu_dist_standalone\\New folder\\TeacherDB.xlsx'),
      path.join(process.cwd(), 'NewFolder', 'TeacherDB.xlsx'),
    ];
    
    let filePath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }
    
    if (!filePath) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot find TeacherDB.xlsx. Searched: ${possiblePaths.join(', ')}`,
        cwd: process.cwd()
      }, { status: 404 });
    }

    const workbook = xlsx.readFile(filePath);
    const teachersSheet = workbook.Sheets[workbook.SheetNames[0]];
    const schoolsSheet = workbook.Sheets['Schools'] || workbook.Sheets[workbook.SheetNames[1]];

    const teachersRaw = xlsx.utils.sheet_to_json<any>(teachersSheet, { defval: null });
    const schoolsRaw = xlsx.utils.sheet_to_json<any>(schoolsSheet, { defval: null });

    // 1. Import Schools
    const schoolRows = schoolsRaw
      .filter(s => s.name && s.code && String(s.type).toLowerCase() !== 'admin')
      .map(s => ({
        school_code: String(s.code),
        school_name: String(s.name).trim(),
        stage: s.stageName || s.stage || 'ابتدائي',
        school_type: s.typeName || s.type || 'رسمى',
      }));

    const { error: schErr } = await supabase
      .from('base_schools')
      .upsert(schoolRows, { onConflict: 'school_code', ignoreDuplicates: false });

    if (schErr) throw new Error('Schools Error: ' + schErr.message);

    const { data: allSchools } = await supabase.from('base_schools').select('id, school_code');
    const schoolMap: Record<string, string> = {};
    (allSchools || []).forEach(s => { schoolMap[s.school_code] = s.id; });

    // 2. Import Teachers
    const teacherRows: any[] = [];
    for (const t of teachersRaw) {
      const nid = t.nid || t.national_id || t.nationalId || t.NID;
      if (!nid || !t.name) continue;

      const nidStr = String(nid).padStart(14, '0');
      const { dob, gov } = parseNID(nidStr);
      const schoolCode = t.schoolCode ? String(t.schoolCode) : null;
      const base_school_id = schoolCode ? (schoolMap[schoolCode] || null) : null;

      teacherRows.push({
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
        contract_type: t.contractType || t.contract_type || 'بالأجر',
        start_date: excelDateToISO(t.startDate || t.start_date),
        diploma: t.diploma || null,
        dob: excelDateToISO(t.dob) || dob,
        gov: t.gov || gov,
        base_school_id,
        is_active: true,
      });
    }

    // Upsert batches
    let totalUpserted = 0;
    for (let i = 0; i < teacherRows.length; i += 100) {
      const batch = teacherRows.slice(i, i + 100);
      const { error: tErr } = await supabase
        .from('teachers')
        .upsert(batch, { onConflict: 'national_id', ignoreDuplicates: false });
      if (tErr) throw new Error('Batch Error: ' + tErr.message);
      totalUpserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      importedSchools: schoolRows.length,
      importedTeachers: totalUpserted,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
