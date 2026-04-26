import { School, Supervisor, SupervisorWish } from '@/types/database';

export function runDistributionAlgorithm(
  supervisors: Supervisor[],
  schools: School[],
  wishes: SupervisorWish[]
) {
  const results: any[] = [];
  const assignedSupervisorIds = new Set<string>();
  const schoolCapacities = new Map<string, number>();

  // Initialize school capacities (Assume each school can take 1 supervisor for now, or based on some rule)
  // To make it "fair", let's assume each school can take at least 1, and more if needed.
  // In a real system, this would come from a "Needs" table.
  schools.forEach(school => {
    schoolCapacities.set(school.id, 1); 
  });

  const wishesMap = new Map<string, SupervisorWish>();
  wishes.forEach(w => wishesMap.set(w.supervisor_id, w));

  // Helper to try assign
  const tryAssign = (supervisorId: string, schoolId: string | undefined, rank: number) => {
    if (!schoolId) return false;
    const capacity = schoolCapacities.get(schoolId) || 0;
    if (capacity > 0) {
      results.push({
        supervisor_id: supervisorId,
        assigned_school_id: schoolId,
        rank_achieved: rank,
      });
      assignedSupervisorIds.add(supervisorId);
      schoolCapacities.set(schoolId, capacity - 1);
      return true;
    }
    return false;
  };

  // Phase 1: Try Wish 1
  supervisors.forEach(s => {
    const w = wishesMap.get(s.id);
    if (w && w.wish_1) tryAssign(s.id, w.wish_1, 1);
  });

  // Phase 2: Try Wish 2 for those not assigned
  supervisors.filter(s => !assignedSupervisorIds.has(s.id)).forEach(s => {
    const w = wishesMap.get(s.id);
    if (w && w.wish_2) tryAssign(s.id, w.wish_2, 2);
  });

  // Phase 3: Try Wish 3
  supervisors.filter(s => !assignedSupervisorIds.has(s.id)).forEach(s => {
    const w = wishesMap.get(s.id);
    if (w && w.wish_3) tryAssign(s.id, w.wish_3, 3);
  });

  // Phase 4: Try Wish 4
  supervisors.filter(s => !assignedSupervisorIds.has(s.id)).forEach(s => {
    const w = wishesMap.get(s.id);
    if (w && w.wish_4) tryAssign(s.id, w.wish_4, 4);
  });

  // Phase 5: Forced Distribution (Fairness)
  // For remaining supervisors, assign to schools with remaining capacity
  const remainingSchools = schools.filter(sch => (schoolCapacities.get(sch.id) || 0) > 0);
  let schoolIdx = 0;

  supervisors.filter(s => !assignedSupervisorIds.has(s.id)).forEach(s => {
    if (schoolIdx < remainingSchools.length) {
      const school = remainingSchools[schoolIdx];
      results.push({
        supervisor_id: s.id,
        assigned_school_id: school.id,
        rank_achieved: 0, // Forced
      });
      assignedSupervisorIds.add(s.id);
      schoolCapacities.set(school.id, (schoolCapacities.get(school.id) || 0) - 1);
      
      // If school capacity reached, move to next
      if ((schoolCapacities.get(school.id) || 0) === 0) {
        schoolIdx++;
      }
    }
  });

  return results;
}
