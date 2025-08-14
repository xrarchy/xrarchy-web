import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile Project Files API: GET request received for project:', resolvedParams.id);

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const supabaseAdmin = await createClient(true);

        // Verify token and get user
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }, { status: 401 });
        }

        const userId = userData.user.id;
        const projectId = resolvedParams.id;

        // Get user role
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            }, { status: 500 });
        }

        // Check if user has access to this project
        if (userProfile.role !== 'Admin') {
            const { data: assignment } = await supabaseAdmin
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('assigned_user_id', userId)
                .single();

            if (!assignment) {
                return NextResponse.json({
                    success: false,
                    error: 'You do not have access to this project',
                    code: 'PROJECT_ACCESS_DENIED'
                }, { status: 403 });
            }
        }

        // Get project files with uploader info using separate queries for better reliability
        const { data: files, error: filesError } = await supabaseAdmin
            .from('files')
            .select(`
                id,
                file_name,
                file_size,
                file_url,
                thumbnail_url,
                latitude,
                longitude,
                created_at,
                uploaded_by
            `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (filesError) {
            console.error('📱 Files fetch error:', filesError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch files',
                code: 'FILES_FETCH_ERROR'
            }, { status: 500 });
        }

        // Get uploader profiles separately
        const uploaderIds = [...new Set(files?.map(f => f.uploaded_by).filter(Boolean))];
        const { data: profiles } = uploaderIds.length > 0
            ? await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .in('id', uploaderIds)
            : { data: [] };

        // Create lookup map for profiles with proper typing
        type ProfileData = { id: string; email: string };
        const profileMap = new Map<string, ProfileData>(
            (profiles || []).map((p: ProfileData) => [p.id, p])
        );

        interface FileData {
            id: string;
            file_name: string;
            file_size: number;
            file_url: string;
            thumbnail_url: string | null;
            latitude: number | null;
            longitude: number | null;
            created_at: string;
            uploaded_by: string;
        }

        // Generate signed URLs for all files
        const formattedFilesWithSignedUrls = await Promise.all(
            (files || []).map(async (file: FileData) => {
                // Generate signed URL for the file
                const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
                    .from('project-files')
                    .createSignedUrl(file.file_url, 3600); // URL valid for 1 hour

                // Generate signed URL for the thumbnail if it exists
                let thumbnailSignedUrl = null;
                if (file.thumbnail_url) {
                    const { data: thumbnailSignedData } = await supabaseAdmin.storage
                        .from('project-files')
                        .createSignedUrl(file.thumbnail_url, 3600);
                    thumbnailSignedUrl = thumbnailSignedData?.signedUrl || null;
                }

                return {
                    id: file.id,
                    name: file.file_name,
                    size: file.file_size,
                    type: 'application/octet-stream', // Default type since it's not stored
                    url: file.file_url,
                    signedUrl: signedUrlData?.signedUrl || null,
                    thumbnailUrl: file.thumbnail_url,
                    thumbnailSignedUrl,
                    location: file.latitude && file.longitude ? {
                        latitude: file.latitude,
                        longitude: file.longitude
                    } : null,
                    uploadedAt: file.created_at,
                    uploadedBy: {
                        email: profileMap.get(file.uploaded_by)?.email || 'Unknown'
                    }
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                files: formattedFilesWithSignedUrls,
                totalCount: formattedFilesWithSignedUrls.length,
                totalSize: formattedFilesWithSignedUrls.reduce((sum, file) => sum + (file.size || 0), 0)
            }
        });

    } catch (error) {
        console.error('📱 Mobile Project Files API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile File Upload API: POST request received for project:', resolvedParams.id);

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const supabaseAdmin = await createClient(true);

        // Verify token and get user
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }, { status: 401 });
        }

        const userId = userData.user.id;
        const projectId = resolvedParams.id;

        // Get user role
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            }, { status: 500 });
        }

        // Check if user has access to this project
        if (userProfile.role !== 'Admin') {
            const { data: assignment } = await supabaseAdmin
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('assigned_user_id', userId)
                .single();

            if (!assignment) {
                return NextResponse.json({
                    success: false,
                    error: 'You do not have access to this project',
                    code: 'PROJECT_ACCESS_DENIED'
                }, { status: 403 });
            }
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const thumbnail = formData.get('thumbnail') as File;
        const fileName = formData.get('fileName') as string;
        const latitude = formData.get('latitude') as string;
        const longitude = formData.get('longitude') as string;

        if (!file) {
            return NextResponse.json({
                success: false,
                error: 'No file provided',
                code: 'MISSING_FILE'
            }, { status: 400 });
        }

        // Validate and parse coordinates if provided
        let lat = null;
        let lng = null;

        if (latitude && longitude) {
            lat = parseFloat(latitude);
            lng = parseFloat(longitude);

            // Basic validation for valid coordinate ranges
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
                    code: 'INVALID_COORDINATES'
                }, { status: 400 });
            }
        }

        // Generate unique file name
        const timestamp = Date.now();
        // Prioritize the actual file name over custom fileName parameter
        const originalName = file.name || fileName || 'unnamed_file';
        const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
        const filePath = `projects/${projectId}/${uniqueFilename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from('project-files')
            .upload(filePath, await file.arrayBuffer(), {
                contentType: file.type,
                duplex: 'half'
            });

        if (uploadError) {
            console.error('📱 File upload error:', uploadError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to upload file',
                code: 'UPLOAD_ERROR'
            }, { status: 500 });
        }

        // Upload thumbnail if provided
        let thumbnailUrl = null;
        if (thumbnail) {
            // Validate thumbnail is an image
            if (!thumbnail.type.startsWith('image/')) {
                await supabaseAdmin.storage.from('project-files').remove([filePath]);
                return NextResponse.json({
                    success: false,
                    error: 'Thumbnail must be an image file',
                    code: 'INVALID_THUMBNAIL'
                }, { status: 400 });
            }

            const thumbnailFilename = `thumb_${uniqueFilename}`;
            const thumbnailPath = `projects/${projectId}/thumbnails/${thumbnailFilename}`;

            const { error: thumbnailUploadError } = await supabaseAdmin.storage
                .from('project-files')
                .upload(thumbnailPath, await thumbnail.arrayBuffer(), {
                    contentType: thumbnail.type,
                    duplex: 'half'
                });

            if (thumbnailUploadError) {
                console.error('📱 Thumbnail upload error:', thumbnailUploadError.message);
                await supabaseAdmin.storage.from('project-files').remove([filePath]);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to upload thumbnail',
                    code: 'THUMBNAIL_UPLOAD_ERROR'
                }, { status: 500 });
            }

            thumbnailUrl = thumbnailPath;
        }

        // Get project name for the files table
        const { data: project } = await supabaseAdmin
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single();

        // Save file record to database
        const { data: fileRecord, error: dbError } = await supabaseAdmin
            .from('files')
            .insert({
                project_id: projectId,
                project_name: project?.name || 'Unknown Project',
                file_name: originalName,
                file_size: file.size,
                file_url: filePath,
                thumbnail_url: thumbnailUrl,
                latitude: lat,
                longitude: lng,
                uploaded_by: userId,
                created_at: new Date().toISOString()
            })
            .select(`
                id,
                file_name,
                file_size,
                file_url,
                thumbnail_url,
                latitude,
                longitude,
                created_at
            `)
            .single();

        if (dbError) {
            console.error('📱 File record creation error:', dbError.message);

            // Try to clean up uploaded files
            await supabaseAdmin.storage.from('project-files').remove([filePath]);
            if (thumbnailUrl) {
                await supabaseAdmin.storage.from('project-files').remove([thumbnailUrl]);
            }

            return NextResponse.json({
                success: false,
                error: 'Failed to save file record',
                code: 'DATABASE_ERROR'
            }, { status: 500 });
        }

        // Generate signed URL for the uploaded file
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('project-files')
            .createSignedUrl(fileRecord.file_url, 3600); // URL valid for 1 hour

        // Generate signed URL for thumbnail if exists
        let thumbnailSignedUrl = null;
        if (fileRecord.thumbnail_url) {
            const { data: thumbnailSignedData } = await supabaseAdmin.storage
                .from('project-files')
                .createSignedUrl(fileRecord.thumbnail_url, 3600);
            thumbnailSignedUrl = thumbnailSignedData?.signedUrl || null;
        }

        return NextResponse.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                file: {
                    id: fileRecord.id,
                    name: fileRecord.file_name,
                    size: fileRecord.file_size,
                    type: file.type,
                    url: fileRecord.file_url,
                    signedUrl: signedUrlData?.signedUrl || null,
                    thumbnailUrl: fileRecord.thumbnail_url || null,
                    thumbnailSignedUrl: thumbnailSignedUrl || null,
                    location: fileRecord.latitude && fileRecord.longitude ? {
                        latitude: fileRecord.latitude,
                        longitude: fileRecord.longitude
                    } : null,
                    uploadedAt: fileRecord.created_at
                }
            }
        }, { status: 201 });

    } catch (error) {
        console.error('📱 Mobile File Upload API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

// PUT /api/mobile/projects/[id]/files - Update file metadata (partial update)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile File Update API: PUT request received for project:', resolvedParams.id);

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const supabaseAdmin = await createClient(true);

        // Verify token and get user
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }, { status: 401 });
        }

        const userId = userData.user.id;
        const projectId = resolvedParams.id;
        const body = await request.json();

        // Extract update fields from request body
        const { fileId, latitude, longitude, file_name } = body;

        if (!fileId) {
            return NextResponse.json({
                success: false,
                error: 'File ID is required',
                code: 'MISSING_FILE_ID'
            }, { status: 400 });
        }

        // Get user role and check permissions
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            }, { status: 500 });
        }

        // Check if user has access to this project
        if (userProfile.role !== 'Admin') {
            const { data: assignment } = await supabaseAdmin
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('assigned_user_id', userId)
                .single();

            if (!assignment) {
                return NextResponse.json({
                    success: false,
                    error: 'You do not have access to this project',
                    code: 'PROJECT_ACCESS_DENIED'
                }, { status: 403 });
            }
        }

        // Get current file to verify it exists and belongs to the project
        const { data: currentFile, error: fileError } = await supabaseAdmin
            .from('files')
            .select('id, file_name, uploaded_by, latitude, longitude')
            .eq('id', fileId)
            .eq('project_id', projectId)
            .single();

        if (fileError || !currentFile) {
            return NextResponse.json({
                success: false,
                error: 'File not found in this project',
                code: 'FILE_NOT_FOUND'
            }, { status: 404 });
        }

        // Check if user can update this file (Admin or file owner)
        const canUpdate = userProfile.role === 'Admin' || currentFile.uploaded_by === userId;

        if (!canUpdate) {
            return NextResponse.json({
                success: false,
                error: 'You can only update files you uploaded',
                code: 'UPDATE_PERMISSION_DENIED'
            }, { status: 403 });
        }

        // Prepare update object with only provided fields
        const updateFields: {
            latitude?: number | null;
            longitude?: number | null;
            file_name?: string;
        } = {};

        // Validate and update coordinates if provided
        if (latitude !== undefined || longitude !== undefined) {
            if (latitude !== undefined) {
                const lat = parseFloat(latitude);
                if (isNaN(lat) || lat < -90 || lat > 90) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid latitude. Must be between -90 and 90',
                        code: 'INVALID_LATITUDE'
                    }, { status: 400 });
                }
                updateFields.latitude = lat;
            }

            if (longitude !== undefined) {
                const lng = parseFloat(longitude);
                if (isNaN(lng) || lng < -180 || lng > 180) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid longitude. Must be between -180 and 180',
                        code: 'INVALID_LONGITUDE'
                    }, { status: 400 });
                }
                updateFields.longitude = lng;
            }
        }

        // Update file name if provided
        if (file_name !== undefined && file_name !== null && file_name.trim() !== '') {
            updateFields.file_name = file_name.trim();
        }

        // If no valid update fields provided
        if (Object.keys(updateFields).length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No valid update fields provided',
                code: 'NO_UPDATE_FIELDS'
            }, { status: 400 });
        }

        // Perform the update
        const { data: updatedFile, error: updateError } = await supabaseAdmin
            .from('files')
            .update(updateFields)
            .eq('id', fileId)
            .eq('project_id', projectId)
            .select(`
                id,
                file_name,
                file_size,
                file_url,
                latitude,
                longitude,
                created_at,
                uploaded_by
            `)
            .single();

        if (updateError) {
            console.error('📱 File update error:', updateError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to update file',
                code: 'UPDATE_ERROR'
            }, { status: 500 });
        }

        // Generate signed URL for the updated file
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('project-files')
            .createSignedUrl(updatedFile.file_url, 3600); // URL valid for 1 hour

        return NextResponse.json({
            success: true,
            message: 'File updated successfully',
            data: {
                file: {
                    id: updatedFile.id,
                    name: updatedFile.file_name,
                    size: updatedFile.file_size,
                    url: updatedFile.file_url,
                    signedUrl: signedUrlData?.signedUrl || null,
                    location: updatedFile.latitude && updatedFile.longitude ? {
                        latitude: updatedFile.latitude,
                        longitude: updatedFile.longitude
                    } : null,
                    uploadedAt: updatedFile.created_at,
                    uploadedBy: updatedFile.uploaded_by
                },
                updatedFields: Object.keys(updateFields)
            }
        });

    } catch (error) {
        console.error('📱 Mobile File Update API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

// DELETE /api/mobile/projects/[id]/files - Delete file
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile File Delete API: DELETE request received for project:', resolvedParams.id);

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Authorization header required',
                code: 'MISSING_AUTH_HEADER'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const supabaseAdmin = await createClient(true);

        // Verify token and get user
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData.user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }, { status: 401 });
        }

        const userId = userData.user.id;
        const projectId = resolvedParams.id;
        const body = await request.json();
        const { fileId } = body;

        if (!fileId) {
            return NextResponse.json({
                success: false,
                error: 'File ID is required',
                code: 'MISSING_FILE_ID'
            }, { status: 400 });
        }

        // Get user role and check permissions
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileError) {
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            }, { status: 500 });
        }

        // Check if user has access to this project
        if (userProfile.role !== 'Admin') {
            const { data: assignment } = await supabaseAdmin
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('assigned_user_id', userId)
                .single();

            if (!assignment) {
                return NextResponse.json({
                    success: false,
                    error: 'You do not have access to this project',
                    code: 'PROJECT_ACCESS_DENIED'
                }, { status: 403 });
            }
        }

        // Get file details to verify it exists and get storage path
        const { data: fileToDelete, error: fileError } = await supabaseAdmin
            .from('files')
            .select('id, file_name, file_url, thumbnail_url, uploaded_by')
            .eq('id', fileId)
            .eq('project_id', projectId)
            .single();

        if (fileError || !fileToDelete) {
            return NextResponse.json({
                success: false,
                error: 'File not found in this project',
                code: 'FILE_NOT_FOUND'
            }, { status: 404 });
        }

        // Check if user can delete this file (Admin or file owner)
        const canDelete = userProfile.role === 'Admin' || fileToDelete.uploaded_by === userId;

        if (!canDelete) {
            return NextResponse.json({
                success: false,
                error: 'You can only delete files you uploaded',
                code: 'DELETE_PERMISSION_DENIED'
            }, { status: 403 });
        }

        // Delete file from storage first
        const filesToDelete = [fileToDelete.file_url];
        if (fileToDelete.thumbnail_url) {
            filesToDelete.push(fileToDelete.thumbnail_url);
        }

        const { error: storageError } = await supabaseAdmin.storage
            .from('project-files')
            .remove(filesToDelete);

        if (storageError) {
            console.error('📱 Storage deletion error:', storageError.message);
            // Continue with database deletion even if storage deletion fails
        }

        // Delete file record from database
        const { error: dbError } = await supabaseAdmin
            .from('files')
            .delete()
            .eq('id', fileId)
            .eq('project_id', projectId);

        if (dbError) {
            console.error('📱 File database deletion error:', dbError.message);
            return NextResponse.json({
                success: false,
                error: 'Failed to delete file record',
                code: 'DELETE_ERROR'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'File deleted successfully',
            data: {
                deletedFile: {
                    id: fileToDelete.id,
                    name: fileToDelete.file_name
                }
            }
        });

    } catch (error) {
        console.error('📱 Mobile File Delete API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}