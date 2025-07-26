'use client';

/**
 * Utility functions for complete authentication cleanup
 */

export function clearAllAuthData() {
    if (typeof window === 'undefined') return;

    console.log('Starting complete auth data cleanup...');

    // Clear all localStorage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('auth-') || key === 'auth-storage') {
            localStorage.removeItem(key);
            console.log('Cleared localStorage:', key);
        }
    });

    // Clear all sessionStorage
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('auth-')) {
            sessionStorage.removeItem(key);
            console.log('Cleared sessionStorage:', key);
        }
    });

    // Clear all auth-related cookies
    document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

        if (name.startsWith('sb-') || name.startsWith('supabase-') || name.includes('auth')) {
            // Clear for current path and domain
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;

            // Also try clearing for parent domain
            const parts = window.location.hostname.split('.');
            if (parts.length > 1) {
                const parentDomain = '.' + parts.slice(-2).join('.');
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${parentDomain}`;
            }

            console.log('Cleared cookie:', name);
        }
    });

    console.log('Auth data cleanup complete');
}

export function forceRedirectToLogin() {
    if (typeof window === 'undefined') return;

    // Use window.location.href for a complete page reload
    window.location.href = '/login';
}

export function isAuthDataPresent(): boolean {
    if (typeof window === 'undefined') return false;

    // Check localStorage
    const hasLocalStorageAuth = Object.keys(localStorage).some(key =>
        key.startsWith('sb-') || key.startsWith('auth-') || key === 'auth-storage'
    );

    // Check sessionStorage
    const hasSessionStorageAuth = Object.keys(sessionStorage).some(key =>
        key.startsWith('sb-') || key.startsWith('auth-')
    );

    // Check cookies
    const hasAuthCookies = document.cookie.split(";").some(cookie => {
        const name = cookie.split("=")[0].trim();
        return name.startsWith('sb-') || name.startsWith('supabase-') || name.includes('auth');
    });

    return hasLocalStorageAuth || hasSessionStorageAuth || hasAuthCookies;
}
