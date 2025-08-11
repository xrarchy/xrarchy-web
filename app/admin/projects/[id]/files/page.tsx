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
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Upload,
    AlertCircle,
    Files as FilesIcon,
    Calendar,
    Trash2,
    Download,
    User,
    Shield
} from 'lucide-react';

interface ProjectFile {
    id: string;
    filename: string;
    file_size: number;
    file_url: string;
    latitude?: number | null;
    longitude?: number | null;
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

export default function AdminProjectFiles({ params }: { params: Promise<{ id: string }> }) {
    const [project, setProject] = useState<Project | null>(null);
    const [files, setFiles] = useState<ProjectFile[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);
    const [projectId, setProjectId] = useState<string>('');

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
            setSelectedFile(file);
            setError(null);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser');
            return;
        }

        setGettingLocation(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toFixed(6));
                setLongitude(position.coords.longitude.toFixed(6));
                setGettingLocation(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setError(`Failed to get location: ${error.message}`);
                setGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    };

    const clearLocation = () => {
        setLatitude('');
        setLongitude('');
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
            if (latitude && longitude) {
                formData.append('latitude', latitude);
                formData.append('longitude', longitude);
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
            setLatitude('');
            setLongitude('');
            setShowUpload(false);
            fetchProjectAndFiles();
        } catch (error) {
            console.error('Upload error:', error);
            setError('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const deleteFile = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}/files`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to delete file');
                return;
            }

            fetchProjectAndFiles();
        } catch (error) {
            console.error('Delete error:', error);
            setError('Failed to delete file');
        }
    };

    const downloadFile = async (file: ProjectFile) => {
        try {
            console.log('Download attempt for file:', file);
            console.log('File URL:', file.file_url);

            const { data, error } = await supabase.storage
                .from('project-files')
                .createSignedUrl(file.file_url, 3600);

            console.log('Signed URL response:', { data, error });

            if (data?.signedUrl) {
                console.log('Signed URL created:', data.signedUrl);

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
                link.download = file.filename;
                link.style.display = 'none';
                document.body.appendChild(link);

                console.log('Triggering download for:', file.filename);
                link.click();

                // Clean up
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log('Download cleanup completed');
            } else {
                console.error('Failed to generate signed URL:', error);
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
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
                <div className="text-center space-y-4">
                    <Shield className="h-12 w-12 text-purple-600 mx-auto animate-pulse" />
                    <p className="text-gray-600">Loading admin project files...</p>
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
                <Button variant="outline" onClick={() => router.push(`/admin/projects/${projectId}`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Project
                </Button>
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <Badge variant="secondary" className="text-xs">Admin View</Badge>
                </div>
            </div>

            {/* Files Header */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">Files</h1>
                    <p className="text-muted-foreground text-sm sm:text-base break-words">
                        Files for {project.name}
                    </p>
                </div>

                {/* Upload Button */}
                <div className="flex">
                    <Button onClick={() => setShowUpload(!showUpload)} className="w-full sm:w-auto">
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

            {showUpload && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload File</CardTitle>
                        <CardDescription>Add a new file to this project</CardDescription>
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
                            
                            {/* Location Section */}
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Location (Optional)</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={getCurrentLocation}
                                            disabled={gettingLocation}
                                        >
                                            {gettingLocation ? 'Getting Location...' : '📍 Get Current Location'}
                                        </Button>
                                        {(latitude || longitude) && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={clearLocation}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                                        <Input
                                            id="latitude"
                                            type="number"
                                            step="any"
                                            min="-90"
                                            max="90"
                                            value={latitude}
                                            onChange={(e) => setLatitude(e.target.value)}
                                            placeholder="37.7749"
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                                        <Input
                                            id="longitude"
                                            type="number"
                                            step="any"
                                            min="-180"
                                            max="180"
                                            value={longitude}
                                            onChange={(e) => setLongitude(e.target.value)}
                                            placeholder="-122.4194"
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                                {latitude && longitude && (
                                    <p className="text-xs text-muted-foreground">
                                        📍 Location: {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                                    </p>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <Button type="submit" disabled={uploading || !selectedFile}>
                                    {uploading ? 'Uploading...' : 'Upload File'}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => {
                                    setShowUpload(false);
                                    setSelectedFile(null);
                                    setDescription('');
                                    setLatitude('');
                                    setLongitude('');
                                }}>
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
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Filename</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Location</TableHead>
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
                                                    {file.latitude && file.longitude ? (
                                                        <div className="flex items-center space-x-1">
                                                            <span className="text-xs">📍</span>
                                                            <span title={`${file.latitude}, ${file.longitude}`}>
                                                                {file.latitude.toFixed(4)}, {file.longitude.toFixed(4)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">No location</span>
                                                    )}
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
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => deleteFile(file.id)}
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

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {files.map((file) => (
                                    <Card key={file.id} className="border">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-sm text-muted-foreground">Filename:</span>
                                                    <div className="font-medium break-words">{file.filename}</div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">Size:</span>
                                                        <div className="text-sm">{formatFileSize(file.file_size)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">Uploaded:</span>
                                                        <div className="text-sm">{formatDate(file.created_at)}</div>
                                                    </div>
                                                </div>

                                                {/* Location Info */}
                                                <div>
                                                    <span className="text-sm text-muted-foreground">Location:</span>
                                                    <div className="text-sm">
                                                        {file.latitude && file.longitude ? (
                                                            <div className="flex items-center space-x-1">
                                                                <span>📍</span>
                                                                <span>{file.latitude.toFixed(4)}, {file.longitude.toFixed(4)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">No location data</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-sm text-muted-foreground">Uploaded by:</span>
                                                    <div className="text-sm break-words">{file.uploaded_by.email}</div>
                                                </div>

                                                <div className="flex space-x-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => downloadFile(file)}
                                                        className="flex-1"
                                                    >
                                                        <Download className="h-3 w-3 mr-1" />
                                                        Download
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => deleteFile(file.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
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
        </div>
    );
}