'use server';

import { supabase } from '@/lib/supabase';
import { getUser } from './authActions';
import { revalidatePath } from 'next/cache';

export async function getGuidanceData() {
  const user = await getUser();
  if (!user || user.role !== 'guidance') {
    return { error: 'Unauthorized' };
  }

  // Fetch supervisors matching the guidance specialty
  const { data: supervisors, error: supError } = await supabase
    .from('supervisors')
    .select('*')
    .eq('specialty', user.specialty)
    .order('name');

  if (supError) {
    return { error: supError.message };
  }

  // Fetch wishes for these supervisors
  const supIds = supervisors.map(s => s.id);
  
  let wishes = [];
  if (supIds.length > 0) {
    const { data: wishesData, error: wishesError } = await supabase
      .from('supervisor_wishes')
      .select('*')
      .in('supervisor_id', supIds);
      
    if (!wishesError && wishesData) {
      wishes = wishesData;
    }
  }

  // Fetch schools for wish selection
  const { data: schools, error: schoolsError } = await supabase
    .from('schools')
    .select('id, school_name, school_type, stage')
    .eq('is_active', true)
    .order('school_name');

  return { 
    supervisors, 
    wishes, 
    schools: schools || [],
    specialty: user.specialty 
  };
}

export async function updateSupervisorActive(id: string, is_active: boolean) {
  const user = await getUser();
  if (!user || user.role !== 'guidance') return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('supervisors')
    .update({ is_active })
    .eq('id', id)
    .eq('specialty', user.specialty); // security check

  if (error) return { error: error.message };
  revalidatePath('/guidance');
  return { success: true };
}

export async function saveSupervisorWishes(supervisorId: string, wishes: { wish_1?: string, wish_2?: string, wish_3?: string, wish_4?: string, notes?: string }) {
  const user = await getUser();
  if (!user || user.role !== 'guidance') return { error: 'Unauthorized' };

  // check if supervisor belongs to this guidance
  const { data: sup } = await supabase.from('supervisors').select('id').eq('id', supervisorId).eq('specialty', user.specialty).single();
  if (!sup) return { error: 'Unauthorized' };

  const payload = {
    supervisor_id: supervisorId,
    wish_1: wishes.wish_1 || null,
    wish_2: wishes.wish_2 || null,
    wish_3: wishes.wish_3 || null,
    wish_4: wishes.wish_4 || null,
    notes: wishes.notes || null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('supervisor_wishes')
    .upsert(payload, { onConflict: 'supervisor_id' });

  if (error) return { error: error.message };
  revalidatePath('/guidance');
  return { success: true };
}

export async function addSupervisorManually(data: { national_id: string; name: string; phone?: string }) {
  const user = await getUser();
  if (!user || user.role !== 'guidance') return { error: 'غير مصرح لك بهذا الإجراء' };

  const { error } = await supabase.from('supervisors').upsert({
    national_id: data.national_id,
    name: data.name,
    specialty: user.specialty,
    phone: data.phone || null,
    is_active: true,
  }, { onConflict: 'national_id' });

  if (error) return { error: error.message };
  revalidatePath('/guidance');
  return { success: true };
}
