import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    console.log('📱 Mobile Register API: Request received');

    try {
        const { email, password, role } = await request.json();

        if (!email || !password) {
            return NextResponse.json({
                success: false,
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({
                success: false,
                error: 'Password must be at least 6 characters long',
                code: 'WEAK_PASSWORD'
            }, { status: 400 });
        }

        // Prevent admin registration through mobile
        if (role === 'Admin') {
            return NextResponse.json({
                success: false,
                error: 'Admin accounts cannot be created through mobile registration',
                code: 'ADMIN_REGISTRATION_BLOCKED'
            }, { status: 403 });
        }

        const validRoles = ['Archivist', 'User'];
        const userRole = validRoles.includes(role) ? role : 'User';

        const supabaseAdmin = await createClient(true);

        // Check if user already exists
        const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('email', email.trim())
            .maybeSingle();

        if (profileCheckError) {
            console.error('📱 Profile check error:', profileCheckError.message);
            return NextResponse.json({
                success: false,
                error: 'Database error checking existing user',
                code: 'DATABASE_ERROR'
            }, { status: 500 });
        }

        if (existingProfile) {
            return NextResponse.json({
                success: false,
                error: 'An account with this email already exists',
                code: 'EMAIL_ALREADY_EXISTS'
            }, { status: 400 });
        }

        // Create user with admin API
        const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim(),
            password,
            email_confirm: false,
            user_metadata: {
                role: userRole
            }
        });

        if (adminError) {
            console.error('📱 User creation failed:', adminError.message);

            let errorCode = 'REGISTRATION_FAILED';
            let userMessage = 'Registration failed. Please try again.';

            if (adminError.message.toLowerCase().includes('email')) {
                errorCode = 'INVALID_EMAIL';
                userMessage = 'Please provide a valid email address';
            }

            return NextResponse.json({
                success: false,
                error: userMessage,
                code: errorCode,
                details: adminError.message
            }, { status: 400 });
        }

        if (!adminData.user) {
            return NextResponse.json({
                success: false,
                error: 'Failed to create user account',
                code: 'NO_USER_CREATED'
            }, { status: 500 });
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: adminData.user.id,
                email: email.trim(),
                role: userRole
            });

        if (profileError) {
            console.error('📱 Profile creation failed:', profileError.message);
            // Don't fail registration for profile creation error
        }

        // Send confirmation email
        const supabase = await createClient(false);
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const siteUrl = `${protocol}://${host}`;

        const { error: emailError } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: {
                emailRedirectTo: `${siteUrl}/api/auth/confirm-email-custom?no_auto_signin=true&prevent_session=true`
            }
        });

        if (emailError) {
            console.error('📱 Email send failed:', emailError.message);
            // Don't fail registration for email error
        }

        console.log('📱 Mobile registration successful for:', email.trim());

        return NextResponse.json({
            success: true,
            message: 'Registration successful. Please check your email to confirm your account.',
            data: {
                user: {
                    id: adminData.user.id,
                    email: adminData.user.email,
                    role: userRole,
                    emailConfirmed: false,
                    createdAt: adminData.user.created_at
                },
                requiresEmailConfirmation: true
            }
        }, { status: 201 });

    } catch (error) {
        console.error('📱 Mobile Register API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}