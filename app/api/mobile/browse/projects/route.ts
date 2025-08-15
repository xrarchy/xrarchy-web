import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/mobile/browse/projects - public, read-only (no auth)
export async function GET() {
  try {
    const supabase = await createClient(true);

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
          id,
          name,
          description,
          latitude,
          longitude,
          location_name,
          address,
          location_description,
          created_at,
          updated_at,
          created_by
        `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Mobile browse projects fetch error:', error.message || error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects' },
        { status: 500, headers: { 'x-collection-paused': 'true' } }
      );
    }

    return NextResponse.json(
      { success: true, data: { projects: projects || [], totalCount: (projects || []).length } },
      { status: 200, headers: { 'x-collection-paused': 'true' } }
    );
  } catch (err) {
    console.error('Mobile browse projects error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: { 'x-collection-paused': 'true' } }
    );
  }
}
