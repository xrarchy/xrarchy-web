import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/projects/[id]/users - Get all users in project
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

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get user's role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
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
                .eq('assigned_user_id', session.user.id)
                .single();

            hasAccess = !!assignment;
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get all users in the project
        const { data: assignments, error } = await supabase
            .from('project_assignments')
            .select(`
                id,
                project_role,
                assigned_at,
                assigned_user:profiles!project_assignments_assigned_user_id_fkey(
                    id,
                    email,
                    role
                )
            `)
            .eq('project_id', id);

        if (error) {
            console.error('Project assignments fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ assignments: assignments || [] });

    } catch (error) {
        console.error('Project users API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/users - Assign user to project
export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { userId, role = 'Member' } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const validRoles = ['Project Lead', 'Member', 'Viewer'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if current user can assign users (Admin, project creator, or Project Lead)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        let canAssign = profile.role === 'Admin';

        if (!canAssign) {
            const { data: project } = await supabase
                .from('projects')
                .select('created_by')
                .eq('id', id)
                .single();

            if (project?.created_by === session.user.id) {
                canAssign = true;
            } else {
                const { data: assignment } = await supabase
                    .from('project_assignments')
                    .select('project_role')
                    .eq('project_id', id)
                    .eq('assigned_user_id', session.user.id)
                    .single();

                canAssign = assignment?.project_role === 'Project Lead';
            }
        }

        if (!canAssign) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Check if user exists
        const { data: targetUser, error: userError } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('id', userId)
            .single();

        if (userError || !targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user is already assigned to project
        const { data: existingAssignment } = await supabase
            .from('project_assignments')
            .select('id, project_role')
            .eq('project_id', id)
            .eq('assigned_user_id', userId)
            .single();

        if (existingAssignment) {
            // Update existing assignment
            const { data: updatedAssignment, error: updateError } = await supabase
                .from('project_assignments')
                .update({
                    project_role: role,
                    assigned_at: new Date().toISOString()
                })
                .eq('id', existingAssignment.id)
                .select(`
                    id,
                    project_role,
                    assigned_at,
                    assigned_user:profiles!project_assignments_assigned_user_id_fkey(id, email, role)
                `)
                .single();

            if (updateError) {
                console.error('Project assignment update error:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                assignment: updatedAssignment,
                message: `User role updated to ${role}`
            });
        } else {
            // Create new assignment
            const { data: newAssignment, error: insertError } = await supabase
                .from('project_assignments')
                .insert({
                    project_id: id,
                    assigned_user_id: userId,
                    project_role: role,
                    assigned_by: session.user.id,
                    assigned_at: new Date().toISOString()
                })
                .select(`
                    id,
                    project_role,
                    assigned_at,
                    assigned_user:profiles!project_assignments_assigned_user_id_fkey(id, email, role)
                `)
                .single();

            if (insertError) {
                console.error('Project assignment error:', insertError);
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                assignment: newAssignment,
                message: `User assigned to project as ${role}`
            });
        }

    } catch (error) {
        console.error('Project user assignment API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/projects/[id]/users - Remove user from project
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { userId } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if current user can remove users (Admin, project creator, or Project Lead)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        let canRemove = profile.role === 'Admin';

        if (!canRemove) {
            const { data: project } = await supabase
                .from('projects')
                .select('created_by')
                .eq('id', id)
                .single();

            if (project?.created_by === session.user.id) {
                canRemove = true;
            } else {
                const { data: assignment } = await supabase
                    .from('project_assignments')
                    .select('project_role')
                    .eq('project_id', id)
                    .eq('assigned_user_id', session.user.id)
                    .single();

                canRemove = assignment?.project_role === 'Project Lead';
            }
        }

        // Users can also remove themselves from projects
        if (!canRemove && userId === session.user.id) {
            canRemove = true;
        }

        if (!canRemove) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Remove user from project
        const { error } = await supabase
            .from('project_assignments')
            .delete()
            .eq('project_id', id)
            .eq('assigned_user_id', userId);

        if (error) {
            console.error('Project user removal error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'User removed from project successfully'
        });

    } catch (error) {
        console.error('Project user removal API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
