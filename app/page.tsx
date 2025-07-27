'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FolderOpen,
  Settings,
  AlertCircle,
  Users,
  Files,
  Calendar,
  Edit
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  assignment_count: number;
  file_count: number;
}

interface UserProfile {
  role: 'Admin' | 'Archivist' | 'User';
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchUserProjects = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user session and role
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionData.session.user.id)
        .single();

      if (userError) {
        setError('Failed to fetch user profile');
        return;
      }

      const userProfile = userData as UserProfile;
      setCurrentUserRole(userProfile.role);
      setCurrentUserEmail(sessionData.session.user.email || 'Unknown User');

      // Fetch user's assigned projects
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch projects');
        return;
      }

      setProjects(data.projects);
      setError(null);
    } catch (error) {
      console.error('Projects fetch error:', error);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchUserProjects();
  }, [fetchUserProjects]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {currentUserEmail}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {currentUserRole === 'Admin' && (
            <Button onClick={() => router.push('/admin')} variant="outline" className="w-full sm:w-auto">
              <Settings className="h-4 w-4 mr-2" />
              Admin Panel
            </Button>
          )}
          {currentUserRole === 'Admin' && (
            <Button onClick={() => router.push('/admin/projects')} className="w-full sm:w-auto">
              <FolderOpen className="h-4 w-4 mr-2" />
              Manage Projects
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* User Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Your role:</span>
              <Badge variant="secondary">{currentUserRole}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''} assigned
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Projects</CardTitle>
          <CardDescription>
            Projects you have access to
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Project Name */}
                      <div>
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {project.description || 'No description'}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{project.assignment_count || 0} members</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Files className="h-3 w-3" />
                          <span>{project.file_count || 0} files</span>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatDate(project.created_at)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/projects/${project.id}/files`)}
                          className="flex-1"
                        >
                          <Files className="h-3 w-3 mr-1" />
                          Files
                        </Button>
                        {currentUserRole === 'Admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/projects/${project.id}`)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects assigned</p>
              <p className="text-sm">Contact an admin to get assigned to projects</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions for Admin */}
      {currentUserRole === 'Admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Quick Actions</CardTitle>
            <CardDescription>Manage the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/projects')}
                className="h-16 flex flex-col items-center justify-center space-y-1"
              >
                <FolderOpen className="h-5 w-5" />
                <span className="text-sm">Manage Projects</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin')}
                className="h-16 flex flex-col items-center justify-center space-y-1"
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Manage Users</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/users')}
                className="h-16 flex flex-col items-center justify-center space-y-1"
              >
                <Settings className="h-5 w-5" />
                <span className="text-sm">View All Users</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}