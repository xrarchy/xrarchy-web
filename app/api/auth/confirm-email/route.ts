import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        console.log('📧 Email confirmation API called');

        const body = await request.json();
        const { access_token, refresh_token, type } = body;

        console.log('Request body received:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
            type
        });

        if (type !== 'signup') {
            console.log('❌ Invalid type:', type);
            return NextResponse.json({ error: `Cannot confirm email for type: ${type}` }, { status: 400 });
        }

        if (!access_token || !refresh_token) {
            console.log('❌ Missing tokens');
            return NextResponse.json({ error: 'Access token and refresh token are required' }, { status: 400 });
        }

        console.log('🔧 Creating temporary Supabase client...');
        // Use a new, temporary Supabase client instance.
        // This is "sandboxed" and will not affect any existing server-side sessions.
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    // Important: don't persist session for this temporary client
                    persistSession: false,
                    autoRefreshToken: false,
                }
            }
        );

        console.log('🔐 Setting session with provided tokens...');
        // Set the session using the tokens from the confirmation link.
        // This verifies the token and confirms the user's email.
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
        });

        if (sessionError) {
            console.error('❌ Error setting session for confirmation:', sessionError.message);
            return NextResponse.json({ error: `Failed to set session: ${sessionError.message}` }, { status: 401 });
        }

        if (!session || !session.user) {
            console.log('❌ No valid session or user found');
            return NextResponse.json({ error: 'Invalid session. The confirmation link may be expired or invalid.' }, { status: 401 });
        }

        // The user's email is now confirmed by Supabase.
        const userEmail = session.user.email;
        console.log(`✅ Email confirmed successfully for: ${userEmail}`);

        // We don't need to do anything else. The user is confirmed.
        // We don't sign them in on the server or set any cookies here.
        // The client-side will decide what to do next.

        return NextResponse.json({ message: 'Email confirmed successfully.', userEmail }, { status: 200 });

    } catch (error: unknown) {
        console.error('💥 Internal server error during email confirmation:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
    }
}


