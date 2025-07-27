import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        console.log('📧 Custom email confirmation API called - redirecting to confirmation page');

        const { searchParams } = new URL(request.url);
        const error = searchParams.get('error');
        const error_code = searchParams.get('error_code');
        const error_description = searchParams.get('error_description');
        const no_auto_signin = searchParams.get('no_auto_signin');
        const prevent_session = searchParams.get('prevent_session');

        console.log('URL parameters received:', {
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

        // Since server-side APIs cannot access URL hash fragments,
        // we redirect to the confirmation page which can handle them client-side
        console.log('🔄 Redirecting to confirmation page to handle hash fragments');
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?no_auto_signin=true&prevent_session=true`
        );

    } catch (error) {
        console.error('❌ Critical confirmation error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm?error=${encodeURIComponent('Internal server error during confirmation')}`
        );
    }
} 