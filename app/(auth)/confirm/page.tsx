'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfirmEmail() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const confirmEmail = async () => {
            try {
                console.log('🔍 Starting email confirmation process...');

                // Check if we're currently logged in as admin
                let isCurrentlyLoggedIn = false;
                let sessionData = null;

                try {
                    const sessionResponse = await fetch('/api/auth/session');
                    if (sessionResponse.ok) {
                        sessionData = await sessionResponse.json();
                        isCurrentlyLoggedIn = sessionData.user && sessionData.user.email;
                        if (isCurrentlyLoggedIn) {
                            setAdminEmail(sessionData.user.email);
                            console.log('✅ Admin session detected:', sessionData.user.email);
                        }
                    }
                } catch (sessionError) {
                    console.log('Session check failed:', sessionError);
                }

                // Parse URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const success = urlParams.get('success');
                const error = urlParams.get('error');
                const error_code = urlParams.get('error_code');
                const user_email = urlParams.get('user_email');
                const noAutoSignin = urlParams.get('no_auto_signin') === 'true';

                console.log('URL parameters:', { success, error, error_code, user_email, noAutoSignin });

                // Handle success case from direct API
                if (success === 'true') {
                    console.log('✅ Email confirmed successfully via direct API');
                    setStatus('success');
                    setMessage('Email confirmed successfully! Please log in with your credentials to access your account.');
                    setTimeout(() => {
                        router.push('/login?confirmed=true');
                    }, 3000);
                    return;
                }

                // Handle error case from direct API
                if (error) {
                    console.log('❌ Error from direct API:', error);
                    setStatus('error');

                    if (error_code === 'expired') {
                        setMessage('Email confirmation link has expired. Please request a new confirmation email.');
                    } else {
                        setMessage(`Email confirmation failed: ${error}`);
                    }
                    return;
                }

                // Handle hash fragments (tokens from Supabase verification)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const hashAccessToken = hashParams.get('access_token');
                const hashRefreshToken = hashParams.get('refresh_token');
                const hashType = hashParams.get('type');

                console.log('Hash parameters:', {
                    hasAccessToken: !!hashAccessToken,
                    hasRefreshToken: !!hashRefreshToken,
                    hashType
                });

                if (hashAccessToken && hashType === 'signup') {
                    console.log('🔑 Found tokens in hash fragment - processing confirmation...');

                    // Call our confirmation API with the tokens
                    console.log('📧 Calling confirmation API with hash tokens...');
                    const response = await fetch('/api/auth/confirm-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            access_token: hashAccessToken,
                            refresh_token: hashRefreshToken,
                            type: hashType,
                            no_auto_signin: true,
                            prevent_session: true
                        }),
                    });

                    const result = await response.json();

                    if (result.success) {
                        console.log('✅ Email confirmed successfully');
                        setStatus('success');
                        setMessage(result.message || 'Email confirmed successfully! Please log in with your credentials.');
                        setTimeout(() => {
                            router.push('/login?confirmed=true');
                        }, 3000);
                    } else {
                        console.log('❌ Confirmation failed:', result.error);
                        setStatus('error');
                        setMessage(result.error || 'Email confirmation failed. Please try again.');
                    }
                    return;
                }

                // Handle legacy token-based confirmation (fallback)
                const access_token = urlParams.get('access_token') || urlParams.get('token');
                const refresh_token = urlParams.get('refresh_token');
                const type = urlParams.get('type');
                const code = urlParams.get('code');

                if (!access_token && !code) {
                    console.log('❌ No confirmation tokens found in URL or hash');
                    setStatus('error');
                    setMessage('No confirmation tokens found in URL. Please check the link from your email or request a new confirmation email.');
                    return;
                }

                console.log('📧 Calling confirmation API...');
                const response = await fetch('/api/auth/confirm-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token,
                        code: code,
                        type: type,
                        no_auto_signin: noAutoSignin
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    console.log('✅ Email confirmed successfully');
                    setStatus('success');
                    setMessage(result.message || 'Email confirmed successfully! Please log in with your credentials.');
                    setTimeout(() => {
                        router.push('/login?confirmed=true');
                    }, 3000);
                } else {
                    console.log('❌ Confirmation failed:', result.error);
                    setStatus('error');
                    setMessage(result.error || 'Email confirmation failed. Please try again.');
                }

            } catch (error) {
                console.error('❌ Confirmation error:', error);
                setStatus('error');
                setMessage('An error occurred during email confirmation. Please try again.');
            }
        };

        confirmEmail();
    }, [router]);

    return (
        <div className="w-full">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Email Confirmation
                </h2>
                {adminEmail && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Logged in as: {adminEmail}
                    </p>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                {status === 'loading' && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Confirming your email...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{message}</p>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>Tip: Email confirmation links expire for security reasons. You can request a new one by registering again or contacting support.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex space-x-3">

                    <button
                        onClick={() => router.push('/login')}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        Try Login
                    </button>
                </div>
            </div>
        </div>
    );
}
