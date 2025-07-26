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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft,
    AlertCircle,
    Users,
    Files,
    Trash2,
    UserPlus,
    Edit
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ProjectAssignment {
    id: string;
    project_role: string;
    assigned_at: string;
    assigned_user: {
        id: string;
        email: string;
    };
    assigned_by_user: {
        email: string;
    };
}

interface ProjectFile {
    id: string;
    name: string;
    url: string;
    size: number;
    created_at: string;
    uploaded_by_user: {
        email: string;
    };
}

interface Project {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    created_by_profile: {
        email: string;
    };
    assignments: ProjectAssignment[];
    files: ProjectFile[];
}

interface AllUser {
    id: string;
    email: string;
    role: string;
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
    const [project, setProject] = useState<Project | null>(null);
    const [allUsers, setAllUsers] = useState<AllUser[]>([]);
    // const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditProject, setShowEditProject] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedRole, setSelectedRole] = useState('Member');
    const [editProject, setEditProject] = useState({ name: '', description: '' });
    const [projectId, setProjectId] = useState<string>('');
    const [deleteUserDialog, setDeleteUserDialog] = useState<{
        isOpen: boolean;
        userId: string;
        userEmail: string;
    }>({
        isOpen: false,
        userId: '',
        userEmail: ''
    });
    const supabase = createClient();
    const router = useRouter();

    // Resolve params
    useEffect(() => {
        const resolveParams = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.id);
        };
        resolveParams();
    }, [params]);

    const fetchProject = useCallback(async () => {
        if (!projectId) return; // Wait for projectId to be set

        try {
            setLoading(true);

            // Get current user session and role
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to view project');
                router.push('/login');
                return;
            }

            const { error: userError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', sessionData.session.user.id)
                .single();

            if (userError) {
                setError('Failed to fetch user profile');
                return;
            }

            // setCurrentUserRole(userData.role as string);

            // Fetch project details from API
            const response = await fetch(`/api/projects/${projectId}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to fetch project');
                return;
            }

            setProject(data.project);
            setEditProject({
                name: data.project.name,
                description: data.project.description || ''
            });
            setError(null);
        } catch (error) {
            console.error('Project fetch error:', error);
            setError('Failed to load project');
        } finally {
            setLoading(false);
        }
    }, [supabase, router, projectId]);

    const fetchAllUsers = useCallback(async () => {
        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select('id, email, role');

            if (error) {
                console.error('Users fetch error:', error);
                return;
            }

            setAllUsers((users as AllUser[]) || []);
        } catch (error) {
            console.error('Users fetch error:', error);
        }
    }, [supabase]);

    useEffect(() => {
        fetchProject();
        fetchAllUsers();
    }, [fetchProject, fetchAllUsers]);

    const updateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!editProject.name.trim()) {
            setError('Project name is required');
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editProject),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to update project');
                return;
            }

            setShowEditProject(false);
            fetchProject(); // Refresh the project
        } catch (error) {
            console.error('Project update error:', error);
            setError('Failed to update project');
        }
    };

    const addUserToProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedUser) {
            setError('Please select a user');
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: selectedUser,
                    role: selectedRole
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to add user to project');
                return;
            }

            setSelectedUser('');
            setSelectedRole('Member');
            setShowAddUser(false);
            fetchProject(); // Refresh the project
        } catch (error) {
            console.error('Add user error:', error);
            setError('Failed to add user to project');
        }
    };

    const removeUserFromProject = async (userId: string) => {
        try {
            const response = await fetch(`/api/projects/${projectId}/users`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to remove user from project');
                return;
            }

            setDeleteUserDialog({ isOpen: false, userId: '', userEmail: '' });
            fetchProject(); // Refresh the project
        } catch (error) {
            console.error('Remove user error:', error);
            setError('Failed to remove user from project');
        }
    };

    const openDeleteUserDialog = (userId: string, userEmail: string) => {
        setDeleteUserDialog({
            isOpen: true,
            userId,
            userEmail
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const getCurrentUser = async () => {
            await supabase.auth.getSession();
            // setCurrentUserEmail(data.session?.user?.email || null);
        };
        getCurrentUser();
    }, [supabase]);

    const availableUsers = allUsers.filter(user =>
        // Only allow Admin or Archivist users to be assigned to projects
        (user.role === 'Admin' || user.role === 'Archivist') &&
        !project?.assignments?.some(assignment => assignment.assigned_user.id === user.id)
    );

    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
                <div className="space-y-4 sm:space-y-6">
                    {/* Header skeleton */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="min-w-0">
                                <div className="h-6 sm:h-8 w-48 sm:w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
                                <div className="h-4 w-64 sm:w-96 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="h-10 w-full sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-10 w-full sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>

                    {/* Stats cards skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="border rounded-lg p-4 sm:p-6">
                                <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                                <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>

                    {/* Team members skeleton */}
                    <div className="border rounded-lg">
                        <div className="p-4 sm:p-6 border-b">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <div>
                                    <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                                    <div className="h-3 sm:h-4 w-32 sm:w-48 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                                <div className="h-10 w-full sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-3 sm:space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 border rounded">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-6 sm:h-8 w-6 sm:w-8 bg-gray-200 rounded-full animate-pulse"></div>
                                            <div>
                                                <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                <div className="h-2 sm:h-3 w-16 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                        <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent files skeleton */}
                    <div className="border rounded-lg">
                        <div className="p-4 sm:p-6 border-b">
                            <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-3 sm:h-4 w-32 sm:w-48 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex justify-between items-center p-2 border rounded">
                                        <div>
                                            <div className="h-3 sm:h-4 w-32 sm:w-48 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-2 sm:h-3 w-40 sm:w-64 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
                <div className="text-center">Project not found</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-4 sm:space-y-6">
            {/* Header - Stack vertically on mobile */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button variant="outline" onClick={() => router.push('/projects')} className="w-fit">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Projects
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold break-words">{project.name}</h1>
                        <p className="text-muted-foreground text-sm sm:text-base break-words">{project.description || 'No description'}</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowEditProject(!showEditProject)}
                        className="w-full sm:w-auto"
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Project
                    </Button>
                    <Button onClick={() => router.push(`/projects/${projectId}/files`)} className="w-full sm:w-auto">
                        <Files className="h-4 w-4 mr-2" />
                        Manage Files
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {showEditProject && (
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Project</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={updateProject} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={editProject.name}
                                    onChange={(e) => setEditProject(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    type="text"
                                    value={editProject.description}
                                    onChange={(e) => setEditProject(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button type="submit" className="w-full sm:w-auto">Update Project</Button>
                                <Button type="button" variant="outline" onClick={() => setShowEditProject(false)} className="w-full sm:w-auto">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <Card>
                    <CardContent className="pt-4 sm:pt-6">
                        <div className="space-y-2">
                            <div className="text-xl sm:text-2xl font-bold">{project.assignments?.length || 0}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">Team Members</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 sm:pt-6">
                        <div className="space-y-2">
                            <div className="text-xl sm:text-2xl font-bold">{project.files?.length || 0}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">Files</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 sm:pt-6">
                        <div className="space-y-2">
                            <div className="text-xs sm:text-sm text-muted-foreground">Created</div>
                            <div className="text-xs sm:text-sm">{formatDate(project.created_at)}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>Users assigned to this project</CardDescription>
                        </div>
                        <Button onClick={() => setShowAddUser(!showAddUser)} className="w-full sm:w-auto">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Member
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {showAddUser && (
                        <div className="mb-6 p-4 border rounded-lg">
                            <form onSubmit={addUserToProject} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="user">Select User (Admin/Archivist only)</Label>
                                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose an Admin or Archivist" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableUsers.length > 0 ? (
                                                    availableUsers.map((user) => (
                                                        <SelectItem key={user.id} value={user.id}>
                                                            {user.email} ({user.role})
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="" disabled>
                                                        No Admin/Archivist users available
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Project Role</Label>
                                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Project Lead">Project Lead</SelectItem>
                                                <SelectItem value="Member">Member</SelectItem>
                                                <SelectItem value="Viewer">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button type="submit" className="w-full sm:w-auto">Add to Project</Button>
                                    <Button type="button" variant="outline" onClick={() => setShowAddUser(false)} className="w-full sm:w-auto">
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {project.assignments && project.assignments.length > 0 ? (
                        <>
                            {/* Desktop Table View - Hidden on mobile */}
                            <div className="hidden md:block rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Project Role</TableHead>
                                            <TableHead>Assigned</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {project.assignments.map((assignment) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell className="font-medium">
                                                    {assignment.assigned_user.email}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        assignment.project_role === 'Project Lead' ? 'default' :
                                                            assignment.project_role === 'Member' ? 'secondary' :
                                                                'outline'
                                                    }>
                                                        {assignment.project_role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(assignment.assigned_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDeleteUserDialog(assignment.assigned_user.id, assignment.assigned_user.email)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View - Hidden on desktop */}
                            <div className="md:hidden space-y-4">
                                {project.assignments.map((assignment) => (
                                    <Card key={assignment.id} className="border">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                {/* Email */}
                                                <div>
                                                    <span className="text-sm text-muted-foreground">Email:</span>
                                                    <div className="font-medium break-words">{assignment.assigned_user.email}</div>
                                                </div>

                                                {/* Role and Date */}
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">Role:</span>
                                                        <div>
                                                            <Badge variant={
                                                                assignment.project_role === 'Project Lead' ? 'default' :
                                                                    assignment.project_role === 'Member' ? 'secondary' :
                                                                        'outline'
                                                            }>
                                                                {assignment.project_role}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">Assigned:</span>
                                                        <div className="text-sm">{formatDate(assignment.assigned_at)}</div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="pt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDeleteUserDialog(assignment.assigned_user.id, assignment.assigned_user.email)}
                                                        className="text-red-600 hover:text-red-700 w-full"
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-2" />
                                                        Remove from Project
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
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No team members assigned</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Files</CardTitle>
                    <CardDescription>Latest files uploaded to this project</CardDescription>
                </CardHeader>
                <CardContent>
                    {project.files && project.files.length > 0 ? (
                        <div className="space-y-2">
                            {project.files.slice(0, 5).map((file: ProjectFile) => (
                                <div key={file.id} className="flex justify-between items-center p-2 border rounded">
                                    <div>
                                        <div className="font-medium">{file.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatFileSize(file.size)} • {file.uploaded_by_user.email} • {formatDate(file.created_at)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => router.push(`/projects/${projectId}/files`)}
                            >
                                View All Files ({project.files.length})
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Files className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No files uploaded yet</p>
                            <Button
                                className="mt-4"
                                onClick={() => router.push(`/projects/${projectId}/files`)}
                            >
                                Upload First File
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete User Confirmation Dialog */}
            <Dialog open={deleteUserDialog.isOpen} onOpenChange={(open) =>
                setDeleteUserDialog(prev => ({ ...prev, isOpen: open }))
            }>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Remove Team Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove{' '}
                            <span className="font-medium">{deleteUserDialog.userEmail}</span>{' '}
                            from this project? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteUserDialog({ isOpen: false, userId: '', userEmail: '' })}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => removeUserFromProject(deleteUserDialog.userId)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
