-- Run this SQL in your Supabase SQL Editor to create the storage bucket and policies

-- 1. Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies for project files
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload project files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-files'
        AND auth.role() = 'authenticated'
    );

-- Allow users to view files from projects they have access to
CREATE POLICY "Users can view project files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project-files'
        AND auth.role() = 'authenticated'
    );

-- Allow users to delete their own files or Admin can delete any
CREATE POLICY "Users can delete project files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-files'
        AND (
            auth.uid() = owner
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'Admin'
            )
        )
    );

-- Note: The file access control is handled at the application level
-- through the API endpoints, these storage policies provide basic security
