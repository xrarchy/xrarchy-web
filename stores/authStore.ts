import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isInitialized: boolean;
    setAuth: (user: User | null, session: Session | null) => void;
    setLoading: (loading: boolean) => void;
    setInitialized: (initialized: boolean) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            session: null,
            isLoading: true,
            isInitialized: false,

            setAuth: (user: User | null, session: Session | null) => {
                set({
                    user,
                    session,
                    isLoading: false,
                    isInitialized: true
                });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            setInitialized: (initialized: boolean) => {
                set({ isInitialized: initialized });
            },

            clearAuth: () => {
                console.log('Clearing auth state in Zustand store...');
                set({
                    user: null,
                    session: null,
                    isLoading: false,
                    isInitialized: true
                });

                // Also clear cookies when clearing auth
                if (typeof window !== 'undefined') {
                    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

                    // Clear the persisted storage as well
                    localStorage.removeItem('auth-storage');
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => {
                if (typeof window !== 'undefined') {
                    return {
                        getItem: (name: string) => {
                            const item = localStorage.getItem(name);
                            return item;
                        },
                        setItem: (name: string, value: string) => {
                            localStorage.setItem(name, value);
                            // Also set session data in cookies for server-side access
                            if (name === 'auth-storage') {
                                try {
                                    const parsed = JSON.parse(value);
                                    if (parsed.state?.session) {
                                        const session = parsed.state.session;
                                        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
                                        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
                                    } else {
                                        // Clear cookies if no session
                                        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                                        document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                                    }
                                } catch (e) {
                                    console.error('Error syncing auth to cookies:', e);
                                }
                            }
                        },
                        removeItem: (name: string) => {
                            localStorage.removeItem(name);
                            // Clear auth cookies
                            document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                            document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        },
                    };
                }
                return {
                    getItem: () => null,
                    setItem: () => { },
                    removeItem: () => { },
                };
            }),
            partialize: (state) => ({
                user: state.user,
                session: state.session,
                isInitialized: state.isInitialized
            }),
        }
    )
);
