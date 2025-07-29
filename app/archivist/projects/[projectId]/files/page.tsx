'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Upload,
    AlertCircle,
    Files as FilesIcon,
    Calendar,
    Trash2,
    Download,
    User,
    AlertTriangle,
    Archive
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ProjectFile {
    id: string;
    filename: string;
    file_size: number;
    file_url: string;
    created_at: string;
    uploaded_by: {
        id: string;
        email: string;
    };
}

interface Project {
    id: string;
    name: string;
}

export default function ArchivistProjectFiles({ params }: { params: Promise<{ projectId: string }> }) {
    const [project, setProject] = useState<Project | null>(null);
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        fileId: string;
        fileName: string;
        isDeleting: boolean;
    }>({
        isOpen: false,
        fileId: '',
        fileName: '',
        isDeleting: false
    });

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

    const fetchProjectAndFiles = useCallback(async () => {
        if (!projectId) return;

        try {
            setLoading(true);

            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                setError('Please log in to view files');
                router.push('/login');
                return;
            }

            setCurrentUserId(user.id);

            // Verify archivist access
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!profile || (profile.role !== 'Archivist' && profile.role !== 'Admin')) {
                setError('Archivist access required');
                router.push('/');
                return;
            }

            // Fetch project basic info
            const projectResponse = await fetch(`/api/projects/${projectId}`);
            const projectData = await projectResponse.json();

            if (!projectResponse.ok) {
                setError(projectData.error || 'Failed to fetch project');
                return;
            }

            setProject({ id: projectData.project.id, name: projectData.project.name });

            // Fetch project files
            const filesResponse = await fetch(`/api/projects/${projectId}/files`);
            const filesData = await filesResponse.json();

            if (!filesResponse.ok) {
                setError(filesData.error || 'Failed to fetch files');
                return;
            }

            setFiles(filesData.projectFiles);
            setError(null);
        } catch (error) {
            console.error('Fetch error:', error);
            setError('Failed to load project files');
        } finally {
            setLoading(false);
        }
    }, [supabase, router, projectId]);

    useEffect(() => {
        fetchProjectAndFiles();
    }, [fetchProjectAndFiles]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                return;
            }
            setSelectedFile(file);
            setError(null);
        }
    };

    const uploadFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setError('Please select a file to upload');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            if (description) {
                formData.append('description', description);
            }

            const response = await fetch(`/api/projects/${projectId}/files`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to upload file');
                return;
            }

            setSelectedFile(null);
            setDescription('');
            setShowUpload(false);
            fetchProjectAndFiles();
        } catch (error) {
            console.error('Upload error:', error);
            setError('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const openDeleteDialog = (fileId: string, fileName: string) => {
        setDeleteDialog({
            isOpen: true,
            fileId,
            fileName,
            isDeleting: false
        });
    };

    const closeDeleteDialog = () => {
        setDeleteDialog({
            isOpen: false,
            fileId: '',
            fileName: '',
            isDeleting: false
        });
    };

    const confirmDeleteFile = async () => {
        setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/files`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileId: deleteDialog.fileId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to delete file');
                setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
                return;
            }

            closeDeleteDialog();
            fetchProjectAndFiles();
        } catch (error) {
            console.error('Delete error:', error);
            setError('Failed to delete file');
            setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
        }
    };

    const downloadFile = async (file: ProjectFile) => {
        try {
            const { data } = await supabase.storage
                .from('project-files')
                .createSignedUrl(file.file_url, 3600);

            if (data?.signedUrl) {
                const link = document.createElement('a');
                link.href = data.signedUrl;
                link.download = file.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setError('Failed to generate download link');
            }
        } catch (error) {
            console.error('Download error:', error);
            setError('Failed to download file');
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
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const canDelete = (file: ProjectFile) => {
        // Archivists can delete files they uploaded
        return file.uploaded_by.id === currentUserId;
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
                <div className="text-center space-y-4">
                    <Archive className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
                    <p className="text-gray-600">Loading project files...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container mx-auto p-6 max-w-6xl">
                <div className="text-center">Project not found</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={() => router.push(`/archivist/projects/${projectId}`)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Project
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold">Files</h1>
                            <Badge variant="secondary" className="text-xs">
                                <Archive className="h-3 w-3 mr-1" />
                                Archivist
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm sm:text-base">Files for {project.name}</p>
                    </div>
                </div>
                <Button onClick={() => setShowUpload(!showUpload)} className="w-full sm:w-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {showUpload && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload File</CardTitle>
                        <CardDescription>Add a new file to this project (max 10MB)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={uploadFile} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="file">Select File</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    onChange={handleFileSelect}
                                    accept="*/*"
                                    required
                                />
                                {selectedFile && (
                                    <p className="text-sm text-muted-foreground">
                                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="File description"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button type="submit" disabled={uploading || !selectedFile} className="w-full sm:w-auto">
                                    {uploading ? 'Uploading...' : 'Upload File'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowUpload(false);
                                        setSelectedFile(null);
                                        setDescription('');
                                    }}
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
                    <CardTitle>Project Files</CardTitle>
                    <CardDescription>
                        {files.length} file{files.length !== 1 ? 's' : ''} in this project
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {files.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Filename</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded By</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {files.map((file) => (
                                        <TableRow key={file.id}>
                                            <TableCell className="font-medium">
                                                {file.filename}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {formatFileSize(file.file_size)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center space-x-1">
                                                    <User className="h-3 w-3" />
                                                    <span>{file.uploaded_by.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{formatDate(file.created_at)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex space-x-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => downloadFile(file)}
                                                    >
                                                        <Download className="h-3 w-3" />
                                                    </Button>
                                                    {canDelete(file) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openDeleteDialog(file.id, file.filename)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <FilesIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No files uploaded yet</p>
                            <Button
                                className="mt-4"
                                onClick={() => setShowUpload(true)}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload First File
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !deleteDialog.isDeleting && !open && closeDeleteDialog()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold text-gray-900">
                                    Delete File
                                </DialogTitle>
                                <DialogDescription className="text-sm text-gray-500 mt-1">
                                    This action cannot be undone.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center gap-2 text-sm">
                                <FilesIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <span className="font-medium text-gray-900 truncate">
                                    {deleteDialog.fileName}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                            Are you sure you want to delete this file? This action will permanently remove the file from the project and cannot be undone.
                        </p>
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={closeDeleteDialog}
                            disabled={deleteDialog.isDeleting}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeleteFile}
                            disabled={deleteDialog.isDeleting}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500"
                        >
                            {deleteDialog.isDeleting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></div>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete File
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}