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
    ArrowLeft,
    AlertCircle,
    Users,
    Files,
    Archive,
    Upload,
    Download
} from 'lucide-react';

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
    file_url?: string; // Add this for consistency with the files API
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

export default function ArchivistProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
    const [project, setProject] = useState<Project | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState<string>('');
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const supabase = createClient();
    const router = useRouter();

    // Resolve params
    useEffect(() => {
        const resolveParams = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.projectId);
        };
        resolveParams();
    }, [params]);

    const fetchProject = useCallback(async () => {
        if (!projectId) return;

        try {
            setLoading(true);

            // Get current user session and verify archivist access
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                setError('Please log in to view project');
                router.push('/login');
                return;
            }

            // Verify archivist access
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', sessionData.session.user.id)
                .single();

            if (!profile || (profile.role !== 'Archivist' && profile.role !== 'Admin')) {
                setError('Archivist access required');
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
            setError(null);
        } catch (error) {
            console.error('Project fetch error:', error);
            setError('Failed to load project');
        } finally {
            setLoading(false);
        }
    }, [supabase, router, projectId]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);



    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        try {
            const formData = new FormData();
            formData.append('file', uploadFile);

            const response = await fetch(`/api/projects/${projectId}/files`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to upload file');
                return;
            }

            setShowFileUpload(false);
            setUploadFile(null);
            fetchProject();
        } catch (error) {
            console.error('File upload error:', error);
            setError('Failed to upload file');
        }
    };

    const downloadFile = async (file: ProjectFile) => {
        try {
            console.log('Download attempt for file:', file);
            const fileUrl = file.file_url || file.url; // Use file_url if available, fallback to url
            console.log('File URL:', fileUrl);

            const { data, error } = await supabase.storage
                .from('project-files')
                .createSignedUrl(fileUrl, 3600);

            console.log('Signed URL response:', { data, error });

            if (error) {
                console.error('Signed URL error:', error);
                setError(`Failed to generate download link: ${error.message}`);
                return;
            }

            if (data?.signedUrl) {
                console.log('Signed URL created:', data.signedUrl);

                try {
                    // Use fetch to get the file data and trigger download
                    const response = await fetch(data.signedUrl);
                    console.log('Fetch response status:', response.status, response.statusText);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
                    }

                    const blob = await response.blob();
                    console.log('Blob created:', blob.type, blob.size);

                    const url = window.URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    link.download = file.name;
                    link.style.display = 'none';
                    document.body.appendChild(link);

                    console.log('Triggering download for:', file.name);
                    link.click();

                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        console.log('Download cleanup completed');
                    }, 100);

                } catch (fetchError) {
                    console.error('Fetch/download error:', fetchError);
                    // Fallback: open in new tab if fetch fails
                    console.log('Falling back to direct URL approach');
                    window.open(data.signedUrl, '_blank');
                }
            } else {
                console.error('No signed URL returned');
                setError('Failed to generate download link');
            }
        } catch (error) {
            console.error('Download error:', error);
            setError(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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

    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
                <div className="text-center space-y-4">
                    <Archive className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
                    <p className="text-gray-600">Loading project details...</p>
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
                <Button
                    variant="outline"
                    onClick={() => router.push('/archivist/projects')}
                    className="w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                </Button>
                <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-blue-600" />
                    <Badge variant="secondary" className="text-xs">Archivist View</Badge>
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
                        onClick={() => setShowFileUpload(!showFileUpload)}
                        className="w-full sm:w-auto"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}



            {showFileUpload && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload File</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="file">Select File</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button type="submit" className="w-full sm:w-auto">Upload File</Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowFileUpload(false)}
                                    className="w-full sm:w-auto"
                                >
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

            {/* Team Members */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Users assigned to this project</CardDescription>
                </CardHeader>
                <CardContent>
                    {project.assignments && project.assignments.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Assigned</TableHead>
                                        <TableHead>Assigned By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {project.assignments.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell className="font-medium">{assignment.assigned_user.email}</TableCell>
                                            <TableCell className="text-sm">{formatDate(assignment.assigned_at)}</TableCell>
                                            <TableCell className="text-sm">{assignment.assigned_by_user.email}</TableCell>
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

            {/* Project Files */}
            <Card>
                <CardHeader>
                    <CardTitle>Project Files</CardTitle>
                    <CardDescription>Files uploaded to this project</CardDescription>
                </CardHeader>
                <CardContent>
                    {project.files && project.files.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead>Uploaded By</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {project.files.map((file) => (
                                        <TableRow key={file.id}>
                                            <TableCell className="font-medium">{file.name}</TableCell>
                                            <TableCell>{formatFileSize(file.size)}</TableCell>
                                            <TableCell className="text-sm">{formatDate(file.created_at)}</TableCell>
                                            <TableCell className="text-sm">{file.uploaded_by_user.email}</TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => downloadFile(file)}
                                                >
                                                    <Download className="h-3 w-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Files className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No files uploaded yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}