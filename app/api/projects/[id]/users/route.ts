import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const projectId = params.id;

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('project_users')
    .select('user_id, role, profiles(email)')
    .eq('project_id', projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data }, { status: 200 });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const projectId = params.id;
  const { userId, role } = await request.json();

  if (!userId || !role) {
    return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
  }

  const validRoles = ['Admin', 'Archivist', 'User'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('project_users')
    .insert({
      project_id: parseInt(projectId),
      user_id: userId,
      role,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User added to project' }, { status: 200 });
}
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const projectId = params.id;
  const userId = params.userId;

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('project_users')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User removed from project' }, { status: 200 });
}