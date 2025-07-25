'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

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
        .single();

      if (userError) {
        setError(userError.message);
        return;
      }

      setCurrentUserRole(userData.role);

      // If user is Admin, fetch all users; otherwise, show only the current user's profile
      if (userData.role === 'Admin') {
        const { data, error } = await supabase.from('profiles').select('id, email, role');
        if (error) {
          setError(error.message);
          return;
        }
        setUsers(data || []);
      } else {
        setUsers([userData]);
      }
    };

    fetchUsers();
  }, [supabase, router]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {currentUserRole && (
        <p className="text-gray-600 mb-4">
          Your role: <span className="font-semibold">{currentUserRole}</span>
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">ID</th>
              <th className="border border-gray-300 p-2 text-left">Email</th>
              <th className="border border-gray-300 p-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">{user.id}</td>
                  <td className="border border-gray-300 p-2">{user.email}</td>
                  <td className="border border-gray-300 p-2">{user.role}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="border border-gray-300 p-2 text-center">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}