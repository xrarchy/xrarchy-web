'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Trash2, Users, Plus } from 'lucide-react';

interface User {
    id: string;
    email: string;
    role: string;
    created_at: string;
    email_confirmed_at?: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

    // Create user form state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('User');
    const [isCreating, setIsCreating] = useState(false);

    const router = useRouter();

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUsers' }),
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Fetched users data:', data);
            setUsers(data.users);
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const checkAdminAccess = useCallback(async () => {
        try {
            console.log('Checking admin access...');

            // Check session using our custom session API
            const sessionResponse = await fetch('/api/auth/session');
            const sessionData = await sessionResponse.json();

            if (!sessionData.isLoggedIn || !sessionData.user) {
                console.log('Not logged in, redirecting to login');
                router.push('/login');
                return;
            }

            console.log('User is logged in:', sessionData.user);

            // Check if user is admin using the admin API
            const adminResponse = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkAccess' }),
            });

            if (!adminResponse.ok) {
                if (adminResponse.status === 401) {
                    console.log('Access denied - not an admin');
                    setError('Access denied. Admin privileges required.');
                } else {
                    setError('Failed to verify admin access.');
                }
                return;
            }

            const adminData = await adminResponse.json();
            console.log('Admin access verified:', adminData);

            setCurrentUser({
                id: sessionData.user.id,
                email: sessionData.user.email
            });

            await fetchUsers();
        } catch (error) {
            console.error('Error checking admin access:', error);
            setError('Failed to verify admin access.');
        }
    }, [router, fetchUsers]);

    useEffect(() => {
        checkAdminAccess();
    }, [checkAdminAccess]);

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsCreating(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error);
                return;
            }

            setSuccess(`User ${newUserEmail} created successfully!`);
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole('User');

            // Refresh users list
            await fetchUsers();
        } catch {
            setError('Failed to create user.');
        } finally {
            setIsCreating(false);
        }
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateRole', userId, role: newRole }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            setSuccess('User role updated successfully!');
            await fetchUsers();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update user role.';
            setError(errorMessage);
        }
    };

    const deleteUser = async (userId: string, email: string) => {
        if (!confirm(`Are you sure you want to delete user ${email}?`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteUser', userId, email }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            setSuccess(`User ${email} deleted successfully!`);
            await fetchUsers();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete user.';
            setError(errorMessage);
        }
    };

    if (!currentUser) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error || 'Checking admin access...'}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div>
                        <h1 className="text-3xl font-bold">Admin Panel</h1>
                        <p className="text-muted-foreground">Manage users and their roles</p>
                    </div>
                </div>
                {currentUser && (
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Logged in as</p>
                        <p className="font-medium">{currentUser.email}</p>
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {/* Create New User Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Plus className="h-5 w-5" />
                        <span>Create New User</span>
                    </CardTitle>
                    <CardDescription>
                        Add a new user to the system with their email, password, and role.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                placeholder="user@example.com"
                                required
                                disabled={isCreating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                required
                                disabled={isCreating}
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={newUserRole} onValueChange={setNewUserRole} disabled={isCreating}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="User">User</SelectItem>
                                    <SelectItem value="Archivist">Archivist</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isCreating}
                            >
                                {isCreating ? 'Creating...' : 'Create User'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Users List Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>All Users ({users.length})</span>
                        <Badge variant="secondary">{users.length} total users</Badge>
                    </CardTitle>
                    <CardDescription>
                        Manage user roles and permissions. Click on a role to change it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-muted-foreground">Loading users...</div>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.email}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(value) => updateUserRole(user.id, value)}
                                                    disabled={user.id === currentUser.id}
                                                >
                                                    <SelectTrigger className="w-[130px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="User">User</SelectItem>
                                                        <SelectItem value="Archivist">Archivist</SelectItem>
                                                        <SelectItem value="Admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.email_confirmed_at ? "default" : "secondary"}
                                                    className={user.email_confirmed_at ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                                                >
                                                    {user.email_confirmed_at ? 'Confirmed' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => deleteUser(user.id, user.email)}
                                                    disabled={user.id === currentUser.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={() => router.push('/users')}>
                    Back to Users Page
                </Button>
                <Button onClick={() => router.push('/')}>
                    Home
                </Button>
            </div>
        </div>
    );
}
