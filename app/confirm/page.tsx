'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Do not use the standard client here to avoid session conflicts
// import { createSupabaseClient } from '@/utils/supabase/client';

export default function ConfirmEmail() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const confirmEmail = async () => {
            try {
                console.log('🔵 Starting email confirmation process...');

                // Check if an admin is already logged in by calling a safe API route
                const sessionRes = await fetch('/api/auth/session');
                const sessionData = await sessionRes.json();
                const isCurrentlyLoggedIn = sessionData.isLoggedIn;
                if (isCurrentlyLoggedIn) {
                    setAdminEmail(sessionData.user.email);
                    console.log('✅ Admin session detected:', sessionData.user.email);
                    console.log('🔒 Preserving current session while confirming new user...');
                } else {
                    console.log('ℹ️ No active admin session detected.');
                }

                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const access_token = hashParams.get('access_token');
                const refresh_token = hashParams.get('refresh_token');
                const type = hashParams.get('type');
                const error = hashParams.get('error');
                const error_code = hashParams.get('error_code');
                const error_description = hashParams.get('error_description');

                console.log('Parsed tokens from URL hash:', {
                    hasAccessToken: !!access_token,
                    hasRefreshToken: !!refresh_token,
                    type,
                    error,
                    error_code,
                    error_description,
                });

                // Check for errors first
                if (error) {
                    setStatus('error');
                    if (error_code === 'otp_expired') {
                        setMessage('Your email confirmation link has expired. Please request a new confirmation email.');
                    } else if (error === 'access_denied') {
                        setMessage('Email confirmation was denied or cancelled. Please try registering again or request a new confirmation email.');
                    } else {
                        const decodedDescription = error_description ? decodeURIComponent(error_description.replace(/\+/g, ' ')) : '';
                        setMessage(`Email confirmation failed: ${decodedDescription || error}. Please try registering again.`);
                    }
                    return;
                }

                if (!access_token || !refresh_token) {
                    setStatus('error');
                    setMessage('No confirmation tokens found in URL. Please check the link from your email or request a new confirmation email.');
                    return;
                }

                if (type !== 'signup') {
                    setStatus('error');
                    setMessage(`Invalid confirmation link type: "${type}". Expected "signup".`);
                    return;
                }

                console.log('📧 Calling confirmation API...');
                const response = await fetch('/api/auth/confirm-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token, refresh_token, type }),
                });

                const result = await response.json();

                console.log('📬 Confirmation API result:', {
                    success: response.ok,
                    status: response.status,
                    result: result
                });

                if (!response.ok || result.error) {
                    console.error('Confirmation error:', result.error);
                    setStatus('error');
                    setMessage(`Email confirmation failed: ${result.error}. The link may be expired or invalid.`);
                } else {
                    console.log('🎉 Confirmation successful!');
                    setStatus('success');

                    if (isCurrentlyLoggedIn) {
                        setMessage(`Email for ${result.userEmail} has been successfully confirmed. You remain logged in as ${sessionData.user.email}.`);
                    } else {
                        setMessage('Email confirmed successfully! You can now log in. Redirecting...');
                        setTimeout(() => {
                            router.push('/login?confirmed=true');
                        }, 3000);
                    }
                }
            } catch (err: unknown) {
                console.error('Critical confirmation error:', err);
                setStatus('error');
                setMessage(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}.`);
            }
        };

        confirmEmail();
    }, [router]);

    return (
        <div className="container mx-auto p-4 max-w-md">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Email Confirmation</h1>

                {status === 'loading' && (
                    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                        <p>Confirming your email...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        <p>{message}</p>
                        {adminEmail ? (
                            <div className="mt-4">
                                <a
                                    href="/admin"
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                >
                                    Back to Admin Panel
                                </a>
                            </div>
                        ) : (
                            <div className="mt-4">
                                <a
                                    href="/login"
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Go to Login
                                </a>
                            </div>
                        )}
                        {message.includes('Redirecting') && (
                            <p className="text-sm mt-2">Redirecting to login page...</p>
                        )}
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <p>{message}</p>
                        <div className="mt-4">
                            {adminEmail ? (
                                // Admin is logged in - show admin-focused actions
                                <div className="space-x-2">
                                    <a
                                        href="/admin"
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                    >
                                        Back to Admin Panel
                                    </a>
                                    <a
                                        href="/register"
                                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                    >
                                        Create New User
                                    </a>
                                </div>
                            ) : (
                                // No admin logged in - show user-focused actions
                                <div className="space-x-2">
                                    <a
                                        href="/register"
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                    >
                                        Register Again
                                    </a>
                                    <a
                                        href="/login"
                                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                    >
                                        Try Login
                                    </a>
                                </div>
                            )}
                        </div>
                        {message.includes('expired') && (
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                                <p><strong>Tip:</strong> Email confirmation links expire for security reasons. You can request a new one by registering again or contacting support.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
