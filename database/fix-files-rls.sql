-- Fix RLS policies for files table
-- This will allow file uploads to work properly

-- First, add missing columns to project_assignments if they don't exist
ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS project_role VARCHAR(50) DEFAULT 'Member';

-- Enable RLS on files table if not already enabled
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

-- 1. SELECT policy: Users can view files from projects they have access to
CREATE POLICY "files_select_policy" ON files
    FOR SELECT USING (
        -- Admin can see all files
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can see files from projects they're assigned to
        (project_id IS NOT NULL AND project_id IN (
            SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid()
        ))
        OR
        -- Users can see their own files (even if not assigned to project)
        uploaded_by = auth.uid()
        OR
        -- Files without project_id can be seen by authenticated users (backward compatibility)
        (project_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- 2. INSERT policy: Users can upload files to projects they have access to
CREATE POLICY "files_insert_policy" ON files
    FOR INSERT WITH CHECK (
        -- Admin can upload anywhere
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can upload to projects they're assigned to (excluding Viewers if project_role exists)
        (project_id IS NOT NULL AND project_id IN (
            SELECT pa.project_id 
            FROM project_assignments pa 
            WHERE pa.assigned_to = auth.uid() 
            AND (pa.project_role IS NULL OR pa.project_role != 'Viewer')
        ))
        OR
        -- Users can upload files without project_id (backward compatibility)
        (project_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- 3. UPDATE policy: Users can update their own files or Admin can update any
CREATE POLICY "files_update_policy" ON files
    FOR UPDATE USING (
        -- Admin can update any file
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can update their own files
        uploaded_by = auth.uid()
    );

-- 4. DELETE policy: Users can delete their own files, Project Leads can delete project files, Admin can delete any
CREATE POLICY "files_delete_policy" ON files
    FOR DELETE USING (
        -- Admin can delete any file
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can delete their own files
        uploaded_by = auth.uid()
        OR
        -- Project Leads can delete files from their projects (if project_role exists)
        (project_id IS NOT NULL AND project_id IN (
            SELECT pa.project_id 
            FROM project_assignments pa 
            WHERE pa.assigned_to = auth.uid() 
            AND pa.project_role = 'Project Lead'
        ))
    );

-- Add missing columns if they don't exist
ALTER TABLE files ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE files ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Update existing files to have uploaded_by if missing (optional)
-- This sets uploaded_by to the first admin user for existing files without uploaded_by
-- UPDATE files 
-- SET uploaded_by = (SELECT id FROM profiles WHERE role = 'Admin' LIMIT 1)
-- WHERE uploaded_by IS NULL;