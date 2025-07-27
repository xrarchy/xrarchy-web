-- Debug: Check project assignments for the failing upload
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check if the user exists and their role
SELECT id, email, role FROM profiles WHERE id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce';

-- 2. Check if the project exists
SELECT id, name, created_by FROM projects WHERE id = '79d39890-99ce-4783-9dcc-61f9b4136c10';

-- 3. Check project assignments for this project
SELECT 
    pa.id,
    pa.project_id,
    pa.assigned_user_id,
    pa.assigned_at,
    p.email as assigned_user_email,
    p.role as assigned_user_role
FROM project_assignments pa
JOIN profiles p ON pa.assigned_user_id = p.id
WHERE pa.project_id = '79d39890-99ce-4783-9dcc-61f9b4136c10';

-- 4. Check if the specific user is assigned to this project
SELECT * FROM project_assignments 
WHERE assigned_user_id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce' 
AND project_id = '79d39890-99ce-4783-9dcc-61f9b4136c10';

-- 5. Check current RLS policies on files table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'files';

-- 6. Test the RLS policy logic manually
-- This should return true if the user can upload
SELECT 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce' AND profiles.role = 'Admin') as is_admin,
    ('79d39890-99ce-4783-9dcc-61f9b4136c10' IN (
        SELECT project_id FROM project_assignments WHERE assigned_user_id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce'
    )) as is_assigned_to_project;