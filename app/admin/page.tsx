'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users, Files, Shield, Loader2 } from 'lucide-react';

interface User {
    id: string;
    email: string;
    role: string;
    created_at: string;
    email_confirmed_at?: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

    const router = useRouter();

    const fetchUsers = useCallback(async () => {
        try {
            setError(null);

            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUsers' }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            setUsers(data.users);
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users.';
            setError(errorMessage);
        }
    }, []);

    const checkAdminAccess = useCallback(async () => {
        try {
            // Combine session check and admin check in parallel for faster loading
            const [sessionResponse, adminResponse] = await Promise.all([
                fetch('/api/auth/session'),
                fetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'checkAccess' }),
                })
            ]);

            const sessionData = await sessionResponse.json();

            if (!sessionData.isLoggedIn || !sessionData.user) {
                router.push('/login');
                return;
            }

            if (!adminResponse.ok) {
                if (adminResponse.status === 401) {
                    setError('Access denied. Admin privileges required.');
                } else {
                    setError('Failed to verify admin access.');
                }
                setIsInitializing(false);
                return;
            }

            // Set user immediately and fetch users in parallel
            setCurrentUser({
                id: sessionData.user.id,
                email: sessionData.user.email
            });

            // Fetch users without blocking the UI
            fetchUsers().finally(() => {
                setIsInitializing(false);
            });

        } catch (error) {
            console.error('Error checking admin access:', error);
            setError('Failed to verify admin access.');
            setIsInitializing(false);
        }
    }, [router, fetchUsers]);

    useEffect(() => {
        checkAdminAccess();
    }, [checkAdminAccess]);

    // Show beautiful loading state while initializing
    if (isInitializing) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
                <div className="text-center space-y-6 p-8">
                    <div className="relative">
                        <Shield className="h-16 w-16 text-purple-600 mx-auto animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-purple-800 animate-spin" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Verifying Admin Access
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Please wait while we check your permissions...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if access denied or other errors
    if (error) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
                <div className="text-center space-y-6 p-8 max-w-md">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Access Denied
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {error}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                        >
                            Go Home
                        </Button>

                    </div>
                </div>
            </div>
        );
    }

    // Don't render main content if no current user
    if (!currentUser) {
        return null;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
                        <p className="text-sm md:text-base text-muted-foreground">Manage users and their roles</p>
                    </div>
                </div>
                {currentUser && (
                    <div className="text-left sm:text-right">
                        <p className="text-xs md:text-sm text-muted-foreground">Logged in as</p>
                        <p className="font-medium text-sm md:text-base truncate max-w-[200px] sm:max-w-none">{currentUser.email}</p>
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}



            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{users.length}</p>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {users.filter(u => u.role === 'Admin').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Admins</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-yellow-600" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {users.filter(u => u.role === 'Archivist').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Archivists</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {users.filter(u => u.role === 'User').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>Latest 5 users added to the system</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {users
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 5)
                            .map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{user.email}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Added {new Date(user.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">{user.role}</Badge>
                                </div>
                            ))}
                    </div>
                    {users.length > 5 && (
                        <div className="mt-4 text-center">
                            <Button
                                variant="outline"
                                onClick={() => router.push('/admin/users')}
                            >
                                View All Users
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Admin Actions</CardTitle>
                    <CardDescription>Quick access to admin functions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin/projects')}
                            className="h-20 flex flex-col items-center justify-center space-y-2"
                        >
                            <Files className="h-6 w-6" />
                            <span>Manage Projects</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin/users')}
                            className="h-20 flex flex-col items-center justify-center space-y-2"
                        >
                            <Users className="h-6 w-6" />
                            <span>View All Users</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                            className="h-20 flex flex-col items-center justify-center space-y-2"
                        >
                            <Users className="h-6 w-6" />
                            <span>Home</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
