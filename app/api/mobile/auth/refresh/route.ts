import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    console.log('📱 Mobile Refresh Token API: Request received');

    try {
        const { refreshToken } = await request.json();

        if (!refreshToken) {
            return NextResponse.json({
                success: false,
                error: 'Refresh token is required',
                code: 'MISSING_REFRESH_TOKEN'
            }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
        });

        if (error) {
            console.error('📱 Token refresh error:', error.message);

            let errorCode = 'REFRESH_FAILED';
            let userMessage = 'Failed to refresh session';

            if (error.message.toLowerCase().includes('invalid') ||
                error.message.toLowerCase().includes('expired')) {
                errorCode = 'INVALID_REFRESH_TOKEN';
                userMessage = 'Refresh token is invalid or expired. Please login again.';
            }

            return NextResponse.json({
                success: false,
                error: userMessage,
                code: errorCode,
                details: error.message
            }, { status: 401 });
        }

        if (!data.session || !data.user) {
            return NextResponse.json({
                success: false,
                error: 'Failed to refresh session',
                code: 'NO_SESSION_DATA'
            }, { status: 401 });
        }

        // Get updated user profile
        const supabaseAdmin = await createClient(true);
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, email')
            .eq('id', data.user.id)
            .single();

        console.log('📱 Token refresh successful for:', data.user.email);

        return NextResponse.json({
            success: true,
            message: 'Session refreshed successfully',
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    role: profile?.role || 'User',
                    emailConfirmed: !!data.user.email_confirmed_at,
                    createdAt: data.user.created_at
                },
                session: {
                    accessToken: data.session.access_token,
                    refreshToken: data.session.refresh_token,
                    expiresAt: data.session.expires_at,
                    expiresIn: data.session.expires_in
                }
            }
        });

    } catch (error) {
        console.error('📱 Mobile Refresh API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}