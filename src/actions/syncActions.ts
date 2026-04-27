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
          is_active: s.isActive ?? true,
          mandatory_supervisor_id: s.mandatorySupervisorId || null,
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
          is_active: s.isActive ?? true,
        })),
        { onConflict: 'national_id' }
      );
      if (supError) throw supError;

      // Handle importing wishes if they exist in the response
      const wishesData = data.supervisors.filter((s: any) => s.wish1 || s.wish2 || s.wish3 || s.wish4);
      if (wishesData.length > 0) {
        // We first need to get all supervisor UUIDs since we upserted them
        const { data: dbSupervisors, error: fetchErr } = await supabase.from('supervisors').select('id, national_id');
        if (!fetchErr && dbSupervisors) {
          const supervisorMap = new Map(dbSupervisors.map(sup => [sup.national_id, sup.id]));
          
          const wishesPayload = wishesData.map((s: any) => ({
            supervisor_id: supervisorMap.get(s.nationalId),
            wish_1: s.wish1 || null,
            wish_2: s.wish2 || null,
            wish_3: s.wish3 || null,
            wish_4: s.wish4 || null,
          })).filter((w: any) => w.supervisor_id); // Ensure we found the supervisor ID

          if (wishesPayload.length > 0) {
            const { error: wError } = await supabase.from('supervisor_wishes').upsert(
              wishesPayload,
              { onConflict: 'supervisor_id' }
            );
            if (wError) console.error('Error upserting wishes:', wError);
          }
        }
      }
    }

    return { success: true, message: 'Data synced successfully' };
  } catch (error: any) {
    console.error('Sync Error:', error);
    return { success: false, message: error.message };
  }
}
