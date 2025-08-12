import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    console.log('📱 Mobile Browse All Projects API: GET request received');

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50); // Max 50 per page
        const search = url.searchParams.get('search')?.trim() || '';

        const supabaseAdmin = await createClient(true);

        // Verify token and get user
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }, { status: 401 });
        }

        const userId = userData.user.id;

        // Get user role
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            }, { status: 500 });
        }

        // Build query for browsing all projects (regardless of assignment)
        let projectsQuery = supabaseAdmin
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
                created_by_profile:profiles!projects_created_by_fkey(email)
            `, { count: 'exact' });

        // Add search filter if provided
        if (search) {
            projectsQuery = projectsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,location_name.ilike.%${search}%`);
        }

        // Add pagination
        const from = (page - 1) * limit;
        projectsQuery = projectsQuery.range(from, from + limit - 1);

        // Order by creation date (newest first)
        projectsQuery = projectsQuery.order('created_at', { ascending: false });

        const { data: projects, error: projectsError, count } = await projectsQuery;

        console.log('📱 Projects query result:', {
            projectsCount: projects?.length,
            totalCount: count,
            error: projectsError?.message
        });

        if (projectsError) {
            console.error('📱 Browse projects fetch error:', projectsError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch projects',
                code: 'PROJECTS_FETCH_ERROR'
            }, { status: 500 });
        }

        // Get user's assignment status for each project
        const projectIds = (projects || []).map(p => p.id);
        const { data: userAssignments } = await supabaseAdmin
            .from('project_assignments')
            .select('project_id')
            .eq('assigned_user_id', userId)
            .in('project_id', projectIds);

        const assignedProjectIds = new Set(userAssignments?.map(a => a.project_id) || []);

        // Get stats and assigned users for each project
        const projectsWithDetails = await Promise.all(
            (projects || []).map(async (project) => {
                // Get assignment count and assigned users data
                const { data: assignments, count: assignmentCount } = await supabaseAdmin
                    .from('project_assignments')
                    .select(`
                        assigned_user_id,
                        assigned_at,
                        profiles:assigned_user_id (
                            email,
                            role
                        )
                    `, { count: 'exact' })
                    .eq('project_id', project.id);

                // Get file count
                const { count: fileCount } = await supabaseAdmin
                    .from('files')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id);

                // Format assigned users data
                const assignedUsers = (assignments || []).map(assignment => {
                    // Handle case where profiles might be an array or single object
                    const profile = Array.isArray(assignment.profiles) 
                        ? assignment.profiles[0] 
                        : assignment.profiles;
                    
                    return {
                        userId: assignment.assigned_user_id,
                        email: profile?.email || 'Unknown',
                        role: profile?.role || 'Unknown',
                        assignedAt: assignment.assigned_at
                    };
                });

                return {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    location: {
                        latitude: project.latitude,
                        longitude: project.longitude,
                        name: project.location_name,
                        address: project.address,
                        description: project.location_description
                    },
                    createdAt: project.created_at,
                    updatedAt: project.updated_at,
                    createdBy: {
                        email: Array.isArray(project.created_by_profile) ?
                            project.created_by_profile[0]?.email || 'Unknown' :
                            (project.created_by_profile as { email: string })?.email || 'Unknown'
                    },
                    isAssigned: assignedProjectIds.has(project.id),
                    canAccess: userProfile.role === 'Admin' ||
                        userProfile.role === 'User' ||
                        (userProfile.role === 'Archivist' && assignedProjectIds.has(project.id)),
                    assignedUsers: assignedUsers,
                    stats: {
                        assignmentCount: assignmentCount || 0,
                        fileCount: fileCount || 0
                    }
                };
            })
        );

        const totalPages = Math.ceil((count || 0) / limit);

        return NextResponse.json({
            success: true,
            data: {
                projects: projectsWithDetails,
                totalCount: count || 0,
                userRole: userProfile.role,
                pagination: {
                    page,
                    limit,
                    totalProjects: count || 0,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                filters: {
                    search: search || null
                }
            }
        });

    } catch (error) {
        console.error('📱 Mobile Browse Projects API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}
