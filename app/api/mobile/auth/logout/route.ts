import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    console.log('📱 Mobile Logout API: Request received');

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const supabase = await createClient();

        // Sign out the user
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('📱 Logout error:', error.message);
            // Don't fail logout for minor errors
        }

        console.log('📱 Mobile logout successful');

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('📱 Mobile Logout API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}