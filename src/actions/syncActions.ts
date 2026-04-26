'use server';

import { supabase } from '@/lib/supabase';

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

export async function syncDataFromGoogleSheets() {
  if (!GAS_URL) {
    return { success: false, message: 'رابط مزامنة Google Sheets غير مهيأ (NEXT_PUBLIC_GAS_URL)' };
  }

  try {
    const response = await fetch(GAS_URL);
    if (!response.ok) throw new Error('فشل في جلب البيانات من Google Sheets');
    
    const data = await response.json();
    // Expected structure: { schools: [...], supervisors: [...], guidance: [...] }
    
    if (data.schools && data.schools.length > 0) {
      const { error: sError } = await supabase.from('schools').upsert(
        data.schools.map((s: any) => ({
          school_code: s.code,
          school_name: s.name,
          stage: s.stage,
          school_type: s.type,
        })),
        { onConflict: 'school_code' }
      );
      if (sError) throw sError;
    }

    if (data.supervisors && data.supervisors.length > 0) {
      const { error: supError } = await supabase.from('supervisors').upsert(
        data.supervisors.map((s: any) => ({
          national_id: s.nationalId,
          name: s.name,
          specialty: s.specialty,
        })),
        { onConflict: 'national_id' }
      );
      if (supError) throw supError;
    }

    return { success: true, message: 'Data synced successfully' };
  } catch (error: any) {
    console.error('Sync Error:', error);
    return { success: false, message: error.message };
  }
}
