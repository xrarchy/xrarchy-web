import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/mobile/projects/[id]/files/[fileId] - Get single file details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; fileId: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile Single File API: GET request received for file:', resolvedParams.fileId);

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
        const fileId = resolvedParams.fileId;

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

        // Get file details
        const { data: file, error: fileError } = await supabaseAdmin
            .from('files')
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
            .eq('id', fileId)
            .eq('project_id', projectId)
            .single();

        if (fileError || !file) {
            return NextResponse.json({
                success: false,
                error: 'File not found in this project',
                code: 'FILE_NOT_FOUND'
            }, { status: 404 });
        }

        // Get uploader profile
        const { data: uploaderProfile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', file.uploaded_by)
            .single();

        // Generate signed URL for the file
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('project-files')
            .createSignedUrl(file.file_url, 3600); // URL valid for 1 hour

        const formattedFile = {
            id: file.id,
            name: file.file_name,
            size: file.file_size,
            url: file.file_url,
            signedUrl: signedUrlData?.signedUrl || null,
            location: file.latitude && file.longitude ? {
                latitude: file.latitude,
                longitude: file.longitude
            } : null,
            uploadedAt: file.created_at,
            uploadedBy: {
                email: uploaderProfile?.email || 'Unknown'
            }
        };

        return NextResponse.json({
            success: true,
            data: {
                file: formattedFile
            }
        });

    } catch (error) {
        console.error('📱 Mobile Single File API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

// PUT /api/mobile/projects/[id]/files/[fileId] - Update file metadata (partial update)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; fileId: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile File Update API: PUT request received for file:', resolvedParams.fileId);

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
        const fileId = resolvedParams.fileId;
        const body = await request.json();

        // Extract update fields from request body
        const { latitude, longitude, file_name } = body;

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
        if (latitude !== undefined) {
            if (latitude === null) {
                updateFields.latitude = null;
            } else {
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
        }

        if (longitude !== undefined) {
            if (longitude === null) {
                updateFields.longitude = null;
            } else {
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
        if (file_name !== undefined) {
            if (file_name === null || file_name.trim() === '') {
                return NextResponse.json({
                    success: false,
                    error: 'File name cannot be empty',
                    code: 'INVALID_FILE_NAME'
                }, { status: 400 });
            }
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

// DELETE /api/mobile/projects/[id]/files/[fileId] - Delete file
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; fileId: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile File Delete API: DELETE request received for file:', resolvedParams.fileId);

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
        const fileId = resolvedParams.fileId;

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
            .select('id, file_name, file_url, uploaded_by')
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
        const { error: storageError } = await supabaseAdmin.storage
            .from('project-files')
            .remove([fileToDelete.file_url]);

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
