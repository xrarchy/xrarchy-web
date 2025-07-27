'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    FolderOpen,
    Plus,
    Settings,
    AlertCircle,
    Users,
    Files,
    Calendar,
    Edit,
    Trash2,
    AlertTriangle,
    ArrowLeft
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

export default function AdminProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; project: Project | null; isDeleting: boolean }>({
        isOpen: false,
        project: null,
        isDeleting: false
    });
    const supabase = createClient();
    const router = useRouter();

    // Check if user is admin
    const checkAdminAccess = useCallback(async () => {
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

            if (userError || userData?.role !== 'Admin') {
                router.push('/');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Admin access check error:', error);
            router.push('/');
            return false;
        }
    }, [supabase, router]);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);

            const hasAccess = await checkAdminAccess();
            if (!hasAccess) return;

            // Get current session for auth token
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to view projects');
                return;
            }

            // Fetch projects from API with auth token
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

            // Sort projects by creation date (newest first)
            const sortedProjects = data.projects.sort((a: Project, b: Project) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setProjects(sortedProjects);
            setError(null);
        } catch (error) {
            console.error('Projects fetch error:', error);
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    }, [supabase, checkAdminAccess]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const createProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newProject.name.trim()) {
            setError('Project name is required');
            return;
        }

        setIsCreatingProject(true);

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to create projects');
                return;
            }

            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session.access_token}`
                },
                body: JSON.stringify(newProject),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create project');
                return;
            }

            setNewProject({ name: '', description: '' });
            setShowCreateForm(false);
            fetchProjects();
        } catch (error) {
            console.error('Project creation error:', error);
            setError('Failed to create project');
        } finally {
            setIsCreatingProject(false);
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            setDeleteModal(prev => ({ ...prev, isDeleting: true }));

            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to delete projects');
                setDeleteModal({ isOpen: false, project: null, isDeleting: false });
                return;
            }

            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${sessionData.session.access_token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to delete project');
                setDeleteModal({ isOpen: false, project: null, isDeleting: false });
                return;
            }

            setDeleteModal({ isOpen: false, project: null, isDeleting: false });
            fetchProjects();
        } catch (error) {
            console.error('Project deletion error:', error);
            setError('Failed to delete project');
            setDeleteModal({ isOpen: false, project: null, isDeleting: false });
        }
    };

    const openDeleteModal = (project: Project) => {
        setDeleteModal({ isOpen: true, project, isDeleting: false });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, project: null, isDeleting: false });
    };

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
                        onClick={() => router.push('/admin')}
                        className="flex items-center space-x-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Admin</span>
                    </Button>
                    <div className="flex items-center space-x-2">
                        <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                        <h1 className="text-2xl sm:text-3xl font-bold">Project Management</h1>
                    </div>
                </div>
                <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {showCreateForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Project</CardTitle>
                        <CardDescription>Add a new project to organize work</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={createProject} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter project name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    type="text"
                                    value={newProject.description}
                                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter project description"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    type="submit"
                                    disabled={isCreatingProject}
                                    className="w-full sm:w-auto"
                                >
                                    {isCreatingProject ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Project'
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateForm(false)}
                                    disabled={isCreatingProject}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>All Projects</CardTitle>
                    <CardDescription>Manage all projects in the system</CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length > 0 ? (
                        <div className="rounded-md border">
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
                                                    onClick={() => router.push(`/admin/projects/${project.id}`)}
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
                                                        onClick={() => router.push(`/admin/projects/${project.id}`)}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/admin/projects/${project.id}/files`)}
                                                    >
                                                        <Files className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDeleteModal(project)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No projects found</p>
                            <Button
                                className="mt-4"
                                onClick={() => setShowCreateForm(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Project
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModal.isOpen} onOpenChange={closeDeleteModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Project
                        </DialogTitle>
                        <DialogDescription className="text-left">
                            Are you sure you want to delete the project{' '}
                            <span className="font-semibold text-foreground">
                                &quot;{deleteModal.project?.name}&quot;
                            </span>
                            ?
                            <br />
                            <br />
                            This action cannot be undone. All project data, files, and assignments will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={closeDeleteModal}
                            disabled={deleteModal.isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteModal.project && deleteProject(deleteModal.project.id)}
                            disabled={deleteModal.isDeleting}
                            className="gap-2"
                        >
                            {deleteModal.isDeleting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    Delete Project
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}