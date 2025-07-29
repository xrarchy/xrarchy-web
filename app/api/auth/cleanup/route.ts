import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('=== Auth Cleanup Request ===');

    const { email } = await request.json();
    console.log('Cleanup request for email:', email);

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseAdmin = await createClient(true);

    try {
        // Get current user session to verify admin access
        const { error: sessionError } = await supabaseAdmin.auth.getSession();
        if (sessionError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find the auth user by email
        console.log('Finding auth user by email...');
        const { data: authUsers, error: authListError } = await supabaseAdmin.auth.admin.listUsers();

        if (authListError) {
            console.error('Error listing auth users:', authListError.message);
            return NextResponse.json({ error: 'Failed to list auth users' }, { status: 500 });
        }

        const authUser = authUsers.users.find((user: { email?: string }) => user.email === email);
        if (!authUser) {
            console.log('No auth user found with email:', email);
            return NextResponse.json({ error: 'No auth user found with this email' }, { status: 404 });
        }

        console.log('Found auth user:', authUser.id, authUser.email);

        // Check if user has a profile (should be missing for orphaned users)
        const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();

        if (profileCheckError) {
            console.error('Profile check error:', profileCheckError.message);
            return NextResponse.json({ error: 'Error checking profile' }, { status: 500 });
        }

        if (existingProfile) {
            console.log('User has a profile, this is not an orphaned user');
            return NextResponse.json({ error: 'User has a profile - use normal deletion process' }, { status: 400 });
        }

        // Delete the orphaned auth user
        console.log('Deleting orphaned auth user:', authUser.id);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);

        if (deleteError) {
            console.error('Error deleting auth user:', deleteError.message);
            return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 });
        }

        console.log('Successfully deleted orphaned auth user:', email);
        return NextResponse.json({
            message: 'Orphaned auth user deleted successfully',
            deletedEmail: email,
            deletedUserId: authUser.id
        }, { status: 200 });

    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Failed to cleanup auth user' }, { status: 500 });
    }
}

