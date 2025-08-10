import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        message: 'Admin API is working. Use POST method for actions.',
        availableActions: ['getUserRole', 'getUsers', 'updateUserRole']
    });
}

export async function POST(request: Request) {
    try {
        let requestBody;
        try {
            const text = await request.text();
            if (!text.trim()) {
                console.error('Empty request body received');
                return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
            }
            requestBody = JSON.parse(text);
        } catch (jsonError) {
            console.error('Invalid JSON in request body:', jsonError);
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        const { action, userId, role } = requestBody;
        console.log('Admin API called with action:', action);

        // For getUserRole action, we don't need admin access
        if (action === 'getUserRole') {
            if (!userId) {
                return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
            }

            const supabase = await createClient();
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (!profile) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({ role: profile.role });
        }

        // For all other actions, verify admin access
        const supabase = await createClient();
        const { data: userData } = await supabase.auth.getUser();
        console.log('Current user data:', userData.user?.id, userData.user?.email);

        if (!userData.user) {
            console.log('No user found in request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if current user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single();

        console.log('Current user profile:', profile);

        if (profile?.role !== 'Admin') {
            console.log('User is not admin, role:', profile?.role);
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('Admin access verified, proceeding with action:', action);

        // Use service role for admin operations
        const supabaseAdmin = await createClient(true);

        switch (action) {
            case 'checkAccess':
                // If we reach here, admin access is already verified
                return NextResponse.json({
                    success: true,
                    user: {
                        id: userData.user.id,
                        email: userData.user.email,
                        role: profile.role
                    }
                });

            case 'updateRole':
                if (!userId || !role) {
                    return NextResponse.json({ error: 'UserId and role are required' }, { status: 400 });
                }

                const { error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update({ role })
                    .eq('id', userId);

                if (updateError) {
                    return NextResponse.json({ error: updateError.message }, { status: 500 });
                }

                return NextResponse.json({ success: true });

            case 'deleteUser':
                if (!userId) {
                    return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
                }

                // Can't delete yourself
                if (userId === userData.user.id) {
                    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
                }

                // Delete from profiles first
                const { error: profileDeleteError } = await supabaseAdmin
                    .from('profiles')
                    .delete()
                    .eq('id', userId);

                if (profileDeleteError) {
                    return NextResponse.json({ error: profileDeleteError.message }, { status: 500 });
                }

                // Delete from auth.users
                const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

                if (authDeleteError) {
                    console.error('Auth delete error:', authDeleteError);
                    return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
                }

                return NextResponse.json({ success: true });

            case 'getUsers':
                console.log('Getting users...');
                const { data: users, error: usersError } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email, role, created_at')
                    .order('created_at', { ascending: false });

                console.log('Users query result:', users, 'Error:', usersError);

                if (usersError) {
                    console.error('Users query error:', usersError);
                    return NextResponse.json({ error: usersError.message }, { status: 500 });
                }

                // Get email confirmation status for each user
                console.log('Getting email confirmation status for users...');
                const usersWithStatus = await Promise.all(
                    users.map(async (user) => {
                        try {
                            const { data: authData } = await supabaseAdmin.auth.admin.getUserById(user.id);
                            return {
                                ...user,
                                email_confirmed_at: authData.user?.email_confirmed_at
                            };
                        } catch (authError) {
                            console.error('Error getting auth data for user:', user.id, authError);
                            return {
                                ...user,
                                email_confirmed_at: null
                            };
                        }
                    })
                );

                console.log('Final users with status:', usersWithStatus);
                return NextResponse.json({ users: usersWithStatus });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

