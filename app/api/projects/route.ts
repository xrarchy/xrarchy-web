import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create project
  const { data, error } = await supabase
    .from('projects')
    .insert({ name })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Assign creator as project admin
  const { error: assignmentError } = await supabase
    .from('project_users')
    .insert({
      project_id: data.id,
      user_id: userData.user.id,
      role: 'Admin',
    });

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  return NextResponse.json({ project: data }, { status: 200 });
}