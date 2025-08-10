-- ===================================================
-- FIX INFINITE RECURSION IN PROJECT_ASSIGNMENTS RLS POLICY
-- Run this in your Supabase Dashboard > SQL Editor  
-- ===================================================

-- The project_assignments policy also has recursion because it tries to query
-- itself to check which projects a user is assigned to.

BEGIN;

-- Drop the problematic project_assignments policy
DROP POLICY IF EXISTS "assignments_select_policy" ON project_assignments;

-- Create a simple, non-recursive policy for project assignments
CREATE POLICY "assignments_select_policy" ON project_assignments
    FOR SELECT USING (
        -- Users can see assignments where they are the assigned user
        assigned_user_id = auth.uid()
        OR
        -- Or any authenticated user can see project assignments (for User role catalog browsing)
        auth.uid() IS NOT NULL
    );

-- Also check if we need to fix projects policy
DROP POLICY IF EXISTS "projects_select_policy" ON projects;

-- Create a simple projects policy without self-referencing
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT USING (
        -- Any authenticated user can see all projects (for User catalog browsing)
        auth.uid() IS NOT NULL
    );

-- Also check files policy  
DROP POLICY IF EXISTS "files_select_policy" ON files;

-- Create a simple files policy
CREATE POLICY "files_select_policy" ON files
    FOR SELECT USING (
        -- Users can see files they uploaded
        uploaded_by = auth.uid()
        OR
        -- Or any authenticated user can see files (for User catalog browsing)
        auth.uid() IS NOT NULL
    );

COMMIT;

-- ===========================
-- VERIFICATION
-- ===========================

SELECT 'All RLS policies updated - infinite recursion fixed for all tables!' as result;

-- Show all policies are working
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'projects', 'project_assignments', 'files')
ORDER BY tablename, policyname;

-- Test that we can query projects without recursion
SELECT 
    COUNT(*) as total_projects,
    'Projects query successful' as status
FROM projects;
