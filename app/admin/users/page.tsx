'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users as UsersIcon, Settings, AlertCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  role: 'Admin' | 'Archivist' | 'User';
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setError('Please log in to view users');
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();

      if (userError) {
        setError(userError.message);
        return;
      }

      if (!userData) {
        setError('Profile not found. Please try registering again.');
        return;
      }

      // Admin access check
      if (userData.role !== 'Admin') {
        setError('Access denied. Admin privileges required.');
        router.push('/');
        return;
      }

      // Type cast the userData to UserProfile to ensure proper typing
      const userProfile = userData as UserProfile;
      setCurrentUserRole(userProfile.role);

      // If user is Admin, fetch all users; otherwise, show only the current user's profile
      if (userProfile.role === 'Admin') {
        const { data, error } = await supabase.from('profiles').select('id, email, role');
        if (error) {
          setError(error.message);
          return;
        }
        // Type cast the data array to UserProfile[]
        setUsers((data as UserProfile[]) || []);
      } else {
        setUsers([userProfile]);
      }
    };

    fetchUsers();
  }, [supabase, router]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <UsersIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">User Directory</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {currentUserRole === 'Admin'
                ? 'View and manage all users in the system'
                : 'Your user profile information'
              }
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={() => router.push('/admin')} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Admin</span>
            <span className="sm:hidden">Admin</span>
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentUserRole && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <span className="text-lg md:text-xl">Current User Information</span>
              <Badge variant="secondary" className="text-xs md:text-sm w-fit">
                Role: {currentUserRole}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              Your account information and access level
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col space-y-2">
                <span className="text-xs md:text-sm font-medium text-muted-foreground">Role</span>
                <Badge variant={
                  currentUserRole === 'Admin' ? 'default' :
                    currentUserRole === 'Archivist' ? 'secondary' :
                      'outline'
                } className="w-fit text-xs md:text-sm">
                  {currentUserRole}
                </Badge>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-xs md:text-sm font-medium text-muted-foreground">Access Level</span>
                <span className="text-xs md:text-sm">
                  {currentUserRole === 'Admin' ? 'Full system access' :
                    currentUserRole === 'Archivist' ? 'Project management access' :
                      'Basic user access'}
                </span>
              </div>
              <div className="flex flex-col space-y-2 sm:col-span-2 lg:col-span-1">
                <span className="text-xs md:text-sm font-medium text-muted-foreground">Permissions</span>
                <span className="text-xs md:text-sm">
                  {currentUserRole === 'Admin' ? 'Create, edit, delete all content' :
                    currentUserRole === 'Archivist' ? 'Manage projects and assignments' :
                      'View assigned projects'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <span className="text-lg md:text-xl">
              {currentUserRole === 'Admin'
                ? `All Users (${users.length})`
                : 'Your Profile'
              }
            </span>
            {currentUserRole === 'Admin' && (
              <Badge variant="secondary" className="text-xs md:text-sm w-fit">
                {users.length} total users
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            {currentUserRole === 'Admin'
              ? 'Complete list of all registered users and their roles'
              : 'Your user profile information and role details'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {users.length > 0 ? (
              users.map((user) => (
                <Card key={user.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate pr-2">{user.email}</span>
                        <Badge variant={
                          user.role === 'Admin' ? 'default' :
                            user.role === 'Archivist' ? 'secondary' :
                              'outline'
                        } className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">User ID:</span>
                          <div className="font-mono text-xs text-muted-foreground">
                            {user.id.substring(0, 8)}...
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Access:</span>
                          <div className="text-xs">
                            {user.role === 'Admin' ? 'Full Access' :
                              user.role === 'Archivist' ? 'Project Manager' :
                                'Basic User'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No users found</p>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[120px]">User ID</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead className="w-[130px]">Role</TableHead>
                    <TableHead className="w-[120px]">Access Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {user.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.role === 'Admin' ? 'default' :
                              user.role === 'Archivist' ? 'secondary' :
                                'outline'
                          }>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.role === 'Admin' ? 'Full Access' :
                            user.role === 'Archivist' ? 'Project Manager' :
                              'Basic User'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
        {currentUserRole === 'Admin' && (
          <Button onClick={() => router.push('/admin')} className="w-full sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Go to Admin Panel
          </Button>
        )}
        <Button variant="outline" onClick={() => router.push('/admin/projects')} className="w-full sm:w-auto">
          View Projects
        </Button>
        <Button variant="outline" onClick={() => router.push('/')} className="w-full sm:w-auto">
          Home
        </Button>
      </div>
    </div>
  );
}