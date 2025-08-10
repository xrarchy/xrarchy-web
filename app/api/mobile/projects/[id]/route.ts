import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile Project Details API: GET request received for project:', resolvedParams.id);

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
        const projectId = resolvedParams.id;

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

        // Check if user has access to this project
        if (userProfile.role !== 'Admin') {
            const { data: assignment } = await supabaseAdmin
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('assigned_user_id', userId)
                .single();

            if (!assignment) {
                return NextResponse.json({
                    success: false,
                    error: 'You do not have access to this project',
                    code: 'PROJECT_ACCESS_DENIED'
                }, { status: 403 });
            }
        }

        // Get project details with all location fields
        const { data: project, error: projectError } = await supabaseAdmin
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
            .eq('id', projectId)
            .single();

        if (projectError) {
            if (projectError.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Project not found',
                    code: 'PROJECT_NOT_FOUND'
                }, { status: 404 });
            }

            console.error('📱 Project fetch error:', projectError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch project',
                code: 'PROJECT_FETCH_ERROR'
            }, { status: 500 });
        }

        // Get project assignments
        const { data: assignments, error: assignmentsError } = await supabaseAdmin
            .from('project_assignments')
            .select(`
                *,
                assigned_user:profiles!project_assignments_assigned_user_id_fkey(email, role),
                assigned_by_user:profiles!project_assignments_assigned_by_fkey(email)
            `)
            .eq('project_id', projectId);

        if (assignmentsError) {
            console.error('📱 Assignments fetch error:', assignmentsError.message);
        }

        // Get project files
        const { data: files, error: filesError } = await supabaseAdmin
            .from('files')
            .select('*')
            .eq('project_id', projectId);

        if (filesError) {
            console.error('📱 Files fetch error:', filesError.message);
        }

        return NextResponse.json({
            success: true,
            data: {
                project: {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    status: project.status,
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
                    }
                },
                assignments: (assignments || []).map(assignment => ({
                    id: assignment.id,
                    assignedAt: assignment.assigned_at,
                    user: {
                        email: assignment.assigned_user?.email || 'Unknown',
                        role: assignment.assigned_user?.role || 'Unknown'
                    },
                    assignedBy: {
                        email: assignment.assigned_by_user?.email || 'Unknown'
                    }
                })),
                files: (files || []).map(file => ({
                    id: file.id,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadedAt: file.uploaded_at,
                    url: file.url
                })),
                stats: {
                    assignmentCount: assignments?.length || 0,
                    fileCount: files?.length || 0
                }
            }
        });

    } catch (error) {
        console.error('📱 Mobile Project Details API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile Project Update API: PUT request received for project:', resolvedParams.id);

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
        const { name, description, status, location } = await request.json();
        const projectId = resolvedParams.id;

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
                error: 'Only Admin users can update projects',
                code: 'INSUFFICIENT_PERMISSIONS'
            }, { status: 403 });
        }

        // Prepare update data
        const updateData: Record<string, string | number | null> = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (status !== undefined) updateData.status = status;

        // Handle location updates
        if (location) {
            if (location.latitude !== undefined && location.longitude !== undefined) {
                updateData.latitude = parseFloat(location.latitude);
                updateData.longitude = parseFloat(location.longitude);
            }
            if (location.name !== undefined) {
                updateData.location_name = location.name?.trim() || null;
            }
            if (location.address !== undefined) {
                updateData.address = location.address?.trim() || null;
            }
            if (location.description !== undefined) {
                updateData.location_description = location.description?.trim() || null;
            }
        }

        // Update project
        const { data: project, error: updateError } = await supabaseAdmin
            .from('projects')
            .update(updateData)
            .eq('id', projectId)
            .select(`
                id,
                name,
                description,
                status,
                latitude,
                longitude,
                location_name,
                address,
                location_description,
                created_at,
                updated_at
            `)
            .single();

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Project not found',
                    code: 'PROJECT_NOT_FOUND'
                }, { status: 404 });
            }

            console.error('📱 Project update error:', updateError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to update project',
                code: 'PROJECT_UPDATE_ERROR'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Project updated successfully',
            data: {
                project: {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    status: project.status,
                    location: {
                        latitude: project.latitude,
                        longitude: project.longitude,
                        name: project.location_name,
                        address: project.address,
                        description: project.location_description
                    },
                    createdAt: project.created_at,
                    updatedAt: project.updated_at
                }
            }
        });

    } catch (error) {
        console.error('📱 Mobile Project Update API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile Project Delete API: DELETE request received for project:', resolvedParams.id);

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
        const projectId = resolvedParams.id;

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
                error: 'Only Admin users can delete projects',
                code: 'INSUFFICIENT_PERMISSIONS'
            }, { status: 403 });
        }

        // Delete project (cascade will handle related records)
        const { error: deleteError } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (deleteError) {
            console.error('📱 Project deletion error:', deleteError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to delete project',
                code: 'PROJECT_DELETE_ERROR'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (error) {
        console.error('📱 Mobile Project Delete API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}