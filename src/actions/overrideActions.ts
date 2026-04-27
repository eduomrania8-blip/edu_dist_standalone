'use server';

import { supabase } from '@/lib/supabase';

export async function reassignSupervisor(resultId: string, newSchoolId: string) {
  try {
    const { error } = await supabase
      .from('distribution_results')
      .update({ assigned_school_id: newSchoolId, is_manual_override: true })
      .eq('id', resultId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function addManualAssignment(
  runId: string,
  supervisorId: string,
  schoolId: string
) {
  try {
    const { error } = await supabase
      .from('distribution_results')
      .insert({
        run_id: runId,
        supervisor_id: supervisorId,
        assigned_school_id: schoolId,
        final_score: 0,
        rank_achieved: 0,
        is_forced: true,
        is_manual_override: true,
        score_breakdown: {
          preference_score: 0,
          specialization_score: 0,
          stage_score: 0,
          type_score: 0,
          workload_penalty: 0,
          total: 0,
          preference_label: 'تعديل إداري',
        },
        rejection_reasons: [],
      });
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}
