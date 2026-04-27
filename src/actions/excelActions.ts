'use server';

import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

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
      // skip header
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
        if (!row[0] || !row[1]) continue; // code and name are required
        schoolsPayload.push({
          school_code: String(row[0]),
          school_name: String(row[1]),
          school_type: row[2] || 'حكومي',
          stage: row[3] || 'ابتدائي',
          is_active: true
        });
      }

      if (schoolsPayload.length > 0) {
        // Bulk upsert schools
        const { error: sError } = await supabase.from('schools').upsert(
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
        if (!row[0] || !row[2]) continue; // code and name are required
        
        const specCode = String(row[1]);
        const specialtyName = specMap[specCode] || 'عام';
        
        // Status parsing (if available, mostly we assume active)
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
        // Bulk upsert supervisors
        const { error: supError } = await supabase.from('supervisors').upsert(
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
