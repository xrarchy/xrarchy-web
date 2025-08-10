import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    console.log('📱 Mobile Projects API: GET request received');

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

        let projectsQuery;

        if (userProfile.role === 'Admin') {
            // Only Admin can see all projects
            projectsQuery = supabaseAdmin
                .from('projects')
                .select(`
                    *,
                    created_by_profile:profiles!projects_created_by_fkey(email)
                `);
        } else if (userProfile.role === 'User' || userProfile.role === 'Archivist') {
            // User and Archivist can only see projects they're assigned to
            console.log(`📱 Mobile API: Checking assignments for ${userProfile.role} user: ${userData.user.email}`);

            const { data: assignedProjects } = await supabaseAdmin
                .from('project_assignments')
                .select('project_id')
                .eq('assigned_user_id', userId);

            console.log(`📱 Mobile API: Assignment query result:`, assignedProjects);
            const projectIds = assignedProjects?.map(ap => ap.project_id) || [];

            if (projectIds.length === 0) {
                console.log(`📱 Mobile API: ${userProfile.role} user has no assigned projects`);
                return NextResponse.json({
                    success: true,
                    data: {
                        projects: [],
                        userRole: userProfile.role,
                        totalCount: 0
                    }
                });
            }

            console.log(`📱 Mobile API: ${userProfile.role} user assigned to ${projectIds.length} projects:`, projectIds);

            projectsQuery = supabaseAdmin
                .from('projects')
                .select(`
                    *,
                    latitude,
                    longitude,
                    location_name,
                    address,
                    location_description,
                    created_by_profile:profiles!projects_created_by_fkey(email)
                `)
                .in('id', projectIds);
        } else {
            // Unknown role - deny access
            return NextResponse.json({
                success: false,
                error: 'Invalid user role',
                code: 'INVALID_ROLE'
            }, { status: 403 });
        }

        const { data: projects, error: projectsError } = await projectsQuery;

        if (projectsError) {
            console.error('📱 Projects fetch error:', projectsError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch projects',
                code: 'PROJECTS_FETCH_ERROR'
            }, { status: 500 });
        }

        // Get counts for each project
        const projectsWithCounts = await Promise.all(
            (projects || []).map(async (project) => {
                // Get assignment count
                const { count: assignmentCount } = await supabaseAdmin
                    .from('project_assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id);

                // Get file count
                const { count: fileCount } = await supabaseAdmin
                    .from('files')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id);

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
                        email: project.created_by_profile?.email || 'Unknown'
                    },
                    stats: {
                        assignmentCount: assignmentCount || 0,
                        fileCount: fileCount || 0
                    }
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                projects: projectsWithCounts,
                userRole: userProfile.role,
                totalCount: projectsWithCounts.length
            }
        });

    } catch (error) {
        console.error('📱 Mobile Projects API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    console.log('📱 Mobile Projects API: POST request received');

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
        const { name, description, location } = await request.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({
                success: false,
                error: 'Project name is required',
                code: 'MISSING_PROJECT_NAME'
            }, { status: 400 });
        }

        // Validate location fields if provided
        if (location?.latitude !== undefined || location?.longitude !== undefined) {
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);

            if (isNaN(lat) || lat < -90 || lat > 90) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid latitude. Must be between -90 and 90',
                    code: 'INVALID_LATITUDE'
                }, { status: 400 });
            }

            if (isNaN(lng) || lng < -180 || lng > 180) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid longitude. Must be between -180 and 180',
                    code: 'INVALID_LONGITUDE'
                }, { status: 400 });
            }
        }

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

        // Check if user is Admin
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

        if (userProfile.role !== 'Admin') {
            return NextResponse.json({
                success: false,
                error: 'Only Admin users can create projects',
                code: 'INSUFFICIENT_PERMISSIONS'
            }, { status: 403 });
        }

        // Prepare project data
        interface ProjectData {
            name: string;
            description: string | null;
            created_by: string;
            latitude?: number;
            longitude?: number;
            location_name?: string;
            address?: string;
            location_description?: string;
        }

        const projectData: ProjectData = {
            name: name.trim(),
            description: description?.trim() || null,
            created_by: userId
        };

        // Add location data if provided
        if (location) {
            if (location.latitude !== undefined && location.longitude !== undefined) {
                projectData.latitude = parseFloat(location.latitude);
                projectData.longitude = parseFloat(location.longitude);
            }
            if (location.name) {
                projectData.location_name = location.name.trim();
            }
            if (location.address) {
                projectData.address = location.address.trim();
            }
            if (location.description) {
                projectData.location_description = location.description.trim();
            }
        }

        // Create project with all location fields
        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .insert(projectData)
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
            .single();

        if (projectError) {
            console.error('📱 Project creation error:', projectError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to create project',
                code: 'PROJECT_CREATION_ERROR',
                details: projectError.message
            }, { status: 500 });
        }

        // Automatically assign the creator to the project
        const { error: assignmentError } = await supabaseAdmin
            .from('project_assignments')
            .insert({
                project_id: project.id,
                assigned_user_id: userId,
                assigned_by: userId,
                assigned_at: new Date().toISOString()
            });

        if (assignmentError) {
            console.error('📱 Auto-assignment error:', assignmentError.message);
            // Don't fail project creation for assignment error, but log it
            console.warn('📱 Project created but auto-assignment failed:', assignmentError.message);
        }

        // Return project with complete location structure
        return NextResponse.json({
            success: true,
            message: 'Project created successfully',
            data: {
                project: {
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
                    createdBy: userId
                }
            }
        }, { status: 201 });

    } catch (error) {
        console.error('📱 Mobile Create Project API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}