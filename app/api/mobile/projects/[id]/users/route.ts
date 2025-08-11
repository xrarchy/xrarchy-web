import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/mobile/projects/[id]/users - Get all users in project (Mobile)
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Project ID is required'
            }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Get user's role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Profile not found'
            }, { status: 404 });
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
            return NextResponse.json({
                success: false,
                error: 'Access denied'
            }, { status: 403 });
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
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                assignments: assignments || [],
                totalCount: assignments?.length || 0
            }
        });

    } catch (error) {
        console.error('Mobile project users API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// POST /api/mobile/projects/[id]/users - Assign user to project (Mobile - supports both userId and email)
export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { userId, email } = body;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Project ID is required'
            }, { status: 400 });
        }

        if (!userId && !email) {
            return NextResponse.json({
                success: false,
                error: 'Either userId or email is required'
            }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !currentUser) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Check if current user can assign users (Admin or Archivist only)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Profile not found'
            }, { status: 404 });
        }

        const canAssign = profile.role === 'Admin' || profile.role === 'Archivist';

        if (!canAssign) {
            return NextResponse.json({
                success: false,
                error: 'Only Admin and Archivist can assign users'
            }, { status: 403 });
        }

        // Find target user by userId or email
        let targetUserQuery = supabase
            .from('profiles')
            .select('id, email, role');

        if (userId) {
            targetUserQuery = targetUserQuery.eq('id', userId);
        } else if (email) {
            targetUserQuery = targetUserQuery.eq('email', email);
        }

        const { data: targetUser, error: userError } = await targetUserQuery.single();

        if (userError || !targetUser) {
            return NextResponse.json({
                success: false,
                error: email ? `User with email '${email}' not found` : 'User not found'
            }, { status: 404 });
        }

        const targetUserId = targetUser.id;

        // Check if user is already assigned to project
        const { data: existingAssignment } = await supabase
            .from('project_assignments')
            .select('id')
            .eq('project_id', id)
            .eq('assigned_user_id', targetUserId)
            .single();

        if (existingAssignment) {
            return NextResponse.json({
                success: false,
                message: `${targetUser.email} is already assigned to this project`,
                data: {
                    user: {
                        id: targetUser.id,
                        email: targetUser.email,
                        role: targetUser.role
                    }
                }
            }, { status: 400 });
        }

        // Create new assignment
        const { data: newAssignment, error: insertError } = await supabase
            .from('project_assignments')
            .insert({
                project_id: id,
                assigned_user_id: targetUserId,
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
            return NextResponse.json({
                success: false,
                error: insertError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                assignment: newAssignment,
                assignedBy: email ? 'email' : 'userId'
            },
            message: `${targetUser.email} assigned to project successfully`
        });

    } catch (error) {
        console.error('Mobile project user assignment API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// DELETE /api/mobile/projects/[id]/users - Remove user from project (Mobile - supports both userId and email)
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { userId, email } = body;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Project ID is required'
            }, { status: 400 });
        }

        if (!userId && !email) {
            return NextResponse.json({
                success: false,
                error: 'Either userId or email is required'
            }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !currentUser) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Check if current user can remove users (Admin, Archivist, or removing themselves)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Profile not found'
            }, { status: 404 });
        }

        // Find target user by userId or email
        let targetUserQuery = supabase
            .from('profiles')
            .select('id, email, role');

        if (userId) {
            targetUserQuery = targetUserQuery.eq('id', userId);
        } else if (email) {
            targetUserQuery = targetUserQuery.eq('email', email);
        }

        const { data: targetUser, error: userError } = await targetUserQuery.single();

        if (userError || !targetUser) {
            return NextResponse.json({
                success: false,
                error: email ? `User with email '${email}' not found` : 'User not found'
            }, { status: 404 });
        }

        const targetUserId = targetUser.id;

        // Check permissions
        const canRemove = profile.role === 'Admin' ||
            profile.role === 'Archivist' ||
            targetUserId === currentUser.id;

        if (!canRemove) {
            return NextResponse.json({
                success: false,
                error: 'Only Admin, Archivist, or the user themselves can remove assignments'
            }, { status: 403 });
        }

        // Remove user from project
        const { error: deleteError } = await supabase
            .from('project_assignments')
            .delete()
            .eq('project_id', id)
            .eq('assigned_user_id', targetUserId);

        if (deleteError) {
            console.error('Project user removal error:', deleteError);
            return NextResponse.json({
                success: false,
                error: deleteError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                removedUser: {
                    id: targetUser.id,
                    email: targetUser.email,
                    role: targetUser.role
                },
                removedBy: email ? 'email' : 'userId'
            },
            message: `${targetUser.email} removed from project successfully`
        });

    } catch (error) {
        console.error('Mobile project user removal API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
