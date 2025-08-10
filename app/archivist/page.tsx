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
    AlertCircle,
    Users,
    Files,
    Calendar,
    Edit,
    UserPlus
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    description: string;
    created_at: string;
    assignment_count: number;
    file_count: number;
}

export default function ArchivistDashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    // Check if user is archivist
    const checkArchivistAccess = useCallback(async () => {
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                router.push('/login');
                return false;
            }

            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', sessionData.session.user.id)
                .single();

            if (userError || userData?.role !== 'Archivist') {
                router.push('/');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Archivist access check error:', error);
            router.push('/');
            return false;
        }
    }, [supabase, router]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            const hasAccess = await checkArchivistAccess();
            if (!hasAccess) return;

            // Get current user session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to view dashboard');
                return;
            }

            setCurrentUserEmail(sessionData.session.user.email || 'Unknown User');

            // Fetch assigned projects
            const projectsResponse = await fetch('/api/projects', {
                headers: {
                    'Authorization': `Bearer ${sessionData.session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            const projectsData = await projectsResponse.json();

            if (!projectsResponse.ok) {
                setError(projectsData.error || 'Failed to fetch projects');
                return;
            }

            setProjects(projectsData.projects);



            setError(null);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [supabase, checkArchivistAccess]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

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
                    <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Archivist Dashboard</h1>
                        <p className="text-sm text-muted-foreground">Welcome back, {currentUserEmail}</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => router.push('/archivist/projects')} className="w-full sm:w-auto">
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Manage Projects
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Role Info */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Your role:</span>
                            <Badge variant="secondary">Archivist</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {projects?.length || 0} project{(projects?.length || 0) !== 1 ? 's' : ''} assigned
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <FolderOpen className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{projects?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Assigned Projects</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Files className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {projects?.reduce((sum, p) => sum + (p.file_count || 0), 0) || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Files</p>
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
                                    {projects?.reduce((sum, p) => sum + (p.assignment_count || 0), 0) || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Team Members</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-8 w-8 text-orange-600" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {projects?.filter(p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Recent Projects</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assigned Projects */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Assigned Projects</CardTitle>
                    <CardDescription>
                        Projects you can manage and organize
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {(projects?.length || 0) > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects?.map((project) => (
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
                                                    onClick={() => router.push(`/archivist/projects/${project.id}/files`)}
                                                    className="flex-1"
                                                >
                                                    <Files className="h-3 w-3 mr-1" />
                                                    Files
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/archivist/projects/${project.id}`)}
                                                    className="flex-1"
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Manage
                                                </Button>
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

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Archivist Actions</CardTitle>
                    <CardDescription>Manage your assigned projects</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/archivist/projects')}
                            className="h-16 flex flex-col items-center justify-center space-y-1"
                        >
                            <FolderOpen className="h-5 w-5" />
                            <span className="text-sm">Manage Projects</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                            className="h-16 flex flex-col items-center justify-center space-y-1"
                        >
                            <UserPlus className="h-5 w-5" />
                            <span className="text-sm">Home</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}