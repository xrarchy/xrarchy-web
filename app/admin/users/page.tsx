'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users as UsersIcon, Settings, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  email: string;
  role: 'Admin' | 'Archivist' | 'User';
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userEmail: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    userId: '',
    userEmail: '',
    isDeleting: false
  });
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
      setCurrentUserId(userProfile.id);

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

  const openDeleteDialog = (userId: string, userEmail: string) => {
    setDeleteDialog({
      isOpen: true,
      userId,
      userEmail,
      isDeleting: false
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      userId: '',
      userEmail: '',
      isDeleting: false
    });
  };

  const confirmDeleteUser = async () => {
    setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
    setError(null);

    try {
      // Call the admin API to delete the user
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteUser',
          userId: deleteDialog.userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to delete user');
        setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
        return;
      }

      // Remove the user from the local state
      setUsers(prev => prev.filter(user => user.id !== deleteDialog.userId));
      closeDeleteDialog();
    } catch (error) {
      console.error('Delete user error:', error);
      setError('Failed to delete user');
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const canDeleteUser = (userId: string) => {
    // Can't delete yourself
    return userId !== currentUserId;
  };

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
                      {canDeleteUser(user.id) && (
                        <div className="pt-2 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(user.id, user.email)}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete User
                          </Button>
                        </div>
                      )}
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
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                        <TableCell>
                          {canDeleteUser(user.id) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(user.id, user.email)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              title="Delete user"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">You</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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

      {/* Delete User Confirmation Modal */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !deleteDialog.isDeleting && !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Delete User
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <UsersIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">
                  {deleteDialog.userEmail}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this user? This will:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                <li>Permanently remove the user from the system</li>
                <li>Remove all project assignments</li>
                <li>Delete their profile and authentication data</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={deleteDialog.isDeleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={deleteDialog.isDeleting}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleteDialog.isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}