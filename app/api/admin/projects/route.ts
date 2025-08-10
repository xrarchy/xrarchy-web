import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Type definitions
interface Profile {
    email: string;
}

// GET - Get all projects (Admin only)
export async function GET() {
    console.log('📋 Admin Projects API: GET request received');

    try {
        const supabase = await createClient();

        // Verify admin access
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            }, { status: 401 });
        }

        // Check user role and determine access level
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Profile not found',
                code: 'PROFILE_NOT_FOUND'
            }, { status: 404 });
        }

        const userRole = profile.role;

        // Determine access level based on role
        if (!['Admin', 'Archivist', 'User'].includes(userRole)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid user role',
                code: 'INVALID_ROLE'
            }, { status: 403 });
        }

        let projectsQuery;

        if (userRole === 'Admin') {
            // Admin can see all projects
            projectsQuery = supabase
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
                    created_by,
                    created_by_profile:created_by (
                        email
                    ),
                    assignments:project_assignments (
                        id,
                        assigned_user_id,
                        assigned_user:assigned_user_id (
                            email
                        )
                    ),
                    files (
                        id,
                        file_size
                    )
                `);
        } else {
            // Archivist and User can only see projects they are assigned to
            projectsQuery = supabase
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
                    created_by,
                    created_by_profile:created_by (
                        email
                    ),
                    assignments:project_assignments!inner (
                        id,
                        assigned_user_id,
                        assigned_user:assigned_user_id (
                            email
                        )
                    ),
                    files (
                        id,
                        file_size
                    )
                `)
                .eq('assignments.assigned_user_id', userData.user.id);
        }

        const { data: projects, error: projectsError } = await projectsQuery.order('created_at', { ascending: false });

        if (projectsError) {
            console.error('📋 Projects fetch error:', projectsError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch projects',
                code: 'PROJECTS_FETCH_ERROR'
            }, { status: 500 });
        }

        // Format the response
        const formattedProjects = projects?.map((project) => ({
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
            created_at: project.created_at,
            updated_at: project.updated_at,
            created_by: project.created_by,
            created_by_email: (project.created_by_profile?.[0] as Profile)?.email || 'Unknown',
            assignment_count: project.assignments?.length || 0,
            file_count: project.files?.length || 0,
            total_file_size: project.files?.reduce((sum: number, file) => sum + (file.file_size || 0), 0) || 0,
            assigned_users: project.assignments?.map((assignment) => ({
                id: assignment.assigned_user_id,
                email: (assignment.assigned_user?.[0] as Profile)?.email || 'Unknown'
            })) || []
        })) || [];

        return NextResponse.json({
            success: true,
            data: {
                projects: formattedProjects,
                total_count: formattedProjects.length,
                user_role: userRole,
                permissions: {
                    canCreate: userRole === 'Admin',
                    canEditAll: userRole === 'Admin',
                    canDeleteAll: userRole === 'Admin',
                    canEditAssigned: ['Admin', 'Archivist'].includes(userRole),
                    canViewAll: userRole === 'Admin',
                    canViewAssigned: true
                }
            }
        });

    } catch (error) {
        console.error('📋 Admin Projects API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    console.log('📋 Admin Projects API: POST request received');

    try {
        const {
            name,
            description,
            location
        } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Project name is required',
                code: 'MISSING_PROJECT_NAME'
            }, { status: 400 });
        }

        // Validate coordinates if provided
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

        const supabase = await createClient();

        // Verify admin access
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            }, { status: 401 });
        }

        // Only Admin can create projects
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single();

        if (profileError || profile?.role !== 'Admin') {
            return NextResponse.json({
                success: false,
                error: 'Only Admin users can create projects',
                code: 'ADMIN_REQUIRED_FOR_CREATE'
            }, { status: 403 });
        }

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

        // Create the project with geolocation
        const projectData: ProjectData = {
            name: name.trim(),
            description: description?.trim() || null,
            created_by: userData.user.id
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

        const { data: project, error: createError } = await supabase
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

        if (createError) {
            console.error('📋 Project creation error:', createError);
            return NextResponse.json({
                success: false,
                error: 'Failed to create project',
                code: 'PROJECT_CREATE_ERROR'
            }, { status: 500 });
        }

        // Auto-assign the creating admin to the project
        try {
            await supabase
                .from('project_assignments')
                .insert({
                    project_id: project.id,
                    assigned_user_id: userData.user.id,
                    assigned_by: userData.user.id,
                    assigned_at: new Date().toISOString()
                });
            console.log('✅ Auto-assigned creating admin to project');
        } catch (assignmentError) {
            console.error('⚠️ Failed to auto-assign admin to project:', assignmentError);
            // Don't fail the project creation for assignment error
        }

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
                    created_at: project.created_at,
                    updated_at: project.updated_at,
                    created_by: project.created_by
                }
            }
        }, { status: 201 });

    } catch (error) {
        console.error('📋 Admin Projects API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}
