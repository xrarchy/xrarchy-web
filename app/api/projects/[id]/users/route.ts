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

        // Get current user
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

        // Get all users in the project
        const { data: assignments, error } = await supabase
            .from('project_assignments')
            .select(`
                id,
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
        const { userId } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !currentUser) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if current user can assign users (Admin or Archivist only)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const canAssign = profile.role === 'Admin' || profile.role === 'Archivist';

        if (!canAssign) {
            return NextResponse.json({ error: 'Only Admin and Archivist can assign users' }, { status: 403 });
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
            .select('id')
            .eq('project_id', id)
            .eq('assigned_user_id', userId)
            .single();

        if (existingAssignment) {
            return NextResponse.json({
                success: false,
                message: 'User is already assigned to this project'
            }, { status: 400 });
        } else {
            // Create new assignment
            const { data: newAssignment, error: insertError } = await supabase
                .from('project_assignments')
                .insert({
                    project_id: id,
                    assigned_user_id: userId,
                    assigned_by: currentUser.id,
                    assigned_at: new Date().toISOString()
                })
                .select(`
                    id,
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
                message: 'User assigned to project successfully'
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

        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !currentUser) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if current user can remove users (Admin, Archivist, or removing themselves)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const canRemove = profile.role === 'Admin' || profile.role === 'Archivist' || userId === currentUser.id;

        if (!canRemove) {
            return NextResponse.json({ error: 'Only Admin, Archivist, or the user themselves can remove assignments' }, { status: 403 });
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
