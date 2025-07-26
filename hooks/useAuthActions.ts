'use client';

import { createClient } from '@/utils/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { clearAllAuthData, forceRedirectToLogin } from '@/utils/auth-cleanup';

export function useAuthActions() {
    const router = useRouter();
    const { clearAuth } = useAuthStore();
    const supabase = createClient();

    const signIn = async (email: string, password: string) => {
        try {
            // Validate inputs
            if (!email || !password) {
                return {
                    data: null,
                    error: { message: 'Email and password are required' }
                };
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                // Handle specific error types
                const errorMessage = error.message || 'Sign in failed';
                console.error('Sign in error:', errorMessage);

                return {
                    data: null,
                    error: {
                        message: errorMessage,
                        status: (error as any)?.status || 400
                    }
                };
            }

            if (!data?.user) {
                return {
                    data: null,
                    error: { message: 'No user data returned from authentication' }
                };
            }

            console.log('Sign in successful for user:', data.user.email);
            return { data, error: null };
        } catch (error: any) {
            console.error('Unexpected sign in error:', error);

            // Handle network errors or other unexpected errors
            const errorMessage = error?.message || 'An unexpected error occurred during sign in';

            return {
                data: null,
                error: {
                    message: errorMessage,
                    status: error?.status || 500
                }
            };
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            // Validate inputs
            if (!email || !password) {
                return {
                    data: null,
                    error: { message: 'Email and password are required' }
                };
            }

            if (password.length < 6) {
                return {
                    data: null,
                    error: { message: 'Password must be at least 6 characters long' }
                };
            }

            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                const errorMessage = error.message || 'Sign up failed';
                console.error('Sign up error:', errorMessage);

                return {
                    data: null,
                    error: {
                        message: errorMessage,
                        status: (error as any)?.status || 400
                    }
                };
            }

            console.log('Sign up successful for user:', data?.user?.email);
            return { data, error: null };
        } catch (error: any) {
            console.error('Unexpected sign up error:', error);

            const errorMessage = error?.message || 'An unexpected error occurred during sign up';

            return {
                data: null,
                error: {
                    message: errorMessage,
                    status: error?.status || 500
                }
            };
        }
    };

    const signOut = async () => {
        try {
            console.log('Starting complete logout process...');

            // Step 1: Sign out from Supabase first
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Supabase sign out error:', error);
            }

            // Step 2: Clear Zustand auth store
            clearAuth();

            // Step 3: Use utility function to clear all auth data
            clearAllAuthData();

            console.log('Logout cleanup complete. Redirecting to login...');

            // Step 4: Force redirect to login with complete page reload
            forceRedirectToLogin();

            return { error: null };
        } catch (error) {
            console.error('Sign out error:', error);

            // Even if there's an error, force complete cleanup
            clearAllAuthData();
            forceRedirectToLogin();

            return { error };
        }
    };

    const resetPassword = async (email: string) => {
        try {
            if (!email || !email.trim()) {
                return {
                    data: null,
                    error: { message: 'Email address is required' }
                };
            }

            const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                const errorMessage = error.message || 'Failed to send reset password email';
                console.error('Reset password error:', errorMessage);

                return {
                    data: null,
                    error: {
                        message: errorMessage,
                        status: (error as any)?.status || 400
                    }
                };
            }

            console.log('Reset password email sent to:', email);
            return { data, error: null };
        } catch (error: any) {
            console.error('Unexpected reset password error:', error);

            const errorMessage = error?.message || 'An unexpected error occurred while sending reset email';

            return {
                data: null,
                error: {
                    message: errorMessage,
                    status: error?.status || 500
                }
            };
        }
    };

    const updatePassword = async (newPassword: string) => {
        try {
            if (!newPassword || newPassword.length < 6) {
                return {
                    data: null,
                    error: { message: 'Password must be at least 6 characters long' }
                };
            }

            const { data, error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                const errorMessage = error.message || 'Failed to update password';
                console.error('Update password error:', errorMessage);

                return {
                    data: null,
                    error: {
                        message: errorMessage,
                        status: (error as any)?.status || 400
                    }
                };
            }

            console.log('Password updated successfully');
            return { data, error: null };
        } catch (error: any) {
            console.error('Unexpected update password error:', error);

            const errorMessage = error?.message || 'An unexpected error occurred while updating password';

            return {
                data: null,
                error: {
                    message: errorMessage,
                    status: error?.status || 500
                }
            };
        }
    };

    const refreshSession = async () => {
        try {
            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
                console.error('Refresh session error:', error);
                clearAuth();
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Refresh session error:', error);
            clearAuth();
            return { data: null, error };
        }
    };

    return {
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshSession,
    };
}

// Custom hook for auth-dependent navigation
export function useAuthRedirect() {
    const { user, isInitialized } = useAuthStore();
    const router = useRouter();

    const isAuthenticated = !!user;

    const requireAuth = (redirectTo: string = '/login') => {
        if (isInitialized && !isAuthenticated) {
            router.push(redirectTo);
            return false;
        }
        return true;
    };

    const requireGuest = (redirectTo: string = '/') => {
        if (isInitialized && isAuthenticated) {
            router.push(redirectTo);
            return false;
        }
        return true;
    };

    return {
        requireAuth,
        requireGuest,
        isAuthenticated,
        isInitialized,
    };
}
