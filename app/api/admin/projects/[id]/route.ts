import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Get single project details (Admin only)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📋 Admin Project Detail API: GET request received for project:', resolvedParams.id);

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

        // Check user role and access
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
        const projectId = resolvedParams.id;

        // Check if user has access to this project
        if (userRole !== 'Admin') {
            // Non-admin users can only access projects they are assigned to
            const { data: assignment, error: assignmentError } = await supabase
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('assigned_user_id', userData.user.id)
                .single();

            if (assignmentError || !assignment) {
                return NextResponse.json({
                    success: false,
                    error: 'Access denied. You are not assigned to this project.',
                    code: 'ACCESS_DENIED'
                }, { status: 403 });
            }
        }

        // Get project with detailed information
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select(`
                id,
                name,
                description,
                created_at,
                updated_at,
                created_by,
                created_by_profile:created_by (
                    email
                ),
                assignments:project_assignments (
                    id,
                    assigned_at,
                    assigned_by,
                    assigned_user:assigned_user_id (
                        id,
                        email
                    ),
                    assigned_by_user:assigned_by (
                        email
                    )
                ),
                files (
                    id,
                    file_name,
                    file_size,
                    created_at,
                    uploaded_by,
                    uploaded_by_user:uploaded_by (
                        email
                    )
                )
            `)
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({
                success: false,
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            }, { status: 404 });
        }

        // Format the response
        const formattedProject = {
            id: project.id,
            name: project.name,
            description: project.description,
            created_at: project.created_at,
            updated_at: project.updated_at,
            created_by: project.created_by,
            created_by_email: project.created_by_profile?.[0]?.email || 'Unknown',
            assignments: project.assignments?.map((assignment) => ({
                id: assignment.id,
                assigned_at: assignment.assigned_at,
                assigned_by: assignment.assigned_by,
                assigned_by_email: assignment.assigned_by_user?.[0]?.email || 'Unknown',
                assigned_user: {
                    id: assignment.assigned_user?.[0]?.id,
                    email: assignment.assigned_user?.[0]?.email || 'Unknown'
                }
            })) || [],
            files: project.files?.map((file) => ({
                id: file.id,
                name: file.file_name,
                size: file.file_size,
                created_at: file.created_at,
                uploaded_by: file.uploaded_by,
                uploaded_by_email: file.uploaded_by_user?.[0]?.email || 'Unknown'
            })) || [],
            stats: {
                assignment_count: project.assignments?.length || 0,
                file_count: project.files?.length || 0,
                total_file_size: project.files?.reduce((sum: number, file) => sum + (file.file_size || 0), 0) || 0
            }
        };

        return NextResponse.json({
            success: true,
            data: {
                project: formattedProject,
                user_role: userRole,
                permissions: {
                    canEdit: userRole === 'Admin' || userRole === 'Archivist',
                    canDelete: userRole === 'Admin',
                    canViewFiles: true,
                    canUploadFiles: userRole === 'Admin' || userRole === 'Archivist',
                    canManageUsers: userRole === 'Admin',
                    isReadOnly: userRole === 'User'
                }
            }
        });

    } catch (error) {
        console.error('📋 Admin Project Detail API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

// PUT - Update project (Admin only)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📋 Admin Project Update API: PUT request received for project:', resolvedParams.id);

    try {
        const { name, description } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Project name is required',
                code: 'MISSING_PROJECT_NAME'
            }, { status: 400 });
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

        // Check user role and edit permissions
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
        const projectId = resolvedParams.id;

        // Check edit permissions
        if (!['Admin', 'Archivist'].includes(userRole)) {
            return NextResponse.json({
                success: false,
                error: 'Only Admin and Archivist users can edit projects',
                code: 'EDIT_PERMISSION_DENIED'
            }, { status: 403 });
        }

        // Non-admin users can only edit projects they are assigned to
        if (userRole !== 'Admin') {
            const { data: assignment, error: assignmentError } = await supabase
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('assigned_user_id', userData.user.id)
                .single();

            if (assignmentError || !assignment) {
                return NextResponse.json({
                    success: false,
                    error: 'You can only edit projects you are assigned to',
                    code: 'ASSIGNMENT_REQUIRED'
                }, { status: 403 });
            }
        }

        // Check if project exists
        const { data: existingProject } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

        if (!existingProject) {
            return NextResponse.json({
                success: false,
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            }, { status: 404 });
        }

        // Update the project
        const { data: updatedProject, error: updateError } = await supabase
            .from('projects')
            .update({
                name: name.trim(),
                description: description?.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .select(`
                id,
                name,
                description,
                created_at,
                updated_at,
                created_by
            `)
            .single();

        if (updateError) {
            console.error('📋 Project update error:', updateError);
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
                project: updatedProject
            }
        });

    } catch (error) {
        console.error('📋 Admin Project Update API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

// DELETE - Delete project (Admin only)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📋 Admin Project Delete API: DELETE request received for project:', resolvedParams.id);

    try {
        const supabase = await createClient();

        // Verify authentication
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            }, { status: 401 });
        }

        // Only Admin can delete projects
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single();

        if (profileError || profile?.role !== 'Admin') {
            return NextResponse.json({
                success: false,
                error: 'Only Admin users can delete projects',
                code: 'ADMIN_REQUIRED_FOR_DELETE'
            }, { status: 403 });
        }

        const projectId = resolvedParams.id;

        // Check if project exists and get file info
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select(`
                id,
                name,
                files (
                    file_url
                )
            `)
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({
                success: false,
                error: 'Project not found',
                code: 'PROJECT_NOT_FOUND'
            }, { status: 404 });
        }

        // Delete associated files from storage first
        if (project.files && project.files.length > 0) {
            const filePaths = project.files.map((file) => file.file_url || '');

            const { error: storageDeleteError } = await supabase.storage
                .from('project-files')
                .remove(filePaths);

            if (storageDeleteError) {
                console.warn('📋 Warning: Some files could not be deleted from storage:', storageDeleteError);
                // Continue with project deletion even if storage cleanup fails
            }
        }

        // Delete the project (this will cascade delete assignments and files due to foreign keys)
        const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (deleteError) {
            console.error('📋 Project deletion error:', deleteError);
            return NextResponse.json({
                success: false,
                error: 'Failed to delete project',
                code: 'PROJECT_DELETE_ERROR'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Project "${project.name}" deleted successfully`,
            data: {
                deleted_project_id: projectId,
                deleted_project_name: project.name
            }
        });

    } catch (error) {
        console.error('📋 Admin Project Delete API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}
