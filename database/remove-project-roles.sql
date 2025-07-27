-- Remove Project Roles Completely
-- This script removes the project_role column and simplifies the system to use only main user roles

-- 1. Drop existing RLS policies that reference project_role
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

-- 2. Remove the project_role column from project_assignments
ALTER TABLE project_assignments DROP COLUMN IF EXISTS project_role;

-- 3. Create simplified RLS policies without project roles
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

-- 4. Add indexes for performance (if not already exist)
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);