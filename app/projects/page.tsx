'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FolderOpen,
    AlertCircle,
    Users,
    Files,
    Calendar,
    MapPin,
    Eye
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface Project {
    id: string;
    name: string;
    description: string;
    created_at: string;
    created_by_email: string;
    assignment_count: number;
    file_count: number;
    latitude?: number;
    longitude?: number;
    location_name?: string;
    address?: string;
    location_description?: string;
    is_assigned?: boolean;
}

interface ApiProject {
    id: string;
    name: string;
    description: string;
    created_at: string;
    created_by_profile?: {
        email: string;
    };
    assignment_count?: number;
    file_count?: number;
    latitude?: number;
    longitude?: number;
    location_name?: string;
    address?: string;
    location_description?: string;
    is_assigned?: boolean;
}

export default function UserProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();
    const { user } = useAuthStore();

    useEffect(() => {
        // Start loading projects immediately for better UX
        fetchProjects();

        // Also get user role in parallel
        const getUserRole = async () => {
            if (user?.id) {
                try {
                    const roleResponse = await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getUserRole', userId: user.id }),
                    });

                    if (roleResponse.ok) {
                        const roleData = await roleResponse.json();
                        setUserRole(roleData.role);

                        // Only redirect if not User role
                        if (roleData.role === 'Admin') {
                            router.replace('/admin/projects'); // Use replace to avoid history entry
                            return;
                        } else if (roleData.role === 'Archivist') {
                            router.replace('/archivist/projects');
                            return;
                        }
                    } else {
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setUserRole(null);
                }
            } else {
                setUserRole(null);
            }
        };

        if (user) {
            getUserRole();
        }
    }, [user, router]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError(null);

            // Use the browse API endpoint which allows Users to see all projects
            const response = await fetch('/api/projects/browse');

            if (!response.ok) {
                if (response.status === 401) {
                    setError('You need to be logged in to view projects.');
                    return;
                } else if (response.status === 403) {
                    setError('You don\'t have permission to view projects.');
                    return;
                } else {
                    setError('Failed to load projects. Please try again.');
                    return;
                }
            }

            const data = await response.json();

            // Handle the API response structure
            if (data.success && data.data && data.data.projects) {
                // Transform the API data to match our interface
                const transformedProjects: Project[] = data.data.projects.map((project: ApiProject) => ({
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    created_at: project.created_at,
                    created_by_email: project.created_by_profile?.email || 'Unknown',
                    assignment_count: project.assignment_count || 0,
                    file_count: project.file_count || 0,
                    latitude: project.latitude,
                    longitude: project.longitude,
                    location_name: project.location_name,
                    address: project.address,
                    location_description: project.location_description,
                    is_assigned: project.is_assigned || false
                }));

                setProjects(transformedProjects);
                setUserRole(data.data.userRole);
            } else {
                // Empty response or no projects
                setProjects([]);
            }
        } catch (error) {
            console.error('Error in fetchProjects:', error);
            setError('An unexpected error occurred while loading projects.');
        } finally {
            setLoading(false);
        }
    };

    const viewProject = (projectId: string) => {
        router.push(`/projects/${projectId}`);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Don't show content if redirecting to avoid flicker
    if (userRole && userRole !== 'User') {
        return (
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Browse Projects
                            </h1>
                            <p className="text-gray-600">
                                Redirecting you to the appropriate projects page...
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Redirecting...</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading && projects.length === 0) {
        return (
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {userRole === 'User' ? 'Browse Projects' : 'Your Assigned Projects'}
                            </h1>
                            <p className="text-gray-600">
                                {userRole === 'User'
                                    ? 'Explore all projects in the system'
                                    : 'View projects that have been assigned to you'
                                }
                            </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                            <Eye className="w-4 h-4 mr-1" />
                            {userRole === 'User' ? 'Browse All' : 'Assigned Only'}
                        </Badge>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading projects...</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {userRole === 'User' ? 'Browse Projects' : 'Your Assigned Projects'}
                        </h1>
                        <p className="text-gray-600">
                            {userRole === 'User'
                                ? 'Explore all projects in the system'
                                : 'View projects that have been assigned to you'
                            }
                        </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        <Eye className="w-4 h-4 mr-1" />
                        {userRole === 'User' ? 'Browse All' : 'Assigned Only'}
                    </Badge>
                </div>
            </div>            {error && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-green-600" />
                        {userRole === 'User' ? `All Projects (${projects.length})` : `Your Projects (${projects.length})`}
                    </CardTitle>
                    <CardDescription>
                        {userRole === 'User'
                            ? 'Browse and explore all projects in the system'
                            : 'Projects that have been assigned to you by administrators'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length === 0 ? (
                        <div className="text-center py-12">
                            <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {userRole === 'User' ? 'No projects available' : 'No assigned projects'}
                            </h3>
                            <p className="text-gray-500">
                                {userRole === 'User'
                                    ? 'There are currently no projects in the system.'
                                    : 'You haven\'t been assigned to any projects yet. Contact your administrator to get assigned to projects.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Created By</TableHead>
                                        <TableHead className="text-center">
                                            <Users className="h-4 w-4 inline mr-1" />
                                            Team
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <Files className="h-4 w-4 inline mr-1" />
                                            Files
                                        </TableHead>
                                        <TableHead>
                                            <Calendar className="h-4 w-4 inline mr-1" />
                                            Created
                                        </TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.map((project) => (
                                        <TableRow key={project.id} className="hover:bg-gray-50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                    <div>
                                                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                            {project.name}
                                                            {userRole === 'User' && project.is_assigned && (
                                                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                                                    Assigned
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {(project.location_name || project.address) && (
                                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                                <MapPin className="h-3 w-3" />
                                                                <span>
                                                                    {project.location_name}
                                                                    {project.address && project.location_name && ', '}
                                                                    {project.address}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {project.latitude && project.longitude && (
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                📍 {project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs">
                                                    <p className="text-sm text-gray-600 truncate" title={project.description}>
                                                        {project.description || 'No description'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-gray-700">
                                                    {project.created_by_email}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-xs">
                                                    {project.assignment_count} member{project.assignment_count !== 1 ? 's' : ''}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-xs">
                                                    {project.file_count} file{project.file_count !== 1 ? 's' : ''}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(project.created_at)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => viewProject(project.id)}
                                                    className={
                                                        userRole === 'User' && project.is_assigned
                                                            ? "hover:bg-green-50 hover:border-green-300"
                                                            : "hover:bg-blue-50 hover:border-blue-300"
                                                    }
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    {userRole === 'User' && project.is_assigned ? 'Work' : 'View'}
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
        </div>
    );
}
