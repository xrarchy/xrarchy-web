'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Home, Settings, LogOut, FolderOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthActions } from '@/hooks/useAuthActions';

interface NavigationProps {
    showFullNav?: boolean;
}

export default function Navigation({ showFullNav = true }: NavigationProps) {
    const { user, isLoading, isInitialized } = useAuthStore();
    const { signOut } = useAuthActions();
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();

    const isAuthenticated = !!user;

    // Debug logging
    useEffect(() => {
        console.log('Navigation: Auth state -', {
            hasUser: !!user,
            userEmail: user?.email,
            isLoading,
            isInitialized,
            isAuthenticated
        });
    }, [user, isLoading, isInitialized, isAuthenticated]);

    useEffect(() => {
        const getUserRole = async () => {
            if (user?.id) {
                try {
                    // Get user role from the admin API
                    const roleResponse = await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getUserRole', userId: user.id }),
                    });

                    if (roleResponse.ok) {
                        const roleData = await roleResponse.json();
                        setUserRole(roleData.role);
                    } else {
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setUserRole(null);
                }
            } else {
                setUserRole(null);
            }
        };

        getUserRole();
    }, [user?.id]);

    const handleSignOut = async () => {
        try {
            setUserRole(null); // Clear role immediately for UI feedback
            await signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            // Force navigation to login even if there's an error
            router.push('/login');
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

                        {isAuthenticated && isInitialized && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/projects')}
                                >
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    Projects
                                </Button>

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
                        {!isInitialized ? (
                            <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
                        ) : isAuthenticated && user ? (
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground max-w-[150px] truncate">
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
