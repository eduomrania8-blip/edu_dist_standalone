'use server';

import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
  }

  // Fetch user from Supabase
  const { data, error } = await supabase
    .from('users')
    .select('id, username, password_hash, role, specialty')
    .eq('username', username)
    .single();

  if (error || !data) {
    return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  // Simple check for password (in a real app, use bcrypt)
  if (data.password_hash !== password) {
    return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  // Create session data
  const sessionData = {
    id: data.id,
    username: data.username,
    role: data.role,
    specialty: data.specialty,
  };

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });

  return { success: true, role: data.role };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return { success: true };
}

export async function getUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) return null;
  
  try {
    return JSON.parse(sessionCookie.value) as {
      id: string;
      username: string;
      role: 'admin' | 'guidance';
      specialty?: string;
    };
  } catch (error) {
    return null;
  }
}
