import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({
                isLoggedIn: false,
                user: null
            });
        }

        return NextResponse.json({
            isLoggedIn: true,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({
            isLoggedIn: false,
            user: null
        });
    }
}

export async function POST(request: Request) {
    try {
        const { accessToken, refreshToken } = await request.json();

        if (!accessToken || !refreshToken) {
            return NextResponse.json({ error: 'Access token and refresh token required' }, { status: 400 });
        }

        // Verify the session with Supabase
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        if (error || !user) {
            console.log('Session verification failed:', error?.message);
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Set custom cookies for server-side authentication
        const cookieStore = await cookies();
        cookieStore.set('sb-access-token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        cookieStore.set('sb-refresh-token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        cookieStore.set('sb-user-id', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Session establishment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        // Clear authentication cookies
        const cookieStore = await cookies();
        cookieStore.delete('sb-access-token');
        cookieStore.delete('sb-refresh-token');
        cookieStore.delete('sb-user-id');

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Session clear error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

