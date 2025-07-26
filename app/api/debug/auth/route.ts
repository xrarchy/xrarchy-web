import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
    console.log('🔍 DEBUG: Auth debug endpoint called');

    try {
        const supabase = await createClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('🔍 DEBUG: Session check result:', {
            hasSession: !!session,
            userEmail: session?.user?.email || 'none',
            error: error?.message || 'none'
        });

        return NextResponse.json({
            hasSession: !!session,
            userEmail: session?.user?.email || null,
            userId: session?.user?.id || null,
            error: error?.message || null,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('🔍 DEBUG: Error in auth debug:', err);
        return NextResponse.json({
            error: 'Debug endpoint error',
            details: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 });
    }
}
