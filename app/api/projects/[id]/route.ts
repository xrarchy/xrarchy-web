import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const projectId = params.id;

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is global admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profile?.role !== 'Admin') {
    return NextResponse.json({ error: 'Only admins can delete projects' }, { status: 403 });
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 });
}