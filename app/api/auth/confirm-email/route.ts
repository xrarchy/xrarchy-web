import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        console.log('📧 Email confirmation API called');

        const body = await request.json();
        const { access_token, refresh_token, code, type, no_auto_signin, prevent_session } = body;

        console.log('Request body received:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
            hasCode: !!code,
            type,
            no_auto_signin,
            prevent_session
        });

        if (type && type !== 'signup') {
            console.log('❌ Invalid type:', type);
            return NextResponse.json({ error: `Cannot confirm email for type: ${type}` }, { status: 400 });
        }

        // Check if we have either tokens or code
        if (!access_token && !code) {
            console.log('❌ Missing tokens or code');
            return NextResponse.json({ error: 'Missing access_token or confirmation code' }, { status: 400 });
        }

        // Create a temporary client to verify the tokens without setting a session
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('🔍 Verifying confirmation...');

        let verifyData;
        let verifyError;

        if (code) {
            // Use code-based confirmation (Supabase standard)
            console.log('🔑 Using code-based confirmation...');

            try {
                const { data, error } = await tempClient.auth.exchangeCodeForSession(code);
                verifyData = data;
                verifyError = error;
            } catch (exchangeError) {
                console.error('Code exchange failed:', exchangeError);
                verifyError = exchangeError;
            }
        } else if (access_token) {
            // Use JWT token-based confirmation (from email links)
            console.log('🔑 Using JWT token-based confirmation...');

            try {
                // Set the session with the provided tokens to verify them
                const { data, error } = await tempClient.auth.setSession({
                    access_token,
                    refresh_token: refresh_token || ''
                });

                if (error) {
                    console.error('Session verification failed:', error);
                    verifyError = error;
                } else {
                    // Get user data from the verified session
                    const { data: userData, error: userError } = await tempClient.auth.getUser();
                    if (userError) {
                        console.error('User data retrieval failed:', userError);
                        verifyError = userError;
                    } else {
                        verifyData = { user: userData.user, session: data.session };
                    }
                }
            } catch (sessionError) {
                console.error('Session setting failed:', sessionError);
                verifyError = sessionError;
            }
        }

        if (verifyError) {
            console.error('❌ Confirmation verification failed:', verifyError);

            // Check if it's an expired token error
            const errorMessage = typeof verifyError === 'object' && verifyError !== null && 'message' in verifyError
                ? String(verifyError.message)
                : '';
            const errorCode = typeof verifyError === 'object' && verifyError !== null && 'code' in verifyError
                ? String(verifyError.code)
                : '';

            if (errorMessage.includes('expired') || errorCode === 'otp_expired' || errorCode === 'token_expired') {
                return NextResponse.json({
                    error: 'Email confirmation link has expired. Please request a new confirmation email.'
                }, { status: 400 });
            }

            return NextResponse.json({ error: 'Invalid or expired confirmation tokens' }, { status: 400 });
        }

        if (!verifyData || !verifyData.user) {
            console.error('❌ No user data received from verification');
            return NextResponse.json({ error: 'Failed to verify user data' }, { status: 400 });
        }

        console.log('✅ Confirmation verified successfully');
        console.log('👤 User to confirm:', verifyData.user.email);

        // Check if email is already confirmed
        if (verifyData.user.email_confirmed_at) {
            console.log('✅ Email already confirmed');
            return NextResponse.json({
                success: true,
                message: 'Email is already confirmed. You can now log in.',
                userEmail: verifyData.user.email
            });
        }

        // Use admin client to confirm the email without affecting any session
        const { createClient: createServerClient } = await import('@/utils/supabase/server');
        const supabaseAdmin = await createServerClient(true);

        console.log('🔧 Confirming email using admin API...');

        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            verifyData.user.id,
            { email_confirm: true }
        );

        if (confirmError) {
            console.error('❌ Email confirmation failed:', confirmError);
            return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
        }

        console.log('✅ Email confirmed successfully');

        // Always return success without setting session when no_auto_signin or prevent_session is enabled
        if (no_auto_signin || prevent_session) {
            console.log('🚫 Auto signin disabled - no session will be set');
            return NextResponse.json({
                success: true,
                message: 'Email confirmed successfully. Please log in with your credentials.',
                userEmail: verifyData.user.email
            });
        }

        // Only set session if auto signin is not disabled and we have tokens
        if (access_token && refresh_token) {
            console.log('🔐 Setting session for confirmed user...');

            const { error: sessionError } = await tempClient.auth.setSession({
                access_token,
                refresh_token
            });

            if (sessionError) {
                console.error('❌ Session setting failed:', sessionError);
                return NextResponse.json({ error: 'Failed to set session after confirmation' }, { status: 500 });
            }

            console.log('✅ Session set successfully');
        }

        return NextResponse.json({
            success: true,
            message: 'Email confirmed successfully',
            userEmail: verifyData.user.email
        });

    } catch (error) {
        console.error('❌ Critical confirmation error:', error);
        return NextResponse.json({ error: 'Internal server error during confirmation' }, { status: 500 });
    }
}


