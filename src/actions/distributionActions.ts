'use server';

import {
  getAllSchools, getAllSupervisors, getSupervisorWishes,
  createDistributionRun, saveDistributionResults, updateRunStats,
} from '@/services/distributionService';
import { runDistributionAlgorithm } from '@/lib/distributionAlgorithm';
import { AlgorithmParams, DEFAULT_PARAMS } from '@/types/database';

export async function executeDistribution(
  runName: string = 'توزيع جديد',
  academicYear: string = '2025/2026',
  params: AlgorithmParams = DEFAULT_PARAMS
) {
  try {
    const [schools, supervisors, wishes] = await Promise.all([
      getAllSchools(),
      getAllSupervisors(),
      getSupervisorWishes(),
    ]);

    if (schools.length === 0) {
      return { success: false, message: 'لا توجد مدارس مُسجّلة في النظام' };
    }
    if (supervisors.length === 0) {
      return { success: false, message: 'لا يوجد موجهون مُسجّلون في النظام' };
    }

    // Run the algorithm
    const { assignments, stats } = runDistributionAlgorithm(
      supervisors, schools, wishes, params
    );

    // Create a run record
    const run = await createDistributionRun({
      run_name: runName,
      academic_year: academicYear,
      algorithm_params: params,
    });

    // Save all assignments
    await saveDistributionResults(run.id, assignments);

    // Update run stats
    await updateRunStats(run.id, stats);

    return {
      success: true,
      runId: run.id,
      stats,
      message: `تم التوزيع بنجاح: ${stats.total} موجه — نسبة الرضا ${stats.satisfaction_rate}%`,
    };
  } catch (error: any) {
    console.error('Distribution Error:', error);
    return { success: false, message: error.message ?? 'حدث خطأ أثناء التوزيع' };
  }
}
