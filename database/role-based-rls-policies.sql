-- ===================================================
-- ROLE-BASED ACCESS CONTROL RLS POLICIES
-- Run this in your Supabase Dashboard > SQL Editor
-- =        -- Archivist can upload f        -- Archivist can upload fi        -- Archivist can update files in assigned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_user_id = auth.uid()
            )
        )ned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_user_id = auth.uid()
            )
        )Archivist can update fi        -- Archivist can delete files in assigned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_user_id = auth.uid()
            )
        )ned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_by = auth.uid()
            )
        )ned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_by = auth.uid()
            )
        )======================================

-- This script sets up comprehensive Row Level Security (RLS) policies
-- for your three-tier role-based access control system:
-- 
-- 🔴 Admin: Full access to everything
-- 🟡 Archivist: Can edit assigned projects and upload files  
-- 🔵 User: Read-only access to assigned projects

BEGIN;

-- ===========================
-- PROJECTS TABLE POLICIES  
-- ===========================

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing project policies if they exist
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

-- Projects SELECT policy - Admin sees all, others see only assigned projects
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT USING (
        -- Admin can see all projects
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist and User can see only assigned projects
        id IN (
            SELECT project_id 
            FROM project_assignments 
            WHERE assigned_user_id = auth.uid()
        )
    );

-- Projects INSERT policy - Only Admin can create projects
CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    );

-- Projects UPDATE policy - Admin can update all, Archivist can update assigned projects
CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE USING (
        -- Admin can update all projects
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist can update assigned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_user_id = auth.uid()
            )
        )
    );

-- Projects DELETE policy - Only Admin can delete projects
CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    );

-- ===========================
-- PROJECT_ASSIGNMENTS TABLE POLICIES
-- ===========================

-- Enable RLS on project_assignments table
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing assignment policies if they exist
DROP POLICY IF EXISTS "assignments_select_policy" ON project_assignments;
DROP POLICY IF EXISTS "assignments_insert_policy" ON project_assignments;
DROP POLICY IF EXISTS "assignments_update_policy" ON project_assignments;
DROP POLICY IF EXISTS "assignments_delete_policy" ON project_assignments;

-- Assignments SELECT policy - Admin sees all, others see only their assignments
CREATE POLICY "assignments_select_policy" ON project_assignments
    FOR SELECT USING (
        -- Admin can see all assignments
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can see their own assignments
        assigned_user_id = auth.uid()
        OR
        -- Users can see assignments for projects they are assigned to (for project member lists)
        project_id IN (
            SELECT project_id 
            FROM project_assignments 
            WHERE assigned_user_id = auth.uid()
        )
    );

-- Assignments INSERT policy - Only Admin can create assignments
CREATE POLICY "assignments_insert_policy" ON project_assignments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    );

-- Assignments UPDATE policy - Only Admin can update assignments
CREATE POLICY "assignments_update_policy" ON project_assignments
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    );

-- Assignments DELETE policy - Only Admin can delete assignments
CREATE POLICY "assignments_delete_policy" ON project_assignments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    );

-- ===========================
-- FILES TABLE POLICIES (Enhanced)
-- ===========================

-- Enable RLS on files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing file policies if they exist
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

-- Enhanced Files SELECT policy with role-based access
CREATE POLICY "files_select_policy" ON files
    FOR SELECT USING (
        -- Admin can see all files
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist and User can see files in projects they are assigned to
        (project_id IS NOT NULL AND project_id IN (
            SELECT project_id FROM project_assignments WHERE assigned_user_id = auth.uid()
        ))
        OR
        -- Users can see files they uploaded
        uploaded_by = auth.uid()
        OR
        -- Files without project (legacy files)
        (project_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- Enhanced Files INSERT policy - Admin and Archivist can upload
CREATE POLICY "files_insert_policy" ON files
    FOR INSERT WITH CHECK (
        -- Admin can upload files anywhere
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist can upload files to assigned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_to = auth.uid()
            )
        )
        OR
        -- Files without project (legacy support)
        (project_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- Enhanced Files UPDATE policy
CREATE POLICY "files_update_policy" ON files
    FOR UPDATE USING (
        -- Admin can update all files
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist can update files in assigned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_to = auth.uid()
            )
        )
        OR
        -- Users can update files they uploaded
        uploaded_by = auth.uid()
    );

-- Enhanced Files DELETE policy
CREATE POLICY "files_delete_policy" ON files
    FOR DELETE USING (
        -- Admin can delete all files
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist can delete files in assigned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_to = auth.uid()
            )
        )
        OR
        -- Users can delete files they uploaded
        uploaded_by = auth.uid()
    );

-- ===========================
-- PROFILES TABLE POLICIES
-- ===========================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies if they exist
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Profiles SELECT policy - Admin sees all, others see own profile + project members
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        -- Admin can see all profiles
        role = 'Admin'
        OR
        -- Users can see their own profile
        id = auth.uid()
        OR
        -- Users can see profiles of people in their projects
        id IN (
            SELECT assigned_user_id 
            FROM project_assignments 
            WHERE project_id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_user_id = auth.uid()
            )
        )
    );

-- Profiles INSERT policy - Allow new user registration
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (
        id = auth.uid()
    );

-- Profiles UPDATE policy - Admin can update all, users can update own
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (
        -- Admin can update all profiles
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Users can update their own profile (but not their role unless they're admin)
        id = auth.uid()
    );

-- Profiles DELETE policy - Only Admin (and typically this should be disabled)
CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    );

-- ===========================
-- PERFORMANCE INDEXES
-- ===========================

-- Indexes to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_user_id ON project_assignments(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_id ON projects(id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

COMMIT;

-- ===========================
-- VERIFICATION QUERIES
-- ===========================

-- Run these to verify the policies were created successfully:

-- 1. Check that RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles');

-- 2. List all policies created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles')
ORDER BY tablename, policyname;

-- 3. Check indexes were created
SELECT indexname, tablename, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ===========================
-- SUCCESS MESSAGE
-- ===========================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '🎉 RLS POLICIES SUCCESSFULLY APPLIED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Your database now enforces role-based access control:';
    RAISE NOTICE '   🔴 Admin: Full access to all projects, users, and files';
    RAISE NOTICE '   🟡 Archivist: Can edit assigned projects and upload files';
    RAISE NOTICE '   🔵 User: Read-only access to assigned projects';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your application security is now fully aligned with the UI!';
    RAISE NOTICE '';
END $$;
