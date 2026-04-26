'use server';

import { getAllSchools, getAllSupervisors, getSupervisorWishes, saveDistributionResults } from '@/services/distributionService';
import { runDistributionAlgorithm } from '@/lib/distributionAlgorithm';

export async function executeDistribution() {
  try {
    const schools = await getAllSchools();
    const supervisors = await getAllSupervisors();
    const wishes = await getSupervisorWishes();

    if (schools.length === 0 || supervisors.length === 0) {
      throw new Error('Missing data: schools or supervisors not found');
    }

    const results = runDistributionAlgorithm(supervisors, schools, wishes);
    await saveDistributionResults(results);

    return { success: true, count: results.length };
  } catch (error: any) {
    console.error('Distribution Error:', error);
    return { success: false, message: error.message };
  }
}
