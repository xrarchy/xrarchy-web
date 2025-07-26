'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { setAuth, clearAuth, setInitialized } = useAuthStore();

    useEffect(() => {
        const supabase = createClient();

        // Get initial session
        const getInitialSession = async () => {
            console.log('🔄 AuthProvider: Getting initial session...');
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('❌ AuthProvider: Error getting session:', error);
                    clearAuth();
                } else if (session) {
                    console.log('✅ AuthProvider: Initial session found for user:', session.user.email);
                    setAuth(session.user, session);
                } else {
                    console.log('ℹ️ AuthProvider: No initial session found');
                    clearAuth();
                }
            } catch (error) {
                console.error('❌ AuthProvider: Error in getInitialSession:', error);
                clearAuth();
            } finally {
                console.log('✅ AuthProvider: Auth initialization complete');
                setInitialized(true);
            }
        };

        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('🔄 AuthProvider: Auth state changed:', event, session?.user?.email || 'no user');

                if (session) {
                    console.log('✅ AuthProvider: Setting auth state for user:', session.user.email);
                    setAuth(session.user, session);
                } else {
                    console.log('❌ AuthProvider: Clearing auth state');
                    clearAuth();
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [setAuth, clearAuth, setInitialized]);

    return <>{children}</>;
}

// Loading component for auth-dependent pages
export function AuthGuard({
    children
}: {
    children: React.ReactNode;
}) {
    // For now, just render children
    // The middleware and individual pages will handle auth checks
    return <>{children}</>;
}
