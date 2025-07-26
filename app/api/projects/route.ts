import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
    try {
        // Check for Authorization header first
        const authHeader = request.headers.get('Authorization');
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            console.log('Projects API: Using bearer token authentication');

            // Use service role client to verify the token
            const serviceSupabase = await createClient(true);
            const { data, error } = await serviceSupabase.auth.getUser(token);

            if (error || !data.user) {
                console.error('Projects API: Invalid bearer token:', error?.message);
                return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
            }

            userId = data.user.id;
            console.log('Projects API: Bearer token valid for user:', data.user.email);
        } else {
            // Fall back to cookie-based session
            const supabase = await createClient();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            console.log('Projects API: Session check result:', {
                hasSession: !!session,
                sessionError: sessionError?.message,
                userId: session?.user?.id,
                userEmail: session?.user?.email
            });

            if (sessionError) {
                console.error('Projects API: Session error:', sessionError);
                return NextResponse.json({ error: 'Authentication error: ' + sessionError.message }, { status: 401 });
            }

            if (!session) {
                console.log('Projects API: No session found');
                return NextResponse.json({ error: 'Unauthorized - No active session found' }, { status: 401 });
            }

            userId = session.user.id;
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

        if (userData.role === 'Admin') {
            // Admin can see all projects
            projectsQuery = supabase
                .from('projects')
                .select(`
          *,
          created_by_profile:profiles!projects_created_by_fkey(email)
        `);
        } else {
            // Non-admin users can only see projects they're assigned to
            const { data: assignedProjects } = await supabase
                .from('project_assignments')
                .select('project_id')
                .eq('assigned_to', userId);

            const projectIds = assignedProjects?.map(ap => ap.project_id) || [];

            projectsQuery = supabase
                .from('projects')
                .select(`
          *,
          created_by_profile:profiles!projects_created_by_fkey(email)
        `)
                .in('id', projectIds);
        }

        const { data: projects, error: projectsError } = await projectsQuery;

        if (projectsError) {
            console.error('Projects fetch error:', projectsError);
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
                    file_count: fileCount || 0
                };
            })
        );

        return NextResponse.json({
            projects: projectsWithCounts,
            userRole: userData.role
        });

    } catch (error) {
        console.error('Projects API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check for Authorization header first
        const authHeader = request.headers.get('Authorization');
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            // Use service role client to verify the token
            const serviceSupabase = await createClient(true);
            const { data, error } = await serviceSupabase.auth.getUser(token);

            if (error || !data.user) {
                return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
            }

            userId = data.user.id;
        } else {
            // Fall back to cookie-based session
            const supabase = await createClient();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            userId = session.user.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unable to determine user identity' }, { status: 401 });
        }

        // Use service role client for database operations
        const supabase = await createClient(true);

        // Check if user is Admin (only Admin can create projects)
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) {
            return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
        }

        if (userData.role !== 'Admin') {
            return NextResponse.json({ error: 'Only Admin can create projects' }, { status: 403 });
        }

        const { name, description } = await request.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }

        // Create project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                created_by: userId
            })
            .select()
            .single();

        if (projectError) {
            console.error('Project creation error:', projectError);
            return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
        }

        return NextResponse.json({
            project,
            message: 'Project created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Create project API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Check for Authorization header first
        const authHeader = request.headers.get('Authorization');
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            // Use service role client to verify the token
            const serviceSupabase = await createClient(true);
            const { data, error } = await serviceSupabase.auth.getUser(token);

            if (error || !data.user) {
                return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
            }

            userId = data.user.id;
        } else {
            // Fall back to cookie-based session
            const supabase = await createClient();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            userId = session.user.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unable to determine user identity' }, { status: 401 });
        }

        // Use service role client for database operations
        const supabase = await createClient(true);

        // Check if user is Admin
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError) {
            return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
        }

        if (userData.role !== 'Admin') {
            return NextResponse.json({ error: 'Only Admin can delete projects' }, { status: 403 });
        }

        const { projectIds } = await request.json();

        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return NextResponse.json({ error: 'Project IDs are required' }, { status: 400 });
        }

        // Delete projects (cascade will handle related records)
        const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .in('id', projectIds);

        if (deleteError) {
            console.error('Project deletion error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete projects' }, { status: 500 });
        }

        return NextResponse.json({
            message: `${projectIds.length} project(s) deleted successfully`
        });

    } catch (error) {
        console.error('Delete projects API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

