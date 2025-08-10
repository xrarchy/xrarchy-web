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
            created_at: string;
            uploaded_by: string;
        }

        const formattedFiles = (files || []).map((file: FileData) => ({
            id: file.id,
            name: file.file_name,
            size: file.file_size,
            type: 'application/octet-stream', // Default type since it's not stored
            url: file.file_url,
            uploadedAt: file.created_at,
            uploadedBy: {
                email: profileMap.get(file.uploaded_by)?.email || 'Unknown'
            }
        }));

        return NextResponse.json({
            success: true,
            data: {
                files: formattedFiles,
                totalCount: formattedFiles.length,
                totalSize: formattedFiles.reduce((sum, file) => sum + (file.size || 0), 0)
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
        const fileName = formData.get('fileName') as string;

        if (!file) {
            return NextResponse.json({
                success: false,
                error: 'No file provided',
                code: 'MISSING_FILE'
            }, { status: 400 });
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
                uploaded_by: userId,
                created_at: new Date().toISOString()
            })
            .select(`
                id,
                file_name,
                file_size,
                file_url,
                created_at
            `)
            .single();

        if (dbError) {
            console.error('📱 File record creation error:', dbError.message);

            // Try to clean up uploaded file
            await supabaseAdmin.storage
                .from('project-files')
                .remove([filePath]);

            return NextResponse.json({
                success: false,
                error: 'Failed to save file record',
                code: 'DATABASE_ERROR'
            }, { status: 500 });
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