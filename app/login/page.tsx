// 'use client';

// import { useState, useEffect, Suspense } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
// import { useAuthStore } from '@/stores/authStore';
// import { useAuthActions } from '@/hooks/useAuthActions';
// import { useAuthError } from '@/hooks/useAuthError';
// import { AuthGuard } from '@/components/providers/AuthProvider';
// import { ErrorBoundary } from '@/components/error-boundary';
// import { isAuthDataPresent } from '@/utils/auth-cleanup';

// function LoginForm() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [success, setSuccess] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { user, isInitialized } = useAuthStore();
//   const { signIn } = useAuthActions();
//   const { error, setAuthError, clearError } = useAuthError();

//   const isAuthenticated = !!user;

//   useEffect(() => {
//     // Don't process anything until auth is initialized
//     if (!isInitialized) {
//       console.log('🔄 LoginPage: Auth not yet initialized, waiting...');
//       return;
//     }

//     console.log('✅ LoginPage: Auth initialized. User:', user ? user.email : 'none', 'Authenticated:', isAuthenticated);

//     // Redirect if already authenticated - do this IMMEDIATELY
//     if (isAuthenticated) {
//       console.log('🔄 LoginPage: User is authenticated, redirecting to home...');
//       router.replace('/'); // Use replace instead of push to avoid back button issues
//       return;
//     }

//     // Check for stale auth data and warn if present (debugging only)
//     if (isAuthDataPresent()) {
//       console.warn('⚠️ LoginPage: Stale auth data detected on login page - this should be cleaned up on logout');
//     }

//     // Check if user was redirected here after email confirmation
//     if (searchParams.get('confirmed') === 'true') {
//       setSuccess('Email confirmed successfully! You can now login.');
//       // Remove the parameter from URL
//       const newUrl = new URL(window.location.href);
//       newUrl.searchParams.delete('confirmed');
//       window.history.replaceState({}, '', newUrl.toString());
//     }

//     // Check for error parameters
//     const errorParam = searchParams.get('error');
//     if (errorParam) {
//       setAuthError(decodeURIComponent(errorParam));
//       // Remove the parameter from URL
//       const newUrl = new URL(window.location.href);
//       newUrl.searchParams.delete('error');
//       window.history.replaceState({}, '', newUrl.toString());
//     }
//   }, [searchParams, isAuthenticated, isInitialized, router, setAuthError, user]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     clearError();
//     setSuccess(null);
//     setIsLoading(true);

//     try {
//       // Basic client-side validation
//       if (!email.trim() || !password.trim()) {
//         setAuthError('Please enter both email and password.');
//         setIsLoading(false);
//         return;
//       }

//       const { data, error } = await signIn(email, password);

//       if (error) {
//         setAuthError(error);
//         return;
//       }

//       if (data?.user) {
//         setSuccess('Successfully signed in! Redirecting...');
//         console.log('Login successful for user:', data.user.email);

//         // Immediate redirect without delay - the auth state change will handle the redirect
//         router.replace('/');
//       } else {
//         setAuthError('Sign in failed. No user data received.');
//       }
//     } catch (err: unknown) {
//       console.error('Unexpected login error:', err);
//       setAuthError(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Show loading while auth is initializing
//   if (!isInitialized) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-2 text-gray-600">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Don't render if user is already authenticated
//   if (isAuthenticated) {
//     console.log('User is authenticated, not rendering login form');
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-2 text-gray-600">Redirecting...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
//       <div className="max-w-md w-full space-y-8">
//         <div className="text-center">
//           <LogIn className="mx-auto h-12 w-12 text-blue-600" />
//           <h2 className="mt-6 text-3xl font-bold text-gray-900">Sign in to your account</h2>
//           <p className="mt-2 text-sm text-gray-600">
//             Access your Archy XR project management dashboard
//           </p>
//         </div>

//         <Card>
//           <CardHeader>
//             <CardTitle>Welcome back</CardTitle>
//             <CardDescription>
//               Enter your credentials to access your account
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {error && (
//               <Alert variant="destructive" className="mb-6">
//                 <AlertCircle className="h-4 w-4" />
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}

//             {success && (
//               <Alert className="mb-6">
//                 <CheckCircle2 className="h-4 w-4" />
//                 <AlertDescription>{success}</AlertDescription>
//               </Alert>
//             )}

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div className="space-y-2">
//                 <Label htmlFor="email">Email address</Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   autoComplete="email"
//                   required
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="Enter your email"
//                   disabled={isLoading}
//                   className="text-base" // Prevents zoom on iOS
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="password">Password</Label>
//                 <Input
//                   id="password"
//                   type="password"
//                   autoComplete="current-password"
//                   required
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder="Enter your password"
//                   disabled={isLoading}
//                   className="text-base"
//                 />
//               </div>

//               <Button
//                 type="submit"
//                 className="w-full"
//                 disabled={isLoading}
//               >
//                 {isLoading ? 'Signing in...' : 'Sign in'}
//               </Button>
//             </form>

//             <div className="mt-6 text-center">
//               <p className="text-sm text-gray-600">
//                 Don&apos;t have an account?{' '}
//                 <Button
//                   variant="link"
//                   className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-500"
//                   onClick={() => router.push('/register')}
//                   disabled={isLoading}
//                 >
//                   Sign up here
//                 </Button>
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// export default function LoginPage() {
//   return (
//     <ErrorBoundary>
//       <AuthGuard>
//         <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
//           <LoginForm />
//         </Suspense>
//       </AuthGuard>
//     </ErrorBoundary>
//   );
// }


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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { error, setAuthError, clearError } = useAuthError();

  useEffect(() => {
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
  }, [searchParams, setAuthError]);

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
        setAuthError(error);
        return;
      }

      if (data?.user) {
        setSuccess('Successfully signed in! Redirecting...');
        console.log('Login successful for user:', data.user.email);
        // The top-level redirect will handle navigation
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your Archy XR project management dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
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
                  className="text-base"
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
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

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