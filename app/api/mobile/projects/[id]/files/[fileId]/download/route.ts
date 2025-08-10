import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; fileId: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile File Download API: GET request received for project:', resolvedParams.id, 'file:', resolvedParams.fileId);

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

        // Get the file record from database
        const { data: file, error: fileError } = await supabaseAdmin
            .from('files')
            .select(`
                id,
                file_name,
                file_url,
                file_size,
                project_id
            `)
            .eq('id', fileId)
            .eq('project_id', projectId)
            .single();

        if (fileError || !file) {
            return NextResponse.json({
                success: false,
                error: 'File not found',
                code: 'FILE_NOT_FOUND'
            }, { status: 404 });
        }

        // Generate signed URL for download (GET method)
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('project-files')
            .createSignedUrl(file.file_url, 3600); // URL valid for 1 hour

        if (signedUrlError || !signedUrlData) {
            console.error('📱 Signed URL generation error:', signedUrlError);
            return NextResponse.json({
                success: false,
                error: 'Failed to generate download URL',
                code: 'DOWNLOAD_URL_ERROR'
            }, { status: 500 });
        }

        // Return the download URL and file info
        return NextResponse.json({
            success: true,
            message: 'Download URL generated successfully',
            data: {
                file: {
                    id: file.id,
                    name: file.file_name,
                    size: file.file_size,
                    downloadUrl: signedUrlData.signedUrl,
                    expiresIn: 3600, // seconds
                    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
                }
            }
        });

    } catch (error) {
        console.error('📱 Mobile File Download API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; fileId: string }> }
) {
    const resolvedParams = await params;
    console.log('📱 Mobile File Stream Download API: POST request received for project:', resolvedParams.id, 'file:', resolvedParams.fileId);

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

        // Get the file record from database
        const { data: file, error: fileError } = await supabaseAdmin
            .from('files')
            .select(`
                id,
                file_name,
                file_url,
                file_size,
                project_id
            `)
            .eq('id', fileId)
            .eq('project_id', projectId)
            .single();

        if (fileError || !file) {
            return NextResponse.json({
                success: false,
                error: 'File not found',
                code: 'FILE_NOT_FOUND'
            }, { status: 404 });
        }

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('project-files')
            .download(file.file_url);

        if (downloadError || !fileData) {
            console.error('📱 File download error:', downloadError);
            return NextResponse.json({
                success: false,
                error: 'Failed to download file',
                code: 'FILE_DOWNLOAD_ERROR'
            }, { status: 500 });
        }

        // Return the file as a blob
        const response = new NextResponse(fileData, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${file.file_name}"`,
                'Content-Length': file.file_size.toString(),
                'Cache-Control': 'no-cache',
            },
        });

        return response;

    } catch (error) {
        console.error('📱 Mobile File Stream Download API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        }, { status: 500 });
    }
}
