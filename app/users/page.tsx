'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/utils/supabase/client';
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
  const supabase = createSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setError('Please log in to view users');
        router.push('/login'); // Redirect to login page if not authenticated
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', sessionData.session.user.id)
        .maybeSingle(); // Use maybeSingle() to handle missing profiles

      if (userError) {
        setError(userError.message);
        return;
      }

      if (!userData) {
        setError('Profile not found. Please try registering again.');
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
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <UsersIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Users</h1>
        </div>
        {currentUserRole === 'Admin' && (
          <Button onClick={() => router.push('/admin')} className="bg-purple-600 hover:bg-purple-700">
            <Settings className="h-4 w-4 mr-2" />
            Admin Panel
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentUserRole && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Your role:</span>
              <Badge variant="secondary">{currentUserRole}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>
            {currentUserRole === 'Admin'
              ? 'All users in the system'
              : 'Your user profile'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}