import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        console.log('🧹 Clear confirmation session API called');

        const { preserveAdminSession } = await request.json();

        if (preserveAdminSession) {
            console.log('🔒 Preserving admin session, clearing confirmation session...');

            // Get the current session to see if it's the admin or a newly confirmed user
            const supabase = await createClient();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('❌ Error getting current session:', sessionError);
                return NextResponse.json({ error: 'Failed to get current session' }, { status: 500 });
            }

            if (session?.user) {
                console.log('👤 Current session user:', session.user.email);

                // Check if this is the admin user (you can customize this check)
                const adminEmails = ['dev.salehahmed@gmail.com']; // Add other admin emails as needed
                const isAdmin = session.user.email && adminEmails.includes(session.user.email);

                if (!isAdmin) {
                    console.log('🚫 Non-admin session detected, clearing it...');
                    // Clear the current session (which is the newly confirmed user)
                    await supabase.auth.signOut();

                    // Also try to clear any server-side session data
                    try {
                        const response = NextResponse.json({ success: true, message: 'Non-admin session cleared' });

                        // Clear auth cookies
                        response.cookies.set('sb-access-token', '', {
                            expires: new Date(0),
                            path: '/',
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax'
                        });
                        response.cookies.set('sb-refresh-token', '', {
                            expires: new Date(0),
                            path: '/',
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax'
                        });

                        return response;
                    } catch (cookieError) {
                        console.warn('Failed to clear cookies:', cookieError);
                        return NextResponse.json({ success: true, message: 'Non-admin session cleared' });
                    }
                } else {
                    console.log('✅ Admin session detected, preserving it...');
                    return NextResponse.json({ success: true, message: 'Admin session preserved' });
                }
            } else {
                console.log('ℹ️ No active session found');
                return NextResponse.json({ success: true, message: 'No session to clear' });
            }
        } else {
            console.log('🔄 Clearing all sessions...');
            const supabase = await createClient();
            await supabase.auth.signOut();
            return NextResponse.json({ success: true, message: 'All sessions cleared' });
        }

    } catch (error) {
        console.error('❌ Error clearing confirmation session:', error);
        return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
    }
} 