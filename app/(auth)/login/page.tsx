'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthActions } from '@/hooks/useAuthActions';
import { useAuthError } from '@/hooks/useAuthError';
import { AuthGuard } from '@/components/providers/AuthProvider';
import { ErrorBoundary } from '@/components/error-boundary';
import { isAuthDataPresent } from '@/utils/auth-cleanup';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const { signIn } = useAuthActions();
  const { error, setAuthError, clearError } = useAuthError();

  const isAuthenticated = !!user;

  useEffect(() => {
    // Don't process anything until auth is initialized
    if (!isInitialized) {
      console.log('🔄 LoginPage: Auth not yet initialized, waiting...');
      return;
    }

    console.log('✅ LoginPage: Auth initialized. User:', user ? user.email : 'none', 'Authenticated:', isAuthenticated);

    // Redirect if already authenticated - do this IMMEDIATELY
    if (isAuthenticated) {
      console.log('🔄 LoginPage: User is authenticated, redirecting to home...');
      router.replace('/'); // Use replace instead of push to avoid back button issues
      return;
    }

    // Check for stale auth data and warn if present (debugging only)
    if (isAuthDataPresent()) {
      console.warn('⚠️ LoginPage: Stale auth data detected on login page - this should be cleaned up on logout');
    }

    // Check if user was redirected here after email confirmation
    if (searchParams.get('confirmed') === 'true') {
      setSuccess('Email confirmed successfully! You can now login.');
      // Remove the parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('confirmed');
      window.history.replaceState({}, '', newUrl.toString());
    }

    // Check for error parameters
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam));
      // Remove the parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, isAuthenticated, isInitialized, router, setAuthError, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccess(null);
    setIsLoading(true);

    try {
      // Basic client-side validation
      if (!email.trim() || !password.trim()) {
        setAuthError('Please enter both email and password.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await signIn(email, password);

      if (error) {
        // Check if it's a database error and increment retry count
        const errorMessage = error.message || error;
        const isDatabaseError = errorMessage.toLowerCase().includes('database') ||
          errorMessage.toLowerCase().includes('schema') ||
          errorMessage.toLowerCase().includes('connection');

        if (isDatabaseError) {
          setRetryCount(prev => prev + 1);
        }

        setAuthError(error);
        return;
      }

      if (data?.user) {
        // Reset retry count on successful login
        setRetryCount(0);
        // Show success immediately for better UX
        setSuccess('Successfully signed in!');
        console.log('Login successful for user:', data.user.email);

        // Small delay to show success message, then redirect
        setTimeout(() => {
          router.replace('/');
        }, 800);
      } else {
        setAuthError('Sign in failed. No user data received.');
      }
    } catch (err: unknown) {
      console.error('Unexpected login error:', err);
      setAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    clearError();
    setRetryCount(0);
  };

  // Show loading while auth is initializing
  if (!isInitialized) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  // Don't render if user is already authenticated
  if (isAuthenticated) {
    console.log('User is authenticated, not rendering login form');
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <LogIn className="mx-auto h-8 w-8 text-purple-600 mb-2" />
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p>{error}</p>
                {(error.toLowerCase().includes('database') ||
                  error.toLowerCase().includes('schema') ||
                  error.toLowerCase().includes('connection')) && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="w-full sm:w-auto"
                      >
                        Try Again
                      </Button>
                      {retryCount > 0 && (
                        <span className="text-xs text-muted-foreground self-center">
                          Attempt {retryCount + 1}
                        </span>
                      )}
                    </div>
                  )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              className="text-base" // Prevents zoom on iOS
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              className="text-base"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-500"
              onClick={() => router.push('/register')}
              disabled={isLoading}
            >
              Sign up here
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </AuthGuard>
    </ErrorBoundary>
  );
}
