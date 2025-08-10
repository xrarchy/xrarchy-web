import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
    try {
        // Check for Authorization header first
        const authHeader = request.headers.get('Authorization');
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            console.log('Browse Projects API: Using bearer token authentication');

            // Use service role client to verify the token
            const serviceSupabase = await createClient(true);
            const { data, error } = await serviceSupabase.auth.getUser(token);

            if (error || !data.user) {
                console.error('Browse Projects API: Invalid bearer token:', error?.message);
                return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
            }

            userId = data.user.id;
            console.log('Browse Projects API: Bearer token valid for user:', data.user.email);
        } else {
            // Fall back to cookie-based session (secure method)
            const supabase = await createClient();
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            console.log('Browse Projects API: User check result:', {
                hasUser: !!user,
                userError: userError?.message,
                userId: user?.id,
                userEmail: user?.email
            });

            if (userError) {
                console.error('Browse Projects API: User error:', userError);
                return NextResponse.json({ error: 'Authentication error: ' + userError.message }, { status: 401 });
            }

            if (!user) {
                console.log('Browse Projects API: No user found');
                return NextResponse.json({ error: 'Unauthorized - No active user session found' }, { status: 401 });
            }

            userId = user.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unable to determine user identity' }, { status: 401 });
        }

        // Use service role client for database operations
        const supabase = await createClient(true);

        // Get user role
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) {
            return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
        }

        let projectsQuery;

        // Get user's assigned projects for reference
        const { data: assignedProjects } = await supabase
            .from('project_assignments')
            .select('project_id')
            .eq('assigned_user_id', userId);

        const assignedProjectIds = assignedProjects?.map(ap => ap.project_id) || [];

        if (userData.role === 'Admin') {
            // Admin can browse all projects
            projectsQuery = supabase
                .from('projects')
                .select(`
                    *,
                    created_by_profile:profiles!projects_created_by_fkey(email)
                `);
        } else if (userData.role === 'User') {
            // Users can browse ALL projects (catalog view) but with read-only access
            projectsQuery = supabase
                .from('projects')
                .select(`
                    *,
                    created_by_profile:profiles!projects_created_by_fkey(email)
                `);
        } else if (userData.role === 'Archivist') {
            // Archivists should use their dedicated assigned projects page, not browse
            return NextResponse.json({
                error: 'Archivists should use their assigned projects page instead of browse'
            }, { status: 403 });
        } else {
            // Unknown role - deny access
            return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
        }

        const { data: projects, error: projectsError } = await projectsQuery;

        if (projectsError) {
            console.error('Browse projects fetch error:', projectsError);
            return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
        }

        // Get counts for each project
        const projectsWithCounts = await Promise.all(
            (projects || []).map(async (project) => {
                // Get assignment count
                const { count: assignmentCount } = await supabase
                    .from('project_assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id);

                // Get file count
                const { count: fileCount } = await supabase
                    .from('files')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id);

                return {
                    ...project,
                    assignment_count: assignmentCount || 0,
                    file_count: fileCount || 0,
                    is_assigned: assignedProjectIds.includes(project.id)
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                projects: projectsWithCounts,
                totalCount: projectsWithCounts.length,
                assignedProjectIds: assignedProjectIds,
                userRole: userData.role
            }
        });

    } catch (error) {
        console.error('Browse Projects API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
