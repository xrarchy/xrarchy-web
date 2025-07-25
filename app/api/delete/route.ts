import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('fileUrl');
  const projectName = searchParams.get('projectName');

  if (!fileUrl || !projectName) {
    return NextResponse.json({ error: 'File URL and project name are required' }, { status: 400 });
  }

  const supabase = await createSupabaseClient();
  const fileName = fileUrl.split('/').pop();

  // Delete file from storage
  const { error: storageError } = await supabase.storage
    .from('project-files')
    .remove([`${projectName}/${fileName}`]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  // Delete metadata from database
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('file_url', fileUrl);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
}