import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    console.log('📱 Mobile Profile API: GET request received');

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const supabaseAdmin = await createClient(true);

        // Verify token and get user
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }, { status: 401 });
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userData.user.id)
            .single();

        if (profileError) {
            console.error('📱 Profile fetch error:', profileError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: userData.user.id,
                    email: userData.user.email,
                    role: profile.role,
                    emailConfirmed: !!userData.user.email_confirmed_at,
                    createdAt: userData.user.created_at,
                    profileCreatedAt: profile.created_at
                }
            }
        });

    } catch (error) {
        console.error('📱 Mobile Profile API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    console.log('📱 Mobile Profile API: PUT request received');

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { password } = await request.json();

        const supabaseAdmin = await createClient(true);

        // Verify token and get user
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }, { status: 401 });
        }

        // Update password if provided
        if (password) {
            if (password.length < 6) {
                return NextResponse.json({
                    success: false,
                    error: 'Password must be at least 6 characters long',
                    code: 'WEAK_PASSWORD'
                }, { status: 400 });
            }

            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
                userData.user.id,
                { password }
            );

            if (passwordError) {
                console.error('📱 Password update error:', passwordError.message);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to update password',
                    code: 'PASSWORD_UPDATE_ERROR'
                }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('📱 Mobile Profile Update API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}