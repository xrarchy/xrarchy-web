-- Storage Setup: Create bucket and policies for project files
-- Run this in Supabase SQL Editor

-- 1. Create the project-files bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies for project files
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload project files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-files'
        AND auth.uid() IS NOT NULL
    );

-- Allow users to view files from projects they have access to
CREATE POLICY "Users can view project files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project-files'
        AND auth.uid() IS NOT NULL
    );

-- Allow users to delete their own files or Admin can delete any
CREATE POLICY "Users can delete project files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-files'
        AND (
            -- Admin can delete any file
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            OR
            -- Users can delete their own files
            owner = auth.uid()
        )
    );

-- Allow users to update their own files or Admin can update any
CREATE POLICY "Users can update project files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project-files'
        AND (
            -- Admin can update any file
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            OR
            -- Users can update their own files
            owner = auth.uid()
        )
    );

-- 3. Verify the bucket and policies were created
SELECT 
    'Bucket created: ' || id as status 
FROM storage.buckets 
WHERE id = 'project-files';

SELECT 
    'Policy created: ' || policyname as status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%project files%';