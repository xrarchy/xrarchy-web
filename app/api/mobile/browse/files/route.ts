import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Minimal type for file rows returned from the DB
type FileRow = {
  id: number;
  file_name: string;
  file_size: number | null;
  file_url?: string | null;
  thumbnail_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  height?: number | null;
  rotation?: number | null;
  project_id?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
};

// GET /api/mobile/browse/files - public, read-only (no auth)
export async function GET() {
  try {
    const supabase = await createClient(true);

    const { data: files, error } = await supabase
      .from('files')
      .select(`
          id,
          file_name,
          file_size,
          file_url,
          thumbnail_url,
          latitude,
          longitude,
          height,
          rotation,
          project_id,
          uploaded_by,
          created_at
        `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Mobile browse files fetch error:', error.message || error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch files' },
        { status: 500, headers: { 'x-collection-paused': 'true' } }
      );
    }

  // Create signed URLs for files and thumbnails (best-effort)
  const fileRows = (files || []) as FileRow[];
  const formatted = await Promise.all(fileRows.map(async (file) => {
      let signedUrl: string | null = null;
      let thumbnailSignedUrl: string | null = null;
      try {
        if (file?.file_url) {
          const { data: signedData } = await supabase.storage.from('project-files').createSignedUrl(file.file_url, 3600);
          signedUrl = signedData?.signedUrl || null;
        }
      } catch (e) {
        console.error('Signed URL generation error (file):', file?.file_url, e);
        signedUrl = null;
      }

      try {
        if (file?.thumbnail_url) {
          const { data: thumbData } = await supabase.storage.from('project-files').createSignedUrl(file.thumbnail_url, 3600);
          thumbnailSignedUrl = thumbData?.signedUrl || null;
        }
      } catch (e) {
        console.error('Signed URL generation error (thumbnail):', file?.thumbnail_url, e);
        thumbnailSignedUrl = null;
      }

      return {
        id: file.id,
        file_name: file.file_name,
        file_size: file.file_size,
        file_url: file.file_url,
        thumbnail_url: file.thumbnail_url,
        signedUrl,
        thumbnailSignedUrl,
        latitude: file.latitude,
        longitude: file.longitude,
        height: file.height ?? null,
        rotation: file.rotation ?? null,
        project_id: file.project_id,
        uploaded_by: file.uploaded_by,
        created_at: file.created_at
      };
    }));

    return NextResponse.json(
      { success: true, data: { files: formatted, totalCount: formatted.length } },
      { status: 200, headers: { 'x-collection-paused': 'true' } }
    );
  } catch (err) {
    console.error('Mobile browse files error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: { 'x-collection-paused': 'true' } }
    );
  }
}
