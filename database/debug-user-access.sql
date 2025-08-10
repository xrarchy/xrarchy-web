-- ===================================================
-- DEBUG USER ACCESS ISSUES
-- Run this in your Supabase Dashboard > SQL Editor
-- ===================================================

-- Check if the user exists in profiles table
SELECT 
    id,
    email,
    role,
    created_at
FROM profiles 
WHERE id = '0df707b9-778f-4188-bde4-5f481269ea77';

-- Check RLS policies for profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Test the profiles SELECT policy directly
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '0df707b9-778f-4188-bde4-5f481269ea77';

SELECT 
    id,
    role,
    'Can access own profile' as test_result
FROM profiles 
WHERE id = '0df707b9-778f-4188-bde4-5f481269ea77';

-- Check if RLS is enabled on profiles table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Show all current RLS policies status
SELECT 
    tablename,
    COUNT(*) as policy_count,
    bool_and(rowsecurity) as rls_enabled
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename IN ('profiles', 'projects', 'project_assignments', 'files')
AND t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
