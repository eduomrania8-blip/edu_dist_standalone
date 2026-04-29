'use server';

import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ─────────────────────────────────────────────
// Helper: Excel date → ISO string
// ─────────────────────────────────────────────
function excelDateToISO(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string' && val.includes('-')) return val.slice(0, 10);
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const y = d.y, m = String(d.m).padStart(2, '0'), dd = String(d.d).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Helper: National ID → DOB + Governorate
// ─────────────────────────────────────────────
function parseNID(nid: string) {
  if (!nid || nid.length !== 14) return { dob: null, gov: null, isValid: false };
  const century = nid[0] === '2' ? '19' : '20';
  const y = century + nid.slice(1, 3);
  const m = nid.slice(3, 5);
  const d = nid.slice(5, 7);
  const govCode = nid.slice(7, 9);
  const govMap: Record<string, string> = {
    '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بور سعيد', '04': 'السويس',
    '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
    '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
    '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
    '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا',
    '28': 'أسوان', '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد',
    '33': 'مطروح', '34': 'شمال سيناء', '35': 'جنوب سيناء',
  };

  let dob: string | null = `${y}-${m}-${d}`;
  let isValid = true;
  // Validate the date to prevent Postgres out-of-range errors for mistyped NIDs
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  if (
    dateObj.getFullYear() !== parseInt(y) ||
    dateObj.getMonth() !== parseInt(m) - 1 ||
    dateObj.getDate() !== parseInt(d)
  ) {
    dob = null;
    isValid = false; // The NID contains an impossible date
  }

  return { dob, gov: govMap[govCode] || null, isValid };
}

// ─────────────────────────────────────────────
// 1. استيراد الموجهين والمدارس (الملف الأصلي)
// ─────────────────────────────────────────────
export async function importExcelData(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, message: 'لم يتم العثور على ملف' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 1. Read Specialties mapping (التوجيه)
    const specSheet = workbook.Sheets['التوجيه'];
    const specMap: Record<string, string> = {};
    if (specSheet) {
      const specRows = XLSX.utils.sheet_to_json<any[]>(specSheet, { header: 1 });
      for (let i = 1; i < specRows.length; i++) {
        const row = specRows[i];
        if (row[0] && row[1]) {
          specMap[String(row[0])] = row[1];
        }
      }
    }

    // 2. Read Schools (المدارس)
    const schoolsSheet = workbook.Sheets['المدارس'];
    if (schoolsSheet) {
      const schoolsRows = XLSX.utils.sheet_to_json<any[]>(schoolsSheet, { header: 1 });
      const schoolsPayload = [];
      for (let i = 1; i < schoolsRows.length; i++) {
        const row = schoolsRows[i];
        if (!row[0] || !row[1]) continue;
        schoolsPayload.push({
          school_code: String(row[0]),
          school_name: String(row[1]),
          school_type: row[2] || 'حكومي',
          stage: row[3] || 'ابتدائي',
          is_active: true
        });
      }

      if (schoolsPayload.length > 0) {
        const { error: sError } = await supabaseAdmin.from('schools').upsert(
          schoolsPayload,
          { onConflict: 'school_code' }
        );
        if (sError) throw new Error('خطأ في إدخال المدارس: ' + sError.message);
      }
    }

    // 3. Read Supervisors (الموجهين)
    const supSheet = workbook.Sheets['الموجهين'];
    if (supSheet) {
      const supRows = XLSX.utils.sheet_to_json<any[]>(supSheet, { header: 1 });
      const supPayload = [];
      for (let i = 1; i < supRows.length; i++) {
        const row = supRows[i];
        if (!row[0] || !row[2]) continue;

        const specCode = String(row[1]);
        const specialtyName = specMap[specCode] || 'عام';
        const isActiveStr = row[4];
        let isActive = true;
        if (typeof isActiveStr === 'string' && (isActiveStr.includes('نقل') || isActiveStr.includes('اجازة') || isActiveStr.includes('استبعاد'))) {
          isActive = false;
        }

        supPayload.push({
          national_id: String(row[0]),
          name: String(row[2]),
          specialty: specialtyName,
          phone: row[3] ? String(row[3]) : null,
          is_active: isActive
        });
      }

      if (supPayload.length > 0) {
        const { error: supError } = await supabaseAdmin.from('supervisors').upsert(
          supPayload,
          { onConflict: 'national_id' }
        );
        if (supError) throw new Error('خطأ في إدخال الموجهين: ' + supError.message);
      }
    }

    return { success: true, message: 'تم استيراد المدارس والموجهين بنجاح!' };
  } catch (error: any) {
    console.error('Excel Import Error:', error);
    return { success: false, message: error.message || 'حدث خطأ أثناء قراءة الملف' };
  }
}

// ─────────────────────────────────────────────
// 2. استيراد المعلمين من TeacherDB.xlsx
// ─────────────────────────────────────────────
export async function importTeachersExcel(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, message: 'لم يتم العثور على ملف', schools: 0, teachers: 0, invalidTeachers: [] };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // ── Detect sheets ──
    const sheetNames = workbook.SheetNames;
    const teachersSheetName = sheetNames.find(n => n.includes('معلم') || n.includes('Teacher')) || sheetNames[0];
    const schoolsSheetName = sheetNames.find(n => n.includes('مدارس') || n.includes('School') || n.includes('Schools')) || sheetNames[1];

    let schoolsImported = 0;
    let teachersImported = 0;
    const invalidTeachers: string[] = [];

    // ── STEP 1: Import Schools (base_schools) ──
    if (schoolsSheetName && workbook.Sheets[schoolsSheetName]) {
      const schoolsRaw = XLSX.utils.sheet_to_json<any>(workbook.Sheets[schoolsSheetName], { defval: null });
      const schoolRows = schoolsRaw
        .filter((s: any) => {
          const code = s.code || s.school_code || s['كود المدرسة'];
          const name = s.name || s.school_name || s['اسم المدرسة'];
          return code && name;
        })
        .map((s: any) => ({
          school_code: String(s.code || s.school_code || s['كود المدرسة']),
          school_name: String(s.name || s.school_name || s['اسم المدرسة']).trim(),
          stage: s.stageName || s.stage || s['المرحلة'] || 'ابتدائي',
          school_type: s.typeName || s.type || s.school_type || s['النوع'] || 'رسمى',
        }));

      if (schoolRows.length > 0) {
        // Batch upsert schools (50 at a time)
        for (let i = 0; i < schoolRows.length; i += 50) {
          const batch = schoolRows.slice(i, i + 50);
          const { error } = await supabaseAdmin.from('base_schools').upsert(
            batch,
            { onConflict: 'school_code', ignoreDuplicates: false }
          );
          if (error) throw new Error('خطأ في المدارس: ' + error.message);
        }
        schoolsImported = schoolRows.length;
      }
    }

    // ── Get school code → id mapping ──
    const { data: allSchools } = await supabaseAdmin.from('base_schools').select('id, school_code');
    const schoolMap: Record<string, string> = {};
    (allSchools || []).forEach((s: any) => { schoolMap[s.school_code] = s.id; });

    // ── STEP 2: Import Teachers ──
    const teachersSheet = workbook.Sheets[teachersSheetName];
    if (teachersSheet) {
      const teachersRaw = XLSX.utils.sheet_to_json<any>(teachersSheet, { defval: null });
      const teacherRows: any[] = [];

      for (const t of teachersRaw) {
        const nid = t.nid || t.national_id || t.nationalId || t.NID || t['الرقم القومي'] || t['رقم قومي'];
        const name = t.name || t['الاسم'] || t['اسم المعلم'];
        if (!nid || !name) continue;

        const nidStr = String(nid).replace(/\s/g, '').padStart(14, '0');
        const { dob, gov, isValid } = parseNID(nidStr);

        // Reject invalid national IDs
        if (!isValid) {
          invalidTeachers.push(`${name} (الرقم القومي غير صالح: ${nidStr})`);
          continue;
        }

        const schoolCode = t.schoolCode || t.school_code || t['كود المدرسة'];
        const base_school_id = schoolCode ? (schoolMap[String(schoolCode)] || null) : null;

        teacherRows.push({
          national_id: nidStr,
          name: String(name).trim(),
          phone: t.phone || t['التليفون'] ? String(t.phone || t['التليفون']) : null,
          address: t.address || t['العنوان'] ? String(t.address || t['العنوان']).trim() : null,
          subject: t.subject || t['المادة'] || null,
          teacher_code: t.teacherCode || t.teacher_code || t['كود المعلم'] ? String(t.teacherCode || t.teacher_code || t['كود المعلم']) : null,
          qualification: t.qualification || t['المؤهل'] || null,
          university: t.university || t['الجامعة'] ? String(t.university || t['الجامعة']).trim() : null,
          grad_year: t.gradYear || t.grad_year || t['سنة التخرج'] ? Number(t.gradYear || t.grad_year || t['سنة التخرج']) : null,
          grade: t.grade || t['التقدير'] || null,
          contract_type: t.contractType || t.contract_type || t['نوع التعاقد'] || 'بالأجر',
          start_date: excelDateToISO(t.startDate || t.start_date || t['تاريخ التعيين']),
          diploma: t.diploma || t['الدبلوم'] || null,
          dob: excelDateToISO(t.dob || t['تاريخ الميلاد']) || dob,
          gov: t.gov || t['المحافظة'] || gov,
          base_school_id,
          is_active: true,
        });
      }

      // Batch upsert teachers (50 at a time to avoid payload limits)
      for (let i = 0; i < teacherRows.length; i += 50) {
        const batch = teacherRows.slice(i, i + 50);
        const { error } = await supabaseAdmin.from('teachers').upsert(
          batch,
          { onConflict: 'national_id', ignoreDuplicates: false }
        );
        if (error) throw new Error(`خطأ في المعلمين (دفعة ${Math.floor(i / 50) + 1}): ${error.message}`);
      }
      teachersImported = teacherRows.length;
    }

    return {
      success: true,
      message: `تم الاستيراد بنجاح! (${schoolsImported} مدرسة + ${teachersImported} معلم)`,
      schools: schoolsImported,
      teachers: teachersImported,
      invalidTeachers,
    };
  } catch (error: any) {
    console.error('Teacher Import Error:', error);
    return {
      success: false,
      message: error.message || 'حدث خطأ أثناء الاستيراد',
      schools: 0,
      teachers: 0,
      invalidTeachers: [],
    };
  }
}
