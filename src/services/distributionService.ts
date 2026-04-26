import { supabase } from '@/lib/supabase';
import { School, Supervisor, SupervisorWish, DistributionResult } from '@/types/database';

export async function getAllSchools(): Promise<School[]> {
  const { data, error } = await supabase.from('schools').select('*').eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function getAllSupervisors(): Promise<Supervisor[]> {
  const { data, error } = await supabase.from('supervisors').select('*').eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function getSupervisorWishes(): Promise<SupervisorWish[]> {
  const { data, error } = await supabase.from('supervisor_wishes').select('*');
  if (error) throw error;
  return data || [];
}

export async function saveDistributionResults(results: any[]) {
  // Clear old results first (optional, depends on business rule)
  const { error: deleteError } = await supabase.from('distribution_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) throw deleteError;

  const { error } = await supabase.from('distribution_results').insert(results);
  if (error) throw error;
}

export async function getDistributionResults(): Promise<DistributionResult[]> {
  const { data, error } = await supabase
    .from('distribution_results')
    .select(`
      *,
      supervisor:supervisors(*),
      school:schools(*)
    `);
  if (error) throw error;
  return data || [];
}

export async function getSettings() {
  const { data, error } = await supabase.from('distribution_settings').select('*');
  if (error) throw error;
  return data || [];
}
