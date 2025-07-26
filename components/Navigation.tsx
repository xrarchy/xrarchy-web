'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Home, Settings, LogOut } from 'lucide-react';

interface NavigationProps {
    showFullNav?: boolean;
}

export default function Navigation({ showFullNav = true }: NavigationProps) {
    const [user, setUser] = useState<{ id: string; email: string } | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            try {
                // Use our session API instead of direct Supabase client
                const sessionResponse = await fetch('/api/auth/session');
                const sessionData = await sessionResponse.json();

                if (sessionData.isLoggedIn && sessionData.user) {
                    setUser({
                        id: sessionData.user.id,
                        email: sessionData.user.email
                    });

                    // Get user role from the admin API
                    const roleResponse = await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getUserRole', userId: sessionData.user.id }),
                    });

                    if (roleResponse.ok) {
                        const roleData = await roleResponse.json();
                        setUserRole(roleData.role);
                    }
                } else {
                    setUser(null);
                    setUserRole(null);
                }
            } catch (error) {
                console.error('Error fetching user session:', error);
                setUser(null);
                setUserRole(null);
            }
        };

        getUser();

        // Since we're using custom session management, we don't need to listen to Supabase auth changes
        // The session state will be checked when the component mounts or when navigation happens
    }, []);

    const handleSignOut = async () => {
        try {
            // Clear local state first
            setUser(null);
            setUserRole(null);

            // Clear server-side session
            try {
                await fetch('/api/auth/session', {
                    method: 'DELETE',
                });
            } catch (error) {
                console.error('Failed to clear server session:', error);
            }

            // Redirect to home page
            router.push('/');

            // Force reload to ensure clean state
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (error) {
            console.error('Sign out error:', error);
            // Force reload even if there's an error
            window.location.href = '/';
        }
    };

    if (!showFullNav) {
        return null;
    }

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-6xl mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/')}
                            className="text-lg font-semibold"
                        >
                            <Home className="h-4 w-4 mr-2" />
                            Archy XR
                        </Button>

                        {user && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/users')}
                                >
                                    <Users className="h-4 w-4 mr-2" />
                                    Users
                                </Button>

                                {userRole === 'Admin' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => router.push('/admin')}
                                        className="text-purple-600 hover:text-purple-700"
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Admin Panel
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">
                                        {user.email}
                                    </span>
                                    {userRole && (
                                        <Badge variant="secondary" className="text-xs">
                                            {userRole}
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        ) : (
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push('/login')}
                                >
                                    Login
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => router.push('/register')}
                                >
                                    Register
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
