'use client';

import { useState, useCallback } from 'react';

export interface AuthError {
    message: string;
    status?: number;
    type?: 'network' | 'validation' | 'auth' | 'server' | 'unknown';
}

export interface AuthResult<T> {
    data: T | null;
    error: AuthError | null;
    isLoading: boolean;
}

export function useAuthError() {
    const [error, setError] = useState<string | null>(null);

    const handleAuthError = useCallback((error: any): string => {
        console.error('Auth error received:', error);

        if (!error) {
            return 'An unknown error occurred';
        }

        const errorMessage = error?.message || error || 'An unknown error occurred';
        const lowerMessage = errorMessage.toLowerCase();

        // Handle specific error types
        if (lowerMessage.includes('invalid login credentials') ||
            lowerMessage.includes('invalid credentials')) {
            return 'Invalid email or password. Please check your credentials and try again.';
        }

        if (lowerMessage.includes('email not confirmed') ||
            lowerMessage.includes('email confirmation')) {
            return 'Please check your email and click the confirmation link before logging in.';
        }

        if (lowerMessage.includes('user not found') ||
            lowerMessage.includes('no user found')) {
            return 'No account found with this email address. Please check your email or sign up.';
        }

        if (lowerMessage.includes('email already registered') ||
            lowerMessage.includes('user already registered')) {
            return 'An account with this email already exists. Please sign in instead.';
        }

        if (lowerMessage.includes('weak password') ||
            lowerMessage.includes('password')) {
            return 'Password does not meet requirements. Please choose a stronger password.';
        }

        if (lowerMessage.includes('network') ||
            lowerMessage.includes('connection') ||
            lowerMessage.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }

        if (lowerMessage.includes('rate limit') ||
            lowerMessage.includes('too many requests')) {
            return 'Too many attempts. Please wait a moment before trying again.';
        }

        if (lowerMessage.includes('server error') ||
            lowerMessage.includes('internal error')) {
            return 'Server error. Please try again later.';
        }

        if (lowerMessage.includes('session') ||
            lowerMessage.includes('token')) {
            return 'Session expired. Please sign in again.';
        }

        // Return the original message if it's user-friendly, otherwise provide a generic message
        if (errorMessage.length < 100 && !lowerMessage.includes('stack') && !lowerMessage.includes('error:')) {
            return errorMessage;
        }

        return 'An unexpected error occurred. Please try again.';
    }, []);

    const setAuthError = useCallback((error: any) => {
        const userFriendlyMessage = handleAuthError(error);
        setError(userFriendlyMessage);
    }, [handleAuthError]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        error,
        setAuthError,
        clearError,
        handleAuthError,
    };
}

// Hook for managing authentication state with error handling
export function useAuthState<T>() {
    const [state, setState] = useState<AuthResult<T>>({
        data: null,
        error: null,
        isLoading: false,
    });

    const { handleAuthError } = useAuthError();

    const setLoading = useCallback((isLoading: boolean) => {
        setState(prev => ({ ...prev, isLoading }));
    }, []);

    const setData = useCallback((data: T) => {
        setState({
            data,
            error: null,
            isLoading: false,
        });
    }, []);

    const setError = useCallback((error: any) => {
        const authError: AuthError = {
            message: handleAuthError(error),
            status: error?.status,
            type: determineErrorType(error),
        };

        setState({
            data: null,
            error: authError,
            isLoading: false,
        });
    }, [handleAuthError]);

    const clearState = useCallback(() => {
        setState({
            data: null,
            error: null,
            isLoading: false,
        });
    }, []);

    return {
        ...state,
        setLoading,
        setData,
        setError,
        clearState,
    };
}

function determineErrorType(error: any): AuthError['type'] {
    if (!error) return 'unknown';

    const message = (error?.message || error || '').toLowerCase();

    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
        return 'network';
    }

    if (message.includes('validation') || message.includes('required') || message.includes('invalid format')) {
        return 'validation';
    }

    if (message.includes('credentials') || message.includes('unauthorized') || message.includes('forbidden')) {
        return 'auth';
    }

    if (message.includes('server') || message.includes('internal') || error?.status >= 500) {
        return 'server';
    }

    return 'unknown';
}
