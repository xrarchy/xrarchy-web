'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, LogIn } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();

        if (sessionData.isLoggedIn && sessionData.user) {
          // User is already logged in, redirect to admin page
          router.push('/admin');
          return;
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    // Check if user was redirected here after email confirmation
    if (searchParams.get('confirmed') === 'true') {
      setSuccess('Email confirmed successfully! You can now login.');
      // Remove the parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('confirmed');
      window.history.replaceState({}, document.title, newUrl.pathname);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Attempt login directly and handle specific error cases
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('Login error:', error.message); // Debug log

      // Check for specific error types
      if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account before logging in.');
      } else if (error.message.includes('Invalid login credentials')) {
        // Check if user exists in profiles table to distinguish between "no account" vs "wrong password"
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (profileError || !profileData) {
          // User doesn't exist in profiles table
          setError('No account found with this email address. Please check your email or register for a new account.');
        } else {
          // User exists but password is wrong
          setError('Invalid password. Please try again.');
        }
      } else {
        setError(error.message);
      }
      return;
    }

    // If we reach here, login was successful, get the session
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      // Send tokens to server to establish session
      try {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: sessionData.session.access_token,
            refreshToken: sessionData.session.refresh_token,
          }),
        });

        if (response.ok) {
          console.log('Server session established successfully');
          router.push('/users');
        } else {
          console.error('Failed to establish server session');
          setError('Login successful but server session failed. Please try again.');
        }
      } catch (error) {
        console.error('Session API error:', error);
        setError('Login successful but server session failed. Please try again.');
      }
    } else {
      setError('Login successful but no session data available.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl flex items-center justify-center">
            <LogIn className="h-6 w-6 mr-2" />
            Login
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {error.includes('confirm your account') && (
                  <div className="mt-2 text-sm">
                    <Button variant="link" className="p-0 h-auto" onClick={async () => {
                      try {
                        const response = await fetch('/api/auth/manual-confirm', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email }),
                        });
                        if (response.ok) {
                          setSuccess('Email confirmation resent. Please check your inbox.');
                          setError(null);
                        } else {
                          setError('Failed to resend confirmation email.');
                        }
                      } catch {
                        setError('Failed to resend confirmation email.');
                      }
                    }}>
                      Resend confirmation email
                    </Button>
                  </div>
                )}
                {error.includes('No account found') && (
                  <div className="mt-2 text-sm">
                    <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/register')}>
                      Click here to register for a new account
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/register')}>
                Register here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}