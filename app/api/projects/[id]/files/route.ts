// import { createClient } from '@/utils/supabase/server';
// import { NextResponse } from 'next/server';

// // GET /api/projects/[id]/files - Get all files in project
// export async function GET(
//     request: Request,
//     context: { params: Promise<{ id: string }> }
// ) {
//     try {
//         const { id } = await context.params;

//         if (!id) {
//             return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
//         }

//         const supabase = await createClient();

//         // Get current session
//         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
//         if (sessionError || !session) {
//             return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
//         }

//         // Get user's role
//         const { data: profile, error: profileError } = await supabase
//             .from('profiles')
//             .select('role')
//             .eq('id', session.user.id)
//             .single();

//         if (profileError) {
//             return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
//         }

//         // Check if user has access to this project
//         let hasAccess = profile.role === 'Admin';

//         if (!hasAccess) {
//             const { data: assignment } = await supabase
//                 .from('project_assignments')
//                 .select('id')
//                 .eq('project_id', id)
//                 .eq('assigned_user_id', session.user.id)
//                 .single();

//             hasAccess = !!assignment;
//         }

//         if (!hasAccess) {
//             return NextResponse.json({ error: 'Access denied' }, { status: 403 });
//         }

//         // Get all files in the project
//         const { data: projectFiles, error } = await supabase
//             .from('project_files')
//             .select(`
//                 id,
//                 filename,
//                 file_size,
//                 content_type,
//                 file_path,
//                 uploaded_at,
//                 uploaded_by,
//                 profiles!uploaded_by(
//                     id,
//                     email
//                 )
//             `)
//             .eq('project_id', id)
//             .order('uploaded_at', { ascending: false });

//         if (error) {
//             console.error('Project files fetch error:', error);
//             return NextResponse.json({ error: error.message }, { status: 500 });
//         }

//         return NextResponse.json({ projectFiles: projectFiles || [] });

//     } catch (error) {
//         console.error('Project files API error:', error);
//         return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//     }
// }

// // POST /api/projects/[id]/files - Upload new file to project
// export async function POST(
//     request: Request,
//     context: { params: Promise<{ id: string }> }
// ) {
//     try {
//         const { id } = await context.params;

//         if (!id) {
//             return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
//         }

//         const supabase = await createClient();

//         // Get current session
//         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
//         if (sessionError || !session) {
//             return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
//         }

//         // Check if user has upload permission (must be assigned to project)
//         const { data: assignment, error: accessError } = await supabase
//             .from('project_assignments')
//             .select('project_role')
//             .eq('project_id', id)
//             .eq('assigned_user_id', session.user.id)
//             .single();

//         if (accessError || !assignment) {
//             // Check if user is Admin
//             const { data: profile } = await supabase
//                 .from('profiles')
//                 .select('role')
//                 .eq('id', session.user.id)
//                 .single();

//             if (profile?.role !== 'Admin') {
//                 return NextResponse.json({ error: 'Access denied' }, { status: 403 });
//             }
//         }

//         // Check if user has upload permission (Viewers cannot upload)
//         if (assignment?.project_role === 'Viewer') {
//             return NextResponse.json({ error: 'Viewers cannot upload files' }, { status: 403 });
//         }

//         // Parse form data
//         const formData = await request.formData();
//         const file = formData.get('file') as File;
//         const description = formData.get('description') as string;

//         if (!file) {
//             return NextResponse.json({ error: 'File is required' }, { status: 400 });
//         }

//         // Validate file size (max 10MB for example)
//         const maxSize = 10 * 1024 * 1024; // 10MB
//         if (file.size > maxSize) {
//             return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
//         }

//         // Generate unique filename
//         const timestamp = Date.now();
//         const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
//         const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
//         const filePath = `projects/${id}/${uniqueFilename}`;

//         // Upload file to Supabase Storage
//         const fileBuffer = await file.arrayBuffer();
//         const { error: uploadError } = await supabase.storage
//             .from('project-files')
//             .upload(filePath, fileBuffer, {
//                 contentType: file.type,
//                 duplex: 'half'
//             });

//         if (uploadError) {
//             console.error('File upload error:', uploadError);
//             return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
//         }

//         // Save file metadata to database
//         const { data: fileRecord, error: dbError } = await supabase
//             .from('project_files')
//             .insert({
//                 project_id: id,
//                 filename: file.name,
//                 file_size: file.size,
//                 content_type: file.type,
//                 file_path: filePath,
//                 description: description || null,
//                 uploaded_by: session.user.id,
//                 uploaded_at: new Date().toISOString()
//             })
//             .select(`
//                 id,
//                 filename,
//                 file_size,
//                 content_type,
//                 file_path,
//                 description,
//                 uploaded_at,
//                 uploaded_by,
//                 profiles!uploaded_by(id, email)
//             `)
//             .single();

//         if (dbError) {
//             console.error('File metadata save error:', dbError);
//             // Try to cleanup uploaded file
//             await supabase.storage.from('project-files').remove([filePath]);
//             return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
//         }

//         return NextResponse.json({
//             success: true,
//             file: fileRecord,
//             message: 'File uploaded successfully'
//         });

//     } catch (error) {
//         console.error('File upload API error:', error);
//         return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//     }
// }

// // DELETE /api/projects/[id]/files - Delete file from project
// export async function DELETE(
//     request: Request,
//     context: { params: Promise<{ id: string }> }
// ) {
//     try {
//         const { id } = await context.params;
//         const { fileId } = await request.json();

//         if (!id) {
//             return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
//         }

//         if (!fileId) {
//             return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
//         }

//         const supabase = await createClient();

//         // Get current session
//         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
//         if (sessionError || !session) {
//             return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
//         }

//         // Get file details
//         const { data: fileRecord, error: fileError } = await supabase
//             .from('project_files')
//             .select('file_path, uploaded_by')
//             .eq('id', fileId)
//             .eq('project_id', id)
//             .single();

//         if (fileError || !fileRecord) {
//             return NextResponse.json({ error: 'File not found' }, { status: 404 });
//         }

//         // Check if user can delete this file
//         let canDelete = false;

//         // Check if user is Admin
//         const { data: profile } = await supabase
//             .from('profiles')
//             .select('role')
//             .eq('id', session.user.id)
//             .single();

//         if (profile?.role === 'Admin') {
//             canDelete = true;
//         } else if (fileRecord.uploaded_by === session.user.id) {
//             // Users can delete their own files
//             canDelete = true;
//         } else {
//             // Check if user is Project Lead
//             const { data: assignment } = await supabase
//                 .from('project_assignments')
//                 .select('project_role')
//                 .eq('project_id', id)
//                 .eq('assigned_user_id', session.user.id)
//                 .single();

//             canDelete = assignment?.project_role === 'Project Lead';
//         }

//         if (!canDelete) {
//             return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
//         }

//         // Delete file from storage
//         const { error: storageError } = await supabase.storage
//             .from('project-files')
//             .remove([fileRecord.file_path]);

//         if (storageError) {
//             console.error('File storage deletion error:', storageError);
//             // Continue with database deletion even if storage deletion fails
//         }

//         // Delete file record from database
//         const { error: dbError } = await supabase
//             .from('project_files')
//             .delete()
//             .eq('id', fileId)
//             .eq('project_id', id);

//         if (dbError) {
//             console.error('File database deletion error:', dbError);
//             return NextResponse.json({ error: dbError.message }, { status: 500 });
//         }

//         return NextResponse.json({
//             success: true,
//             message: 'File deleted successfully'
//         });

//     } catch (error) {
//         console.error('File deletion API error:', error);
//         return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//     }
// }


import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/projects/[id]/files
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

        const { data: profile, error: profileError } = await supabase
            .from('profiles').select('role').eq('id', user.id).single();
        if (profileError) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        let hasAccess = profile.role === 'Admin';
        if (!hasAccess) {
            const { data: assignment } = await supabase
                .from('project_assignments').select('id')
                .eq('project_id', id).eq('assigned_user_id', user.id).single();
            hasAccess = !!assignment;
        }
        if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const { data: projectFiles, error } = await supabase
            .from('files')
            .select(`
                id,
                filename:file_name,
                file_size,
                file_url,
                latitude,
                longitude,
                created_at,
                uploaded_by:uploaded_by (
                    id,
                    email
                )
            `)
            .eq('project_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Project files fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ projectFiles: projectFiles || [] });

    } catch (error) {
        console.error('Project files API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/files
export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

        const supabase = await createClient();

        // Use getUser() for secure, authenticated user info
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('API user:', user);

        if (userError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

        // Check if user has upload permission (must be assigned to project)
        const { data: assignment, error: accessError } = await supabase
            .from('project_assignments').select('id')
            .eq('project_id', id).eq('assigned_user_id', user.id).single();

        if (accessError || !assignment) {
            // Check if user is Admin
            const { data: profile } = await supabase
                .from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role !== 'Admin') return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const latitude = formData.get('latitude') as string;
        const longitude = formData.get('longitude') as string;
        
        if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 });

        // Validate coordinates if provided
        let lat = null;
        let lng = null;
        
        if (latitude && longitude) {
            lat = parseFloat(latitude);
            lng = parseFloat(longitude);
            
            // Basic validation for valid coordinate ranges
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return NextResponse.json({ 
                    error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180' 
                }, { status: 400 });
            }
        }

        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
        const filePath = `projects/${id}/${uniqueFilename}`;

        // Upload to correct bucket
        const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, await file.arrayBuffer(), {
                contentType: file.type,
                duplex: 'half'
            });

        if (uploadError) {
            console.error('File upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
        }

        // Get project name for the files table
        const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', id)
            .single();

        // Use user.id for uploaded_by (matches auth.uid() in RLS)
        const { data: fileRecord, error: dbError } = await supabase
            .from('files')
            .insert({
                project_id: id,
                project_name: project?.name || 'Unknown Project',
                file_name: file.name,
                file_size: file.size,
                file_url: filePath,
                latitude: lat,
                longitude: lng,
                uploaded_by: user.id, // must match auth.uid()
                created_at: new Date().toISOString()
            })
            .select(`
                id,
                filename:file_name,
                file_size,
                file_url,
                latitude,
                longitude,
                created_at,
                uploaded_by:uploaded_by (
                    id,
                    email
                )
            `)
            .single();

        if (dbError) {
            console.error('File metadata save error:', dbError);
            await supabase.storage.from('project-files').remove([filePath]);
            return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            file: fileRecord,
            message: 'File uploaded successfully'
        });

    } catch (error) {
        console.error('File upload API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/projects/[id]/files - Delete file from project
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { fileId } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!fileId) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get file details
        const { data: fileRecord, error: fileError } = await supabase
            .from('files')
            .select('file_url, uploaded_by')
            .eq('id', fileId)
            .eq('project_id', id)
            .single();

        if (fileError || !fileRecord) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Check if user can delete this file
        let canDelete = false;

        // Check if user is Admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role === 'Admin') {
            canDelete = true;
        } else if (fileRecord.uploaded_by === user.id) {
            // Users can delete their own files
            canDelete = true;
        }
        // Removed project role logic - only Admin and file owners can delete files

        if (!canDelete) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Delete file from storage
        const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([fileRecord.file_url]);

        if (storageError) {
            console.error('File storage deletion error:', storageError);
            // Continue with database deletion even if storage deletion fails
        }

        // Delete file record from database
        const { error: dbError } = await supabase
            .from('files')
            .delete()
            .eq('id', fileId)
            .eq('project_id', id);

        if (dbError) {
            console.error('File database deletion error:', dbError);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('File deletion API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}