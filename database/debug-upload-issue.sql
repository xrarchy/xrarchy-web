-- Debug the file upload issue for the Yoga project
-- Run this in Supabase SQL Editor

-- 1. Check if the user exists and their role
SELECT 'User check:' as debug_step, id, email, role 
FROM profiles 
WHERE id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce';

-- 2. Check if the project exists
SELECT 'Project check:' as debug_step, id, name, created_by 
FROM projects 
WHERE id = '7d827a85-2424-4a73-8ae2-826e4fab094f';

-- 3. Check if user is assigned to this project
SELECT 'Assignment check:' as debug_step, * 
FROM project_assignments 
WHERE assigned_user_id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce' 
AND project_id = '7d827a85-2424-4a73-8ae2-826e4fab094f';

-- 4. Test the RLS policy logic for files table
SELECT 'RLS test:' as debug_step,
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce' AND profiles.role = 'Admin') as is_admin,
    ('7d827a85-2424-4a73-8ae2-826e4fab094f' IN (
        SELECT project_id FROM project_assignments WHERE assigned_user_id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce'
    )) as is_assigned_to_project;

-- 5. Check current RLS policies on files table
SELECT 'Files RLS policies:' as debug_step, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'files' AND schemaname = 'public';

-- 6. Check storage policies
SELECT 'Storage policies:' as debug_step, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 7. Check if the bucket exists and is accessible
SELECT 'Bucket check:' as debug_step, id, name, public 
FROM storage.buckets 
WHERE id = 'project-files';

-- 8. Test a simple insert into files table (this will show if RLS is blocking)
-- Note: This is just a test, we'll delete it after
INSERT INTO files (project_id, file_name, file_size, file_url, uploaded_by, created_at)
VALUES (
    '7d827a85-2424-4a73-8ae2-826e4fab094f',
    'test_file.txt',
    100,
    'test/path',
    'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce',
    NOW()
) RETURNING id, file_name, 'Test insert successful' as status;

-- Clean up the test record
DELETE FROM files WHERE file_name = 'test_file.txt' AND file_url = 'test/path';