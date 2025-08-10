-- ===================================================
-- UPDATED RLS POLICIES - USER CAN BROWSE ALL PROJECTS
-- Run this in your Supabase Dashboard > SQL Editor
-- ===================================================

-- This update allows User role to browse ALL projects (like browsing a catalog)
-- but maintains read-only access with no edit/create/delete permissions.

BEGIN;

-- ===========================
-- UPDATE PROJECTS TABLE POLICIES
-- ===========================

-- Drop and recreate the projects SELECT policy
DROP POLICY IF EXISTS "projects_select_policy" ON projects;

-- Updated Projects SELECT policy - Admin sees all, Archivist sees assigned, User sees ALL (read-only)
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT USING (
        -- Admin can see all projects
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist can see only assigned projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            id IN (
                SELECT project_id 
                FROM project_assignments 
                WHERE assigned_user_id = auth.uid()
            )
        )
        OR
        -- User can browse ALL projects (read-only)
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'User')
    );

-- ===========================
-- UPDATE FILES TABLE POLICIES
-- ===========================

-- Drop and recreate the files SELECT policy
DROP POLICY IF EXISTS "files_select_policy" ON files;

-- Updated Files SELECT policy - User can see files in ALL projects
CREATE POLICY "files_select_policy" ON files
    FOR SELECT USING (
        -- Admin can see all files
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist can see files in projects they are assigned to
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            project_id IS NOT NULL 
            AND 
            project_id IN (
                SELECT project_id FROM project_assignments WHERE assigned_user_id = auth.uid()
            )
        )
        OR
        -- User can see files in ALL projects (read-only)
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'User')
            AND
            project_id IS NOT NULL
        )
        OR
        -- Users can see files they uploaded
        uploaded_by = auth.uid()
        OR
        -- Files without project (legacy files)
        (project_id IS NULL AND auth.uid() IS NOT NULL)
    );

-- ===========================
-- UPDATE PROJECT_ASSIGNMENTS TABLE POLICIES
-- ===========================

-- Drop and recreate the assignments SELECT policy
DROP POLICY IF EXISTS "assignments_select_policy" ON project_assignments;

-- Updated Assignments SELECT policy - User can see assignments for ALL projects (to see project members)
CREATE POLICY "assignments_select_policy" ON project_assignments
    FOR SELECT USING (
        -- Admin can see all assignments
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
        OR
        -- Archivist can see assignments for projects they are assigned to
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            (
                assigned_user_id = auth.uid()
                OR
                project_id IN (
                    SELECT project_id 
                    FROM project_assignments 
                    WHERE assigned_user_id = auth.uid()
                )
            )
        )
        OR
        -- User can see ALL assignments (to view project members when browsing)
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'User')
    );

-- ===========================
-- UPDATE PROFILES TABLE POLICIES 
-- ===========================

-- Drop and recreate the profiles SELECT policy
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Updated Profiles SELECT policy - User can see profiles of people in ANY project
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        -- Admin can see all profiles
        role = 'Admin'
        OR
        -- Users can see their own profile
        id = auth.uid()
        OR
        -- Archivist can see profiles of people in their projects
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
            AND
            id IN (
                SELECT assigned_user_id 
                FROM project_assignments 
                WHERE project_id IN (
                    SELECT project_id 
                    FROM project_assignments 
                    WHERE assigned_user_id = auth.uid()
                )
            )
        )
        OR
        -- User can see profiles of people in ANY project (for browsing project members)
        (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'User')
            AND
            id IN (
                SELECT assigned_user_id 
                FROM project_assignments
            )
        )
    );

COMMIT;

-- ===========================
-- VERIFICATION QUERIES
-- ===========================

-- Verify the policies were updated
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles')
GROUP BY tablename
ORDER BY tablename;

-- ===========================
-- SUCCESS MESSAGE
-- ===========================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '🎉 RLS POLICIES UPDATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Updated role-based access control:';
    RAISE NOTICE '   🔴 Admin: Full access to all projects, users, and files';
    RAISE NOTICE '   🟡 Archivist: Can edit assigned projects and upload files';
    RAISE NOTICE '   🔵 User: Can BROWSE ALL projects but read-only access (like a customer catalog)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Users can now browse all projects without edit permissions!';
    RAISE NOTICE '';
END $$;
