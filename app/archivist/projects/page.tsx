'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    FolderOpen,
    AlertCircle,
    Users,
    Files,
    Calendar,
    Edit,
    ArrowLeft,
    UserPlus
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    created_by_profile: {
        email: string;
    };
    assignment_count: number;
    file_count: number;
}

export default function ArchivistProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
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

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);

            const hasAccess = await checkArchivistAccess();
            if (!hasAccess) return;

            // Get current session for auth token
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to view projects');
                return;
            }

            // Fetch assigned projects from API with auth token
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
    }, [supabase, checkArchivistAccess]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

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
                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
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
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/archivist')}
                        className="flex items-center space-x-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Dashboard</span>
                    </Button>
                    <div className="flex items-center space-x-2">
                        <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                        <h1 className="text-2xl sm:text-3xl font-bold">Project Management</h1>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Info Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Your role:</span>
                            <Badge variant="secondary">Archivist</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {projects.length} project{projects.length !== 1 ? 's' : ''} assigned
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Assigned Projects</CardTitle>
                    <CardDescription>
                        Projects you can manage and assign users to
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Created By</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Members</TableHead>
                                            <TableHead>Files</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {projects.map((project) => (
                                            <TableRow key={project.id}>
                                                <TableCell className="font-medium">
                                                    <Button
                                                        variant="link"
                                                        className="p-0 h-auto font-medium text-left"
                                                        onClick={() => router.push(`/archivist/projects/${project.id}`)}
                                                    >
                                                        {project.name}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {project.description || 'No description'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {project.created_by_profile?.email || 'Unknown'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="flex items-center space-x-1">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{formatDate(project.created_at)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-1">
                                                        <Users className="h-3 w-3" />
                                                        <span>{project.assignment_count || 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-1">
                                                        <Files className="h-3 w-3" />
                                                        <span>{project.file_count || 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex space-x-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.push(`/archivist/projects/${project.id}`)}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.push(`/projects/${project.id}/files`)}
                                                        >
                                                            <Files className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {projects.map((project) => (
                                    <Card key={project.id} className="border">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                {/* Project Name */}
                                                <div>
                                                    <Button
                                                        variant="link"
                                                        className="p-0 h-auto font-medium text-left text-lg"
                                                        onClick={() => router.push(`/archivist/projects/${project.id}`)}
                                                    >
                                                        {project.name}
                                                    </Button>
                                                </div>

                                                {/* Description */}
                                                <div className="text-sm text-muted-foreground">
                                                    {project.description || 'No description'}
                                                </div>

                                                {/* Meta Information */}
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Created by:</span>
                                                        <div className="font-medium">{project.created_by_profile?.email || 'Unknown'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Created:</span>
                                                        <div className="flex items-center space-x-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{formatDate(project.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center space-x-1">
                                                        <Users className="h-3 w-3" />
                                                        <span>{project.assignment_count || 0} members</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Files className="h-3 w-3" />
                                                        <span>{project.file_count || 0} files</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/archivist/projects/${project.id}`)}
                                                        className="flex-1 min-w-0"
                                                    >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Manage
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/projects/${project.id}/files`)}
                                                        className="flex-1 min-w-0"
                                                    >
                                                        <Files className="h-3 w-3 mr-1" />
                                                        Files
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
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
                    <CardTitle>Available Actions</CardTitle>
                    <CardDescription>What you can do as an Archivist</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin/users')}
                            className="h-16 flex flex-col items-center justify-center space-y-1"
                        >
                            <UserPlus className="h-5 w-5" />
                            <span className="text-sm">Assign Users</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/archivist')}
                            className="h-16 flex flex-col items-center justify-center space-y-1"
                        >
                            <FolderOpen className="h-5 w-5" />
                            <span className="text-sm">Dashboard</span>
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