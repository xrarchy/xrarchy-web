import { createSupabaseClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        console.log('Manual confirmation attempt for:', email);

        // Use service role to confirm the user directly
        const supabaseAdmin = await createSupabaseClient(true);

        // Find the user by email
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.email_confirmed_at) {
            return NextResponse.json({
                success: true,
                message: 'Email is already confirmed. You can login now.'
            });
        }

        // Manually confirm the user's email
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            email_confirm: true
        });

        if (error) {
            console.error('Manual confirmation error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('Manual confirmation successful for:', email);
        return NextResponse.json({
            success: true,
            message: 'Email confirmed successfully! You can now login.'
        });

    } catch (error) {
        console.error('Manual confirm API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
