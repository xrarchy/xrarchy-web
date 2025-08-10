import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/projects/[id] - Get project details
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user (secure method)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get user's role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Check if user has access to this project
        let hasAccess = profile.role === 'Admin';

        if (!hasAccess) {
            const { data: assignment } = await supabase
                .from('project_assignments')
                .select('id')
                .eq('project_id', id)
                .eq('assigned_user_id', user.id)
                .single();

            hasAccess = !!assignment;
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get project with additional details - simplified query to avoid FK issues
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Project fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        // Get created_by profile separately
        const { data: createdByProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', project.created_by)
            .single();

        // Get assignments separately
        const { data: assignments } = await supabase
            .from('project_assignments')
            .select(`
                id,
                assigned_at,
                assigned_user_id,
                assigned_by
            `)
            .eq('project_id', id);

        // Get assigned user details for each assignment
        const assignmentsWithUsers = [];
        if (assignments) {
            for (const assignment of assignments) {
                const { data: assignedUser } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .eq('id', assignment.assigned_user_id)
                    .single();

                const { data: assignedByUser } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', assignment.assigned_by)
                    .single();

                assignmentsWithUsers.push({
                    id: assignment.id,
                    assigned_at: assignment.assigned_at,
                    assigned_user: assignedUser || { id: assignment.assigned_user_id, email: 'Unknown' },
                    assigned_by_user: assignedByUser || { email: 'Unknown' }
                });
            }
        }

        // Get files separately
        const { data: files } = await supabase
            .from('files')
            .select(`
                id,
                file_name,
                file_size,
                created_at,
                uploaded_by
            `)
            .eq('project_id', id);

        // Get uploaded_by user details for each file
        const filesWithUsers = [];
        if (files) {
            for (const file of files) {
                const { data: uploadedByUser } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', file.uploaded_by)
                    .single();

                filesWithUsers.push({
                    id: file.id,
                    name: file.file_name,
                    size: file.file_size,
                    created_at: file.created_at,
                    uploaded_by_user: uploadedByUser || { email: 'Unknown' }
                });
            }
        }

        // Combine all data
        const projectWithDetails = {
            ...project,
            created_by_profile: createdByProfile || { email: 'Unknown' },
            assignments: assignmentsWithUsers,
            files: filesWithUsers
        };

        return NextResponse.json({ project: projectWithDetails });

    } catch (error) {
        console.error('Project API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const {
            name,
            description,
            location_name,
            address,
            location_description,
            latitude,
            longitude
        } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user (secure method)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get user's role and check permissions
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Check if user can edit this project (Admin, creator, or Project Lead)
        let canEdit = profile.role === 'Admin';

        if (!canEdit) {
            const { data: project } = await supabase
                .from('projects')
                .select('created_by')
                .eq('id', id)
                .single();

            if (project?.created_by === user.id) {
                canEdit = true;
            }
            // Removed project role logic - only Admin and project creator can edit
        }

        if (!canEdit) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Prepare update data
        interface ProjectUpdateData {
            name: string;
            description: string | null;
            updated_at: string;
            location_name?: string | null;
            address?: string | null;
            location_description?: string | null;
            latitude?: number;
            longitude?: number;
        }

        const updateData: ProjectUpdateData = {
            name: name.trim(),
            description: description?.trim() || null,
            updated_at: new Date().toISOString()
        };

        // Add location fields if provided
        if (location_name !== undefined) {
            updateData.location_name = location_name?.trim() || null;
        }
        if (address !== undefined) {
            updateData.address = address?.trim() || null;
        }
        if (location_description !== undefined) {
            updateData.location_description = location_description?.trim() || null;
        }
        if (latitude !== undefined && latitude !== '') {
            updateData.latitude = parseFloat(latitude);
        }
        if (longitude !== undefined && longitude !== '') {
            updateData.longitude = parseFloat(longitude);
        }

        // Update the project
        const { data: updatedProject, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Project update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            project: updatedProject,
            message: 'Project updated successfully'
        });

    } catch (error) {
        console.error('Project update API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/projects/[id] - Delete specific project
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user (secure method)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is Admin or project creator
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        let canDelete = profile.role === 'Admin';

        if (!canDelete) {
            const { data: project } = await supabase
                .from('projects')
                .select('created_by')
                .eq('id', id)
                .single();

            canDelete = project?.created_by === user.id;
        }

        if (!canDelete) {
            return NextResponse.json({ error: 'Only Admin or project creator can delete projects' }, { status: 403 });
        }

        // Delete the project (cascades to project_users and project_files)
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Project deletion error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (error) {
        console.error('Project deletion API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
