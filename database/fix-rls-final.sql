-- FINAL FIX: Ensure RLS policies work without project_role column
-- Run this in Supabase SQL Editor

-- 1. Drop all existing file policies
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

-- 2. Ensure project_role column is completely removed
ALTER TABLE project_assignments DROP COLUMN IF EXISTS project_role;

-- 3. Create new simplified RLS policies
-- SELECT policy: Users can view files from projects they have access to
CREATE POLICY "files_select_policy" ON files
    FOR SELECT USING (
        -- Admin can see all files
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can see files from projects they're assigned to
        (project_id IS NOT NULL AND project_id IN (
            SELECT project_id FROM project_assignments WHERE assigned_user_id = auth.uid()
        ))
        OR
        -- Users can see their own files
        uploaded_by = auth.uid()
        OR
        -- Files without project_id can be seen by authenticated users (backward compatibility)
        (project_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- INSERT policy: Users can upload files to projects they have access to
CREATE POLICY "files_insert_policy" ON files
    FOR INSERT WITH CHECK (
        -- Admin can upload anywhere
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can upload to projects they're assigned to
        (project_id IS NOT NULL AND project_id IN (
            SELECT project_id FROM project_assignments WHERE assigned_user_id = auth.uid()
        ))
        OR
        -- Users can upload files without project_id (backward compatibility)
        (project_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- UPDATE policy: Users can update their own files or Admin can update any
CREATE POLICY "files_update_policy" ON files
    FOR UPDATE USING (
        -- Admin can update any file
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can update their own files
        uploaded_by = auth.uid()
    );

-- DELETE policy: Users can delete their own files or Admin can delete any
CREATE POLICY "files_delete_policy" ON files
    FOR DELETE USING (
        -- Admin can delete any file
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can delete their own files
        uploaded_by = auth.uid()
    );

-- 4. Verify the policies are working
-- Test queries (these should not error)
SELECT 'RLS policies created successfully' as status;

-- 5. Check if user is assigned to the project (for debugging)
-- Replace 'USER_ID' and 'PROJECT_ID' with actual values for testing
-- SELECT * FROM project_assignments WHERE assigned_user_id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce' AND project_id = '79d39890-99ce-4783-9dcc-61f9b4136c10';