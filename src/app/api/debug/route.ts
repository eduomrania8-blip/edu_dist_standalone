import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const { data } = await supabaseAdmin.from('teachers').select('subject');
  const distinct = new Set(data?.map(d => d.subject?.trim()));
  return NextResponse.json(Array.from(distinct).filter(Boolean));
}
