import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const projectName = formData.get('projectName') as string;

  if (!file || !projectName) {
    return NextResponse.json({ error: 'File and project name are required' }, { status: 400 });
  }

  const supabase = await createSupabaseClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${projectName}/${fileName}`;

  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath);

  // Store metadata in database
  const { error: dbError } = await supabase
    .from('files')
    .insert({
      project_name: projectName,
      file_url: urlData.publicUrl,
      file_name: fileName,
    });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ url: urlData.publicUrl }, { status: 200 });
}