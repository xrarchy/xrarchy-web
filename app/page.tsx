'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const { user, isInitialized, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('🏠 HomePage: Auth state -', {
      hasUser: !!user,
      userEmail: user?.email,
      isInitialized,
      isLoading,
      isAuthenticated: !!user
    });
  }, [user, isInitialized, isLoading]);

  return (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
          <span className="text-purple-600">Archy</span> XR
        </h1>

        {/* Debug info - remove this later */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p>User: {user ? user.email : 'None'}</p>
          <p>Initialized: {isInitialized ? 'Yes' : 'No'}</p>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Authenticated: {user ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}
