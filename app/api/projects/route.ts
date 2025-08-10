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
            // Fall back to cookie-based session (secure method)
            const supabase = await createClient();
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            console.log('Projects API: User check result:', {
                hasUser: !!user,
                userError: userError?.message,
                userId: user?.id,
                userEmail: user?.email
            });

            if (userError) {
                console.error('Projects API: User error:', userError);
                return NextResponse.json({ error: 'Authentication error: ' + userError.message }, { status: 401 });
            }

            if (!user) {
                console.log('Projects API: No user found');
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

        if (userData.role === 'Admin') {
            // Admin can see all projects
            projectsQuery = supabase
                .from('projects')
                .select(`
          *,
          created_by_profile:profiles!projects_created_by_fkey(email)
        `);
        } else if (userData.role === 'User' || userData.role === 'Archivist') {
            // User and Archivist can only see projects they're assigned to
            const { data: assignedProjects } = await supabase
                .from('project_assignments')
                .select('project_id')
                .eq('assigned_user_id', userId);

            const projectIds = assignedProjects?.map(ap => ap.project_id) || [];

            if (projectIds.length === 0) {
                // No assigned projects - return empty array
                return NextResponse.json({
                    success: true,
                    data: {
                        projects: [],
                        totalCount: 0
                    }
                });
            }

            projectsQuery = supabase
                .from('projects')
                .select(`
          *,
          created_by_profile:profiles!projects_created_by_fkey(email)
        `)
                .in('id', projectIds);
        } else {
            // Unknown role - deny access
            return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
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
            // Fall back to cookie-based session (secure method)
            const supabase = await createClient();
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            userId = user.id;
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

        // Automatically assign the creator to the project
        const { error: assignmentError } = await supabase
            .from('project_assignments')
            .insert({
                project_id: project.id,
                assigned_user_id: userId,
                assigned_by: userId,
                assigned_at: new Date().toISOString()
            });

        if (assignmentError) {
            console.error('Auto-assignment error:', assignmentError);
            // Don't fail the project creation if assignment fails
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
            // Fall back to cookie-based session (secure method)
            const supabase = await createClient();
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            userId = user.id;
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

