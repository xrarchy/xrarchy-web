import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get('projectName');

  if (!projectName) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from('files')
    .select('file_url, file_name')
    .eq('project_name', projectName);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ urls: data }, { status: 200 });
}