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
    Edit,
    Shield
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
    latitude?: number;
    longitude?: number;
    location_name?: string;
    address?: string;
    location_description?: string;
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

export default function AdminProjectDetail({ params }: { params: Promise<{ id: string }> }) {
    const [project, setProject] = useState<Project | null>(null);
    const [allUsers, setAllUsers] = useState<AllUser[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditProject, setShowEditProject] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [editProject, setEditProject] = useState({
        name: '',
        description: '',
        location_name: '',
        address: '',
        location_description: '',
        latitude: '',
        longitude: ''
    });
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
        if (!projectId) return;

        try {
            setLoading(true);

            // Get current user session and verify admin access
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to view project');
                router.push('/login');
                return;
            }

            // Verify admin access
            const adminResponse = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkAccess' }),
            });

            if (!adminResponse.ok) {
                setError('Admin access required');
                router.push('/');
                return;
            }

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
                description: data.project.description || '',
                location_name: data.project.location_name || '',
                address: data.project.address || '',
                location_description: data.project.location_description || '',
                latitude: data.project.latitude?.toString() || '',
                longitude: data.project.longitude?.toString() || ''
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
            fetchProject();
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
                    userId: selectedUser
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to add user to project');
                return;
            }

            // Success feedback
            const addedUser = allUsers.find(u => u.id === selectedUser);
            console.log(`✅ Successfully assigned ${addedUser?.email} to project`);

            setSelectedUser('');
            setShowAddUser(false);
            fetchProject();
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

            // Success feedback
            console.log(`✅ Successfully removed user from project`);

            setDeleteUserDialog({ isOpen: false, userId: '', userEmail: '' });
            fetchProject();
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

    const availableUsers = allUsers.filter(user =>
        !project?.assignments?.some(assignment => assignment.assigned_user.id === user.id)
    );

    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
                <div className="text-center space-y-4">
                    <Shield className="h-12 w-12 text-purple-600 mx-auto animate-pulse" />
                    <p className="text-gray-600">Loading admin project details...</p>
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
            {/* Back Button Row */}
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push('/admin/projects')} className="w-fit">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Admin Projects
                </Button>
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <Badge variant="secondary" className="text-xs">Admin View</Badge>
                </div>
            </div>

            {/* Project Header */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold break-words">{project.name}</h1>
                    <p className="text-muted-foreground text-sm sm:text-base break-words">
                        {project.description || 'No description'}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowEditProject(!showEditProject)}
                        className="w-full sm:w-auto"
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Project
                    </Button>
                    <Button
                        onClick={() => router.push(`/admin/projects/${projectId}/files`)}
                        className="w-full sm:w-auto"
                    >
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
                            {/* Basic Information */}
                            <div className="space-y-4 pb-4 border-b">
                                <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>
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
                                        placeholder="Optional project description"
                                    />
                                </div>
                            </div>

                            {/* Location Information */}
                            <div className="space-y-4 pb-4 border-b">
                                <h4 className="font-medium text-sm text-muted-foreground">Location Information</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="location_name">Location Name</Label>
                                    <Input
                                        id="location_name"
                                        type="text"
                                        value={editProject.location_name}
                                        onChange={(e) => setEditProject(prev => ({ ...prev, location_name: e.target.value }))}
                                        placeholder="e.g., Main Building, Site A"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        type="text"
                                        value={editProject.address}
                                        onChange={(e) => setEditProject(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="Full street address"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location_description">Location Description</Label>
                                    <Input
                                        id="location_description"
                                        type="text"
                                        value={editProject.location_description}
                                        onChange={(e) => setEditProject(prev => ({ ...prev, location_description: e.target.value }))}
                                        placeholder="Additional location details"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude">Latitude</Label>
                                        <Input
                                            id="latitude"
                                            type="number"
                                            step="any"
                                            value={editProject.latitude}
                                            onChange={(e) => setEditProject(prev => ({ ...prev, latitude: e.target.value }))}
                                            placeholder="e.g., 40.7128"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude">Longitude</Label>
                                        <Input
                                            id="longitude"
                                            type="number"
                                            step="any"
                                            value={editProject.longitude}
                                            onChange={(e) => setEditProject(prev => ({ ...prev, longitude: e.target.value }))}
                                            placeholder="e.g., -74.0060"
                                        />
                                    </div>
                                </div>
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

            {/* Project Stats */}
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

            {/* Location Information */}
            {(project.location_name || project.address || project.location_description || project.latitude || project.longitude) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Location Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {project.location_name && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Location Name</div>
                                <div className="text-sm">{project.location_name}</div>
                            </div>
                        )}
                        {project.address && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Address</div>
                                <div className="text-sm">{project.address}</div>
                            </div>
                        )}
                        {project.location_description && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Description</div>
                                <div className="text-sm">{project.location_description}</div>
                            </div>
                        )}
                        {(project.latitude && project.longitude) && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Coordinates</div>
                                <div className="text-sm font-mono">
                                    {project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Team Members Management */}
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
                                <div className="space-y-2">
                                    <Label htmlFor="user">Select User</Label>
                                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose any user to assign" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUsers.length > 0 ? (
                                                <>
                                                    {/* Group by role for better organization */}
                                                    {['Admin', 'Archivist', 'User'].map(role => {
                                                        const roleUsers = availableUsers.filter(user => user.role === role);
                                                        return roleUsers.length > 0 ? (
                                                            <div key={role}>
                                                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded-t-md">
                                                                    {role}s ({roleUsers.length})
                                                                </div>
                                                                {roleUsers.map((user) => (
                                                                    <SelectItem key={user.id} value={user.id}>
                                                                        {user.email}
                                                                    </SelectItem>
                                                                ))}
                                                            </div>
                                                        ) : null;
                                                    })}
                                                </>
                                            ) : (
                                                <SelectItem value="" disabled>
                                                    No users available
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
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
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
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
                                                    allUsers.find(u => u.id === assignment.assigned_user.id)?.role === 'Admin' ? 'default' :
                                                        allUsers.find(u => u.id === assignment.assigned_user.id)?.role === 'Archivist' ? 'secondary' :
                                                            'outline'
                                                }>
                                                    {allUsers.find(u => u.id === assignment.assigned_user.id)?.role || 'User'}
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
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No team members assigned yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete User Dialog */}
            <Dialog open={deleteUserDialog.isOpen} onOpenChange={(open) =>
                setDeleteUserDialog(prev => ({ ...prev, isOpen: open }))
            }>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove User from Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove {deleteUserDialog.userEmail} from this project?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
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
                            Remove User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}