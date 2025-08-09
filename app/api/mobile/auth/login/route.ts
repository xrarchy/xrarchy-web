import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    console.log('📱 Mobile Login API: Request received');

    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({
                success: false,
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            console.error('📱 Mobile Login error:', error.message);

            // Mobile-friendly error responses
            let errorCode = 'LOGIN_FAILED';
            let userMessage = 'Login failed. Please try again.';

            if (error.message.toLowerCase().includes('invalid login credentials')) {
                errorCode = 'INVALID_CREDENTIALS';
                userMessage = 'Invalid email or password';
            } else if (error.message.toLowerCase().includes('email not confirmed')) {
                errorCode = 'EMAIL_NOT_CONFIRMED';
                userMessage = 'Please confirm your email before logging in';
            } else if (error.message.toLowerCase().includes('too many requests')) {
                errorCode = 'RATE_LIMITED';
                userMessage = 'Too many login attempts. Please wait before trying again.';
            }

            return NextResponse.json({
                success: false,
                error: userMessage,
                code: errorCode,
                details: error.message
            }, { status: 401 });
        }

        if (!data.user || !data.session) {
            return NextResponse.json({
                success: false,
                error: 'Login failed - no user data received',
                code: 'NO_USER_DATA'
            }, { status: 401 });
        }

        // Get user profile for role information
        const supabaseAdmin = await createClient(true);
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, email')
            .eq('id', data.user.id)
            .single();

        console.log('📱 Mobile Login successful for:', data.user.email);

        return NextResponse.json({
            success: true,
            message: 'Login successful',
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
        console.error('📱 Mobile Login API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}