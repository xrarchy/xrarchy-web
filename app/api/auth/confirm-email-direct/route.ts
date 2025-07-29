import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        console.log('📧 Direct email confirmation API called');

        const { searchParams } = new URL(request.url);
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        const code = searchParams.get('code');
        const type = searchParams.get('type');
        const error = searchParams.get('error');
        const error_code = searchParams.get('error_code');
        const error_description = searchParams.get('error_description');
        const no_auto_signin = searchParams.get('no_auto_signin');
        const prevent_session = searchParams.get('prevent_session');

        console.log('URL parameters received:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
            hasCode: !!code,
            type,
            error,
            error_code,
            error_description,
            no_auto_signin,
            prevent_session
        });

        // Handle errors from Supabase
        if (error) {
            console.log('❌ Supabase error:', { error, error_code, error_description });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent(error)}&error_code=${encodeURIComponent(error_code || '')}&error_description=${encodeURIComponent(error_description || '')}`
            );
        }

        if (type && type !== 'signup') {
            console.log('❌ Invalid type:', type);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent('Invalid confirmation type')}`
            );
        }

        // Check if we have either tokens or code
        if (!access_token && !code) {
            console.log('❌ Missing tokens or code');
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent('Missing confirmation tokens')}`
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Create a temporary client for verification
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('🔍 Verifying confirmation...');
        let verifyData: { user?: { id: string; email?: string } } | null = null;
        let verifyError: (Error & { code?: string }) | null = null;

        if (code) {
            // Use code-based confirmation (Supabase standard)
            console.log('🔑 Using code-based confirmation...');

            try {
                // Method 1: Try verifyOtp with code as token_hash
                const { data, error } = await tempClient.auth.verifyOtp({
                    token_hash: code,
                    type: 'signup'
                });
                verifyData = data;
                verifyError = error;
            } catch {
                console.log('OTP verification failed, trying alternative method...');

                // Method 2: Try to exchange the code for a session
                try {
                    const { data, error } = await tempClient.auth.exchangeCodeForSession(code);
                    verifyData = data;
                    verifyError = error;
                } catch (exchangeError) {
                    console.log('Code exchange failed:', exchangeError);
                    verifyError = exchangeError;
                }
            }
        } else if (access_token) {
            // Use token-based confirmation
            console.log('🔑 Using token-based confirmation...');

            try {
                const { data, error } = await tempClient.auth.verifyOtp({
                    token_hash: access_token,
                    type: 'signup'
                });
                verifyData = data;
                verifyError = error;
            } catch (tokenError) {
                console.log('Token verification failed:', tokenError);
                verifyError = tokenError;
            }
        }

        if (verifyError) {
            console.log('❌ Confirmation verification failed:', verifyError);

            // Check if it's an expired token
            if (verifyError.code === 'otp_expired' || verifyError.message?.includes('expired')) {
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent('Email confirmation link has expired. Please request a new confirmation email.')}&error_code=expired`
                );
            }

            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent(verifyError.message || 'Invalid or expired confirmation tokens.')}`
            );
        }

        if (!verifyData?.user) {
            console.log('❌ No user data in verification response');
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent('Invalid confirmation response')}`
            );
        }

        // Use admin API to confirm the email
        const { createClient: createServerClient } = await import('@/utils/supabase/server');
        const supabaseAdmin = await createServerClient(true);

        console.log('🔧 Confirming email using admin API...');
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            verifyData.user.id,
            { email_confirm: true }
        );

        if (confirmError) {
            console.log('❌ Admin confirmation failed:', confirmError);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent('Failed to confirm email')}`
            );
        }

        console.log('✅ Email confirmed successfully');

        // Always redirect to confirmation page without setting session
        console.log('🚫 Auto signin disabled - redirecting to confirmation page');
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?success=true&no_auto_signin=true&user_email=${encodeURIComponent(verifyData.user.email)}`
        );

    } catch (error) {
        console.error('❌ Critical confirmation error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent('Internal server error during confirmation')}`
        );
    }
} 