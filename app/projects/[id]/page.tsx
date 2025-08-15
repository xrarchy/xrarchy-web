'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
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
    ArrowLeft,
    Eye,
    User
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { use } from 'react';

interface Project {
    id: string;
    name: string;
    description: string;
    created_at: string;
    created_by_email: string;
    latitude?: number;
    longitude?: number;
    location_name?: string;
    address?: string;
    location_description?: string;
}

interface ProjectAssignment {
    id: string;
    assigned_user_id: string;
    profiles: {
        email: string;
        role: string;
    };
}

interface ProjectFile {
    id: string;
    name: string;
    size: number;
    content_type: string;
    uploaded_at: string;
    uploaded_by_profile: {
        email: string;
    };
    height?: number | null;
    rotation?: number | null;
}

export default function UserProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use() for Next.js 15
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;

    const [project, setProject] = useState<Project | null>(null);
    const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();
    const { user } = useAuthStore();

    const fetchProjectData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            // Fetch project details
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select(`
                    *,
                    created_by_profile:profiles!projects_created_by_fkey(email)
                `)
                .eq('id', projectId)
                .single();

            if (projectError) {
                console.error('Error fetching project:', projectError);
                setError('Failed to load project details.');
                return;
            }

            const transformedProject: Project = {
                id: projectData.id,
                name: projectData.name,
                description: projectData.description,
                created_at: projectData.created_at,
                created_by_email: projectData.created_by_profile?.email || 'Unknown',
                latitude: projectData.latitude,
                longitude: projectData.longitude,
                location_name: projectData.location_name,
                address: projectData.address,
                location_description: projectData.location_description
            };

            setProject(transformedProject);

            // Fetch project assignments (team members)
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('project_assignments')
                .select(`
                    id,
                    assigned_user_id,
                    profiles!assigned_user_id(email, role)
                `)
                .eq('project_id', projectId);

            if (assignmentsError) {
                console.error('Error fetching assignments:', assignmentsError);
            } else {
                // Transform the data to match our interface
                const transformedAssignments: ProjectAssignment[] = (assignmentsData || []).map(assignment => ({
                    id: assignment.id,
                    assigned_user_id: assignment.assigned_user_id,
                    profiles: Array.isArray(assignment.profiles) ? assignment.profiles[0] : assignment.profiles
                }));
                setAssignments(transformedAssignments);
            }

            // Fetch project files
            const { data: filesData, error: filesError } = await supabase
                .from('files')
                .select(`
                    id,
                    file_name,
                    file_size,
                    height,
                    rotation,
                    file_url,
                    created_at,
                    uploaded_by
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (filesError) {
                console.error('Error fetching files:', filesError);
                console.error('Files error details:', JSON.stringify(filesError, null, 2));
                // Don't fail the entire page for files error - just show empty files
                setFiles([]);
            } else {
                console.log('Files fetched successfully:', filesData?.length || 0, 'files');

                // Fetch uploader emails separately to avoid join issues
                const uploaderIds = [...new Set(filesData?.map(file => file.uploaded_by).filter(Boolean) || [])];
                let uploaderProfiles: { [key: string]: string } = {};

                if (uploaderIds.length > 0) {
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, email')
                        .in('id', uploaderIds);

                    uploaderProfiles = (profilesData || []).reduce((acc, profile) => {
                        acc[profile.id] = profile.email;
                        return acc;
                    }, {} as { [key: string]: string });
                }

                // Transform the data to match our interface
                const transformedFiles: ProjectFile[] = (filesData || []).map(file => ({
                    id: file.id,
                    name: file.file_name,
                    size: file.file_size || 0,
                    content_type: 'application/octet-stream', // Default since we don't have this column
                    uploaded_at: file.created_at,
                    uploaded_by_profile: {
                        email: uploaderProfiles[file.uploaded_by] || 'Unknown'
                    }
                    ,height: file.height ?? null,
                    rotation: file.rotation ?? null
                }));
                setFiles(transformedFiles);
            }

        } catch (error) {
            console.error('Error in fetchProjectData:', error);
            setError('An unexpected error occurred while loading project data.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Fetch user role and handle redirects
    useEffect(() => {
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

                        // Redirect non-User roles to their appropriate project pages
                        if (roleData.role === 'Admin') {
                            router.replace(`/admin/projects/${projectId}`);
                            return;
                        } else if (roleData.role === 'Archivist') {
                            router.replace(`/archivist/projects/${projectId}`);
                            return;
                        }

                        // If User role, start fetching project data
                        if (roleData.role === 'User') {
                            fetchProjectData();
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                }
            }
        };

        if (user) {
            getUserRole();
        }
    }, [user, projectId, router, fetchProjectData]);

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
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const goBack = () => {
        router.push('/projects');
    };

    // Show loading while checking role or if redirecting
    if (loading || (userRole && userRole !== 'User')) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">
                                    {userRole && userRole !== 'User' ? 'Redirecting...' : 'Loading project details...'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                        {error}
                    </AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={goBack}
                    className="mt-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                </Button>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container mx-auto p-6">
                <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-700">
                        Project not found or you don't have permission to view it.
                    </AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={goBack}
                    className="mt-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="outline"
                        onClick={goBack}
                        className="hover:bg-gray-50"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Projects
                    </Button>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Eye className="w-4 h-4 mr-1" />
                        View Only
                    </Badge>
                </div>

                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <FolderOpen className="h-8 w-8 text-blue-600" />
                        {project.name}
                    </h1>
                    <p className="text-gray-600">
                        {project.description || 'No description available'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Project Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Project Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Created By</label>
                                    <p className="text-gray-900">{project.created_by_email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Created Date</label>
                                    <p className="text-gray-900 flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-500" />
                                        {formatDate(project.created_at)}
                                    </p>
                                </div>
                                {(project.location_name || project.address || (project.latitude && project.longitude)) && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Location</label>
                                        <div className="space-y-2">
                                            {project.location_name && (
                                                <p className="text-gray-900 flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-gray-500" />
                                                    {project.location_name}
                                                </p>
                                            )}
                                            {project.address && (
                                                <p className="text-gray-700 text-sm pl-6">
                                                    📍 {project.address}
                                                </p>
                                            )}
                                            {project.location_description && (
                                                <p className="text-gray-600 text-sm pl-6">
                                                    📝 {project.location_description}
                                                </p>
                                            )}
                                            {project.latitude && project.longitude && (
                                                <p className="text-gray-500 text-xs pl-6">
                                                    🗺️ Coordinates: {project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project Files */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Files className="h-5 w-5 text-blue-600" />
                                Project Files ({files.length})
                            </CardTitle>
                            <CardDescription>
                                Files associated with this project (view-only)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {files.length === 0 ? (
                                <div className="text-center py-8">
                                    <Files className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <p className="text-gray-500">No files uploaded yet</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File Name</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Height</TableHead>
                                                <TableHead>Rotation</TableHead>
                                                <TableHead>Uploaded By</TableHead>
                                                <TableHead>Uploaded Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {files.map((file) => (
                                                <TableRow key={file.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Files className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                            {file.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatFileSize(file.size)}</TableCell>
                                                    <TableCell>{file.height !== undefined && file.height !== null ? `${Number(file.height).toFixed(4)} m` : '—'}</TableCell>
                                                    <TableCell>{file.rotation !== undefined && file.rotation !== null ? `${Number(file.rotation).toFixed(2)}°` : '—'}</TableCell>
                                                    <TableCell>{file.uploaded_by_profile.email}</TableCell>
                                                    <TableCell>{formatDate(file.uploaded_at)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Team Members */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Team Members ({assignments.length})
                            </CardTitle>
                            <CardDescription>
                                People working on this project
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {assignments.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <p className="text-gray-500">No team members assigned</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {assignments.map((assignment) => (
                                        <div
                                            key={assignment.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <User className="h-5 w-5 text-gray-500" />
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {assignment.profiles.email}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${assignment.profiles.role === 'Admin' ? 'border-red-200 text-red-700' :
                                                                assignment.profiles.role === 'Archivist' ? 'border-blue-200 text-blue-700' :
                                                                    'border-green-200 text-green-700'
                                                            }`}
                                                    >
                                                        {assignment.profiles.role}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
